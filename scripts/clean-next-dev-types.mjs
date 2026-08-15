import { rm } from 'node:fs/promises'

const generatedDevTypes = new URL('../.next/dev/types', import.meta.url)

await rm(generatedDevTypes, { recursive: true, force: true })
