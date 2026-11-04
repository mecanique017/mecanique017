import { gunzipSync, unzipSync } from 'fflate'

/**
 * Extraction côté navigateur des fichiers .fit contenus dans :
 * - un .fit (tel quel), un .fit.gz (export Strava « Télécharger mes données »)
 * - un .zip, y compris des .zip imbriqués (export complet Garmin Connect)
 * Les autres formats (.gpx, .tcx…) sont comptés comme ignorés.
 */
export interface ExtractResult {
  files: File[]
  skipped: number
}

const MAX_DEPTH = 2

export async function extractFitFiles(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.fit')) return { files: [file], skipped: 0 }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (name.endsWith('.fit.gz')) return { files: [gunzipFit(bytes, file.name)], skipped: 0 }
  if (name.endsWith('.zip')) return fromZip(bytes, 0)
  return { files: [], skipped: 1 }
}

function gunzipFit(bytes: Uint8Array, gzName: string): File {
  const baseName = gzName.split('/').pop()!.replace(/\.gz$/i, '')
  return new File([gunzipSync(bytes)], baseName)
}

function fromZip(bytes: Uint8Array, depth: number): ExtractResult {
  const result: ExtractResult = { files: [], skipped: 0 }
  // Ne décompresse que les entrées utiles (économise la mémoire sur les gros exports)
  const entries = unzipSync(bytes, {
    filter: (f) => /\.(fit|fit\.gz|zip)$/i.test(f.name) || (result.skipped++, false),
  })
  for (const [path, data] of Object.entries(entries)) {
    const lower = path.toLowerCase()
    if (lower.endsWith('.fit')) result.files.push(new File([data], path.split('/').pop()!))
    else if (lower.endsWith('.fit.gz')) result.files.push(gunzipFit(data, path))
    else if (lower.endsWith('.zip') && depth < MAX_DEPTH) {
      const nested = fromZip(data, depth + 1)
      result.files.push(...nested.files)
      result.skipped += nested.skipped
    }
  }
  return result
}
