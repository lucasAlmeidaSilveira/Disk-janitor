import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type ShellResult = { stdout: string; stderr: string }

export type ShellOptions = {
  timeoutMs?: number
  maxBufferBytes?: number
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_BUFFER = 8 * 1024 * 1024

export async function run(
  command: string,
  args: readonly string[],
  options: ShellOptions = {}
): Promise<ShellResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: options.maxBufferBytes ?? DEFAULT_MAX_BUFFER,
    encoding: 'utf8',
  })
  return { stdout, stderr }
}

export async function tryRun(
  command: string,
  args: readonly string[],
  options: ShellOptions = {}
): Promise<ShellResult | null> {
  try {
    return await run(command, args, options)
  } catch {
    return null
  }
}
