// Structural copies of the primitives' SettingsFieldSpec and SettingsFieldState, so this module
// stays free of client-only imports and can be tested in Node.
export type FieldWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }
export interface FieldSpec {
  field: string
  format: (value: unknown) => string
  parse: (text: string) => FieldWrite | undefined
}
export interface FieldState {
  text: string
  overridden: boolean
  invalid: boolean
}

/** Empty strings and empty lists count as "no package default". */
function hasDefault(spec: FieldSpec, base: unknown): boolean {
  if (base === undefined || base === null) return false
  const text = spec.format(base)
  return text !== '' && text !== '[]'
}

/**
 * The native model calls a field overridden whenever the user layer holds it. Show the tag only
 * when the package has a default and the shown value differs from it.
 */
export function overriddenAgainstDefault(
  state: FieldState,
  spec: FieldSpec,
  base: unknown,
): boolean {
  return state.overridden && hasDefault(spec, base) && state.text !== spec.format(base)
}
