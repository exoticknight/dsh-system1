export type FieldWrite = {
    kind: 'set';
    value: unknown;
} | {
    kind: 'clear';
};
export interface FieldSpec {
    field: string;
    format: (value: unknown) => string;
    parse: (text: string) => FieldWrite | undefined;
}
export interface FieldState {
    text: string;
    overridden: boolean;
    invalid: boolean;
}
/**
 * The native model calls a field overridden whenever the user layer holds it. Show the tag only
 * when the package has a default and the shown value differs from it.
 */
export declare function overriddenAgainstDefault(state: FieldState, spec: FieldSpec, base: unknown): boolean;
/** Picking the package default again clears the user value instead of storing a copy of it. */
export declare function defaultAware<S extends FieldSpec>(spec: S, readBase: () => unknown): S;
