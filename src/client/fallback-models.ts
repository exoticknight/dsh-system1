export interface FallbackModelDraft {
  provider: string
  model: string
}

export function readFallbackModels(value: unknown): FallbackModelDraft[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row =
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {}
    return {
      provider: typeof row.provider === 'string' ? row.provider : '',
      model: typeof row.model === 'string' ? row.model : '',
    }
  })
}

export function fallbackModelsValid(rows: readonly FallbackModelDraft[]): boolean {
  return rows.every((row) =>
    row.provider.trim() !== '' && row.model.trim() !== '',
  )
}

export function fallbackModelsEqual(
  left: readonly FallbackModelDraft[],
  right: readonly FallbackModelDraft[],
): boolean {
  return left.length === right.length && left.every((row, index) =>
    row.provider === right[index]?.provider && row.model === right[index]?.model,
  )
}

export function addFallbackModel(
  rows: readonly FallbackModelDraft[],
  model: FallbackModelDraft,
): FallbackModelDraft[] {
  return [...rows.map(copyFallbackModel), copyFallbackModel(model)]
}

export function updateFallbackModel(
  rows: readonly FallbackModelDraft[],
  index: number,
  update: Partial<FallbackModelDraft>,
): FallbackModelDraft[] {
  if (index < 0 || index >= rows.length) return [...rows.map(copyFallbackModel)]
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...update } : copyFallbackModel(row),
  )
}

export function moveFallbackModel(
  rows: readonly FallbackModelDraft[],
  index: number,
  offset: -1 | 1,
): FallbackModelDraft[] {
  const destination = index + offset
  if (index < 0 || destination < 0 || destination >= rows.length)
    return [...rows.map(copyFallbackModel)]
  const result = rows.map(copyFallbackModel)
  const current = result[index]!
  result[index] = result[destination]!
  result[destination] = current
  return result
}

export function removeFallbackModel(
  rows: readonly FallbackModelDraft[],
  index: number,
): FallbackModelDraft[] {
  if (index < 0 || index >= rows.length) return [...rows.map(copyFallbackModel)]
  return rows.filter((_row, rowIndex) => rowIndex !== index).map(copyFallbackModel)
}

function copyFallbackModel(row: FallbackModelDraft): FallbackModelDraft {
  return { provider: row.provider, model: row.model }
}
