import type { DiskUsage } from '@shared/ipc-contract'
import { run } from './shell'

const DATA_VOLUME = '/System/Volumes/Data'
const KIB = 1024

export async function readDiskUsage(mount = DATA_VOLUME): Promise<DiskUsage> {
  const { stdout } = await run('df', ['-k', mount])
  const dataLine = stdout.trim().split('\n').at(-1)
  if (!dataLine) throw new Error('df returned no data line')

  const cols = dataLine.split(/\s+/)
  const blocks = Number(cols[1])
  const used = Number(cols[2])
  const available = Number(cols[3])

  if (!Number.isFinite(blocks) || !Number.isFinite(used) || !Number.isFinite(available)) {
    throw new Error(`unexpected df output: ${dataLine}`)
  }

  return {
    totalBytes: blocks * KIB,
    usedBytes: used * KIB,
    freeBytes: available * KIB,
    mountedOn: mount,
  }
}
