import type { DecisionError } from './error.js';
import type { OperationMeta, OperationResult } from './operation.js';
import type { ImageInput } from './request.js';
export interface TextLocateSource {
    readonly type: 'text';
    readonly text: string;
}
export interface ImageLocateSource {
    readonly type: 'image';
    readonly image: ImageInput;
}
export type LocateSource = TextLocateSource | ImageLocateSource;
export interface LocateInput<S extends LocateSource = LocateSource> {
    readonly source: S;
    readonly instructions: string;
}
interface MatchQuality {
    /** Backend-defined match strength, such as Nace's score. */
    readonly matchScore?: number | undefined;
    /** Estimated presence of this match, such as Liquid's found probability. */
    readonly presenceProbability?: number | undefined;
}
export interface TextLocateMatch extends MatchQuality {
    readonly text: string;
    /** Zero-based Unicode code point index, inclusive. */
    readonly start: number;
    /** Zero-based Unicode code point index, exclusive. */
    readonly end: number;
}
export interface ImageLocateMatch extends MatchQuality {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
    /** Backend confidence in the geometry of this match. */
    readonly locationConfidence?: number | undefined;
}
export type LocateMatch<S extends LocateSource = LocateSource> = S extends TextLocateSource ? TextLocateMatch : ImageLocateMatch;
export interface LocateOutput {
    readonly matches: readonly TextLocateMatch[] | readonly ImageLocateMatch[];
    /** When true, the provider indicated there may be additional matches. */
    readonly mayHaveMore?: boolean | undefined;
}
export type LocateResult<S extends LocateSource = LocateSource> = {
    readonly status: 'ok';
    readonly matches: readonly LocateMatch<S>[];
    readonly mayHaveMore?: boolean | undefined;
    readonly meta: OperationMeta;
} | Extract<OperationResult<LocateOutput>, {
    status: 'error';
}>;
export interface LocateCapabilities {
    /** Check provider limits without sending the source over the network. */
    readonly checkInput?: (input: LocateInput) => DecisionError | undefined;
}
/** Translate a half-open code point range for JavaScript slice or DOM APIs. */
export declare function toUtf16Range(text: string, start: number, end: number): readonly [start: number, end: number];
export declare function toLocateResult<S extends LocateSource>(result: OperationResult<LocateOutput>): LocateResult<S>;
export declare const locateOperation: import("./operation.js").OperationDefinition<LocateInput<LocateSource>, LocateOutput, LocateCapabilities>;
export {};
//# sourceMappingURL=locate.d.ts.map