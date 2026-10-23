import type { QuestionResult } from '../contracts/answer.js'
import type { Description } from '../contracts/question.js'

export function noulAnswer(probabilityTrue: number): QuestionResult {
  return { status: 'ok', answer: { type: 'noul', probabilityTrue } }
}

export function choiceAnswer(
  value: string,
  probabilities: Readonly<Record<string, number>>,
  confidence?: number,
): QuestionResult {
  return {
    status: 'ok',
    answer: {
      type: 'choice',
      value,
      probabilities,
      ...(confidence !== undefined ? { confidence } : {}),
    },
  }
}

export function scoreAnswer(
  value: number,
  levels: readonly Description[],
  probabilities: readonly number[],
  confidence?: number,
): QuestionResult {
  return {
    status: 'ok',
    answer: {
      type: 'score',
      value,
      levels,
      probabilities,
      ...(confidence !== undefined ? { confidence } : {}),
    },
  }
}

export function invalidAnswer(): QuestionResult {
  return {
    status: 'error',
    error: {
      code: 'invalid_response',
      message: 'Provider returned an invalid answer.',
    },
  }
}
