export function noulAnswer(probabilityTrue) {
    return { status: 'ok', answer: { type: 'noul', probabilityTrue } };
}
export function choiceAnswer(value, probabilities, confidence) {
    return {
        status: 'ok',
        answer: {
            type: 'choice',
            value,
            probabilities,
            ...(confidence !== undefined ? { confidence } : {}),
        },
    };
}
export function scoreAnswer(value, levels, probabilities, confidence) {
    return {
        status: 'ok',
        answer: {
            type: 'score',
            value,
            levels,
            probabilities,
            ...(confidence !== undefined ? { confidence } : {}),
        },
    };
}
export function invalidAnswer() {
    return {
        status: 'error',
        error: {
            code: 'invalid_response',
            message: 'Provider returned an invalid answer.',
        },
    };
}
//# sourceMappingURL=answers.js.map