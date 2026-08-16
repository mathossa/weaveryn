import { isIP } from 'node:net'

export interface AdminNetworkConfig {
  allowedCidrs: string[]
  trustProxyHeaders: boolean
  clientIpHeader: string
}

function parseList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function loadAdminNetworkConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdminNetworkConfig {
  return {
    allowedCidrs: parseList(env.ADMIN_ALLOWED_CIDRS),
    trustProxyHeaders: env.ADMIN_TRUST_PROXY_HEADERS === 'true',
    clientIpHeader: (env.ADMIN_CLIENT_IP_HEADER ?? 'x-forwarded-for')
      .trim()
      .toLowerCase(),
  }
}

function normalizeIp(value: string) {
  const trimmed = value.trim().replace(/^\[|\]$/g, '')
  const withoutZone = trimmed.split('%', 1)[0]
  return withoutZone.startsWith('::ffff:') && isIP(withoutZone.slice(7)) === 4
    ? withoutZone.slice(7)
    : withoutZone
}

function ipv4ToBigInt(ip: string) {
  return ip
    .split('.')
    .map(Number)
    .reduce((value, octet) => (value << 8n) | BigInt(octet), 0n)
}

function ipv6ToBigInt(ip: string) {
  let working = ip.toLowerCase()

  const lastColon = working.lastIndexOf(':')
  const possibleIpv4 = lastColon >= 0 ? working.slice(lastColon + 1) : working
  if (isIP(possibleIpv4) === 4) {
    const ipv4 = ipv4ToBigInt(possibleIpv4)
    const high = ((ipv4 >> 16n) & 0xffffn).toString(16)
    const low = (ipv4 & 0xffffn).toString(16)
    working = `${working.slice(0, lastColon)}:${high}:${low}`
  }

  const [leftRaw, rightRaw] = working.split('::')
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : []
  const right = rightRaw ? rightRaw.split(':').filter(Boolean) : []

  if (!working.includes('::') && left.length !== 8) return null
  const missing = 8 - left.length - right.length
  if (missing < 0) return null

  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right,
  ]
  if (groups.length !== 8) return null

  return groups.reduce((value, group) => {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return -1n
    return (value << 16n) | BigInt(`0x${group}`)
  }, 0n)
}

function ipToBigInt(ip: string) {
  const normalized = normalizeIp(ip)
  const family = isIP(normalized)
  if (family === 4) {
    return { family, bits: 32, value: ipv4ToBigInt(normalized) }
  }
  if (family === 6) {
    const value = ipv6ToBigInt(normalized)
    if (value === null || value < 0n) return null
    return { family, bits: 128, value }
  }
  return null
}

export function ipMatchesCidr(ip: string, cidr: string) {
  const [networkRaw, prefixRaw] = cidr.trim().split('/')
  const network = ipToBigInt(networkRaw)
  const candidate = ipToBigInt(ip)
  if (
    !network ||
    !candidate ||
    network.family !== candidate.family
  ) {
    return false
  }

  const prefix = prefixRaw === undefined ? network.bits : Number(prefixRaw)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > network.bits) {
    return false
  }

  if (prefix === 0) return true

  const shift = BigInt(network.bits - prefix)
  return network.value >> shift === candidate.value >> shift
}

export function resolveAdminClientIp(
  headers: Headers,
  config: AdminNetworkConfig = loadAdminNetworkConfig(),
) {
  if (!config.trustProxyHeaders) return null

  const raw = headers.get(config.clientIpHeader)
  if (!raw) return null

  const firstValue = raw.split(',')[0]?.trim()
  if (!firstValue) return null

  const normalized = normalizeIp(firstValue)
  return isIP(normalized) ? normalized : null
}

export function isAdminNetworkAllowed(
  headers: Headers,
  config: AdminNetworkConfig = loadAdminNetworkConfig(),
) {
  if (config.allowedCidrs.length === 0) return false

  const clientIp = resolveAdminClientIp(headers, config)
  if (!clientIp) return false

  return config.allowedCidrs.some((cidr) =>
    ipMatchesCidr(clientIp, cidr),
  )
}
