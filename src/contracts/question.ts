export type JsonValue =
  null | boolean | number | string | JsonObject | readonly JsonValue[]
export interface JsonObject {
  readonly [key: string]: JsonValue
}
export type Description = string | JsonObject | readonly JsonValue[]
export type Primitive = 'noul' | 'choice' | 'score'
export interface NoulQuestion {
  readonly type: 'noul'
  readonly instructions: Description
  readonly criteria?:
    | {
        readonly true?: Description | undefined
        readonly false?: Description | undefined
      }
    | undefined
}
export interface ChoiceQuestion {
  readonly type: 'choice'
  readonly instructions: Description
  readonly criteria: Readonly<Record<string, Description | null>>
}
export interface ScoreQuestion {
  readonly type: 'score'
  readonly instructions: Description
  readonly criteria: readonly Description[]
}
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion
export type Questions = Readonly<Record<string, Question>>
