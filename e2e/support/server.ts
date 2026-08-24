import {
  spawn,
  type ChildProcess,
  type ChildProcessByStdio,
} from 'node:child_process'
import { createServer } from 'node:net'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'

const HOST = '127.0.0.1'
type E2EServerProcess = ChildProcessByStdio<null, Readable, Readable>

async function availablePort() {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, HOST, () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  if (!port) throw new Error('Could not reserve an E2E application port.')
  return port
}

function waitForExit(child: ChildProcess, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    if (child.exitCode !== null) {
      resolve(true)
      return
    }
    const timer = setTimeout(() => resolve(false), timeoutMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve(true)
    })
  })
}

export class E2EProductionServer {
  private child: E2EServerProcess | null = null
  private output = ''
  private port = 0

  get baseURL() {
    if (!this.port)
      throw new Error('The E2E application server is not running.')
    return `http://${HOST}:${this.port}`
  }

  async start() {
    await access(path.join(process.cwd(), '.next', 'BUILD_ID'))
    if (!this.port) this.port = await availablePort()

    const nextBin = path.join(
      process.cwd(),
      'node_modules',
      'next',
      'dist',
      'bin',
      'next',
    )
    const baseURL = this.baseURL
    const child = spawn(
      process.execPath,
      [nextBin, 'start', '--hostname', HOST, '--port', String(this.port)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DATABASE_URL: process.env.E2E_DATABASE_URL,
          DEV_DATABASE_NAME: process.env.E2E_DATABASE_NAME,
          BETTER_AUTH_URL: baseURL,
          BETTER_AUTH_TRUSTED_ORIGINS: baseURL,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    this.child = child
    child.stdout.on('data', (chunk) => {
      this.output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      this.output += String(chunk)
    })

    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(
          `Next.js exited before becoming ready.\n${this.output.slice(-8_000)}`,
        )
      }
      try {
        const response = await fetch(`${baseURL}/login`, {
          signal: AbortSignal.timeout(1_000),
        })
        if (response.ok) return
      } catch {
        // The readiness loop waits for an observable HTTP response.
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error(
      `Next.js did not become ready within 30 seconds.\n${this.output.slice(-8_000)}`,
    )
  }

  async stop() {
    const child = this.child
    this.child = null
    if (!child || child.exitCode !== null) return

    child.kill('SIGTERM')
    if (!(await waitForExit(child, 10_000))) {
      child.kill('SIGKILL')
      await waitForExit(child, 5_000)
    }
  }

  async restart() {
    await this.stop()
    await this.start()
  }

  async writeLog(outputDirectory: string) {
    await mkdir(outputDirectory, { recursive: true })
    const logPath = path.join(outputDirectory, 'application-server.log')
    await writeFile(logPath, this.output, 'utf8')
    return logPath
  }
}
