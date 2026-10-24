import { readFile } from 'node:fs/promises'
import { fleetSchema } from './fleetSchema.js'

async function readJson(file: URL): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error('Failed to read or parse ' + file.pathname, { cause: error })
  }
}

export async function loadFleetData(directory = new URL('../../data/', import.meta.url)) {
  const [sites, robots] = await Promise.all([
    readJson(new URL('sites.json', directory)),
    readJson(new URL('robots.json', directory)),
  ])

  return fleetSchema.parse({ sites, robots })
}
