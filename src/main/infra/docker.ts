import { homedir } from 'node:os'
import { join } from 'node:path'
import { measurePath, type PathSize } from './du'
import { tryRun } from './shell'

export type DockerState = {
  raw: PathSize
  daemonRunning: boolean
  reclaimableBytes: number | null
}

export function dockerRawPath(): string {
  return join(
    homedir(),
    'Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw'
  )
}

export async function readDockerState(): Promise<DockerState> {
  const raw = await measurePath(dockerRawPath())
  const dfOutput = await tryRun('docker', ['system', 'df', '--format', '{{json .}}'], {
    timeoutMs: 5_000,
  })

  if (!dfOutput) {
    return { raw, daemonRunning: false, reclaimableBytes: null }
  }

  const reclaimable = parseReclaimable(dfOutput.stdout)
  return { raw, daemonRunning: true, reclaimableBytes: reclaimable }
}

function parseReclaimable(stdout: string): number {
  let total = 0
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue
    try {
      const row = JSON.parse(line) as { Reclaimable?: string }
      total += parseHumanSize(row.Reclaimable ?? '0B')
    } catch {
      // ignore malformed row
    }
  }
  return total
}

const UNIT_MULTIPLIER: Record<string, number> = {
  B: 1,
  KB: 1_000,
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000,
  KIB: 1024,
  MIB: 1024 ** 2,
  GIB: 1024 ** 3,
  TIB: 1024 ** 4,
}

function parseHumanSize(input: string): number {
  const match = input.trim().match(/^([\d.]+)\s*([KMGT]?i?B)/i)
  if (!match) return 0
  const [, numRaw, unitRaw] = match
  const num = Number(numRaw)
  const multiplier = UNIT_MULTIPLIER[unitRaw!.toUpperCase()] ?? 1
  return Number.isFinite(num) ? Math.round(num * multiplier) : 0
}

const RECLAIMED_LINE = /Total reclaimed space:\s*([\d.]+\s*[KMGT]?i?B)/i

export function parseDockerReclaimed(stdout: string): number {
  const match = stdout.match(RECLAIMED_LINE)
  return match ? parseHumanSize(match[1]!) : 0
}

export async function pruneDocker(): Promise<number> {
  const result = await tryRun(
    'docker',
    ['system', 'prune', '-a', '--volumes', '-f'],
    { timeoutMs: 120_000 }
  )
  if (!result) return 0
  return parseDockerReclaimed(result.stdout)
}
