import { describe, expect, it } from 'vitest'
import {
  ipMatchesCidr,
  isAdminNetworkAllowed,
  resolveAdminClientIp,
  type AdminNetworkConfig,
} from './admin-network-policy'

const trustedConfig: AdminNetworkConfig = {
  allowedCidrs: ['192.168.10.0/24', '2001:db8::/32'],
  trustProxyHeaders: true,
  clientIpHeader: 'x-forwarded-for',
}

describe('admin network policy', () => {
  it('matches IPv4 CIDRs', () => {
    expect(ipMatchesCidr('192.168.10.42', '192.168.10.0/24')).toBe(true)
    expect(ipMatchesCidr('192.168.11.42', '192.168.10.0/24')).toBe(false)
  })

  it('matches IPv6 CIDRs', () => {
    expect(ipMatchesCidr('2001:db8::42', '2001:db8::/32')).toBe(true)
    expect(ipMatchesCidr('2001:dead::42', '2001:db8::/32')).toBe(false)
  })

  it('uses the first forwarded address when proxy headers are trusted', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.10.42, 10.0.0.4',
    })

    expect(resolveAdminClientIp(headers, trustedConfig)).toBe('192.168.10.42')
    expect(isAdminNetworkAllowed(headers, trustedConfig)).toBe(true)
  })

  it('fails closed when proxy headers are not explicitly trusted', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.10.42' })

    expect(
      isAdminNetworkAllowed(headers, {
        ...trustedConfig,
        trustProxyHeaders: false,
      }),
    ).toBe(false)
  })

  it('fails closed without an allowlist', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.10.42' })

    expect(
      isAdminNetworkAllowed(headers, {
        ...trustedConfig,
        allowedCidrs: [],
      }),
    ).toBe(false)
  })

  it('supports an explicitly configured client-ip header', () => {
    const headers = new Headers({ 'x-weaveryn-client-ip': '2001:db8::8' })

    expect(
      isAdminNetworkAllowed(headers, {
        ...trustedConfig,
        clientIpHeader: 'x-weaveryn-client-ip',
      }),
    ).toBe(true)
  })
})
