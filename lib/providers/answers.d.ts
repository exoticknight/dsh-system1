import type { QuestionResult } from '../contracts/answer.js';
import type { Description } from '../contracts/question.js';
export declare function noulAnswer(probabilityTrue: number): QuestionResult;
export declare function choiceAnswer(value: string, probabilities: Readonly<Record<string, number>>, confidence?: number): QuestionResult;
export declare function scoreAnswer(value: number, levels: readonly Description[], probabilities: readonly number[], confidence?: number): QuestionResult;
export declare function invalidAnswer(): QuestionResult;
//# sourceMappingURL=answers.d.ts.map