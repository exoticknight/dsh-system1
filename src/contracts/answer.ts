import type { ChoiceQuestion, Description, Question } from './question.js'
import type { DecisionError } from './error.js'
export interface NoulAnswer {
  readonly type: 'noul'
  readonly probabilityTrue: number
}
export interface ChoiceAnswer<K extends string = string> {
  readonly type: 'choice'
  readonly value: K
  readonly probabilities: Readonly<Record<K, number>>
  /** Backend-reported statistic; semantics belong to the executed provider/model. */
  readonly confidence?: number | undefined
}
export interface ScoreAnswer {
  readonly type: 'score'
  /** Zero-based expected level; may lie between integer levels. */
  readonly value: number
  readonly levels: readonly Description[]
  readonly probabilities: readonly number[]
  /** Backend-reported statistic; semantics belong to the executed provider/model. */
  readonly confidence?: number | undefined
}
export interface BoxAnswer {
  readonly type: 'box'
  readonly box: {
    readonly top: number
    readonly bottom: number
    readonly left: number
    readonly right: number
  }
  readonly confidence?: number | undefined
}
export type AnswerFor<Q extends Question> = Q extends { type: 'noul' }
  ? NoulAnswer
  : Q extends ChoiceQuestion
    ? ChoiceAnswer<Extract<keyof Q['criteria'], string>>
    : Q extends { type: 'score' }
      ? ScoreAnswer
      : BoxAnswer
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer | BoxAnswer
export type QuestionResult<Q extends Question = Question> =
  | { readonly status: 'ok'; readonly answer: AnswerFor<Q> }
  | { readonly status: 'error'; readonly error: DecisionError }
