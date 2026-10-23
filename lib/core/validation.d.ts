import { z } from 'zod';
import type { Question } from '../contracts/question.js';
import type { QuestionResult } from '../contracts/answer.js';
export declare const modelSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strict>;
export declare const timeoutSchema: z.ZodNumber;
export declare function parseRequest(input: unknown): {
    state: z.JSONType;
    questions: Record<string, {
        type: "noul";
        instructions: string | z.JSONType[] | Record<string, z.JSONType>;
        criteria?: {
            true?: string | z.JSONType[] | Record<string, z.JSONType> | undefined;
            false?: string | z.JSONType[] | Record<string, z.JSONType> | undefined;
        } | undefined;
    } | {
        type: "choice";
        instructions: string | z.JSONType[] | Record<string, z.JSONType>;
        criteria: Record<string, string | z.JSONType[] | Record<string, z.JSONType> | null>;
    } | {
        type: "score";
        instructions: string | z.JSONType[] | Record<string, z.JSONType>;
        criteria: (string | z.JSONType[] | Record<string, z.JSONType>)[];
    } | {
        type: "box";
        instructions: string | z.JSONType[] | Record<string, z.JSONType>;
    }>;
    images?: {
        mediaType: "image/jpeg" | "image/png" | "image/webp";
        data: string;
    }[] | undefined;
    audio?: {
        mediaType: "audio/mpeg" | "audio/wav";
        data: string;
    }[] | undefined;
    videos?: {
        mediaType: "video/mp4" | "video/webm";
        data: string;
    }[] | undefined;
    longContext?: boolean | undefined;
    model?: {
        provider: string;
        model: string;
    } | undefined;
    timeoutMs?: number | undefined;
    signal?: AbortSignal | undefined;
};
export declare const errorSchema: z.ZodObject<{
    code: z.ZodEnum<{
        cancelled: "cancelled";
        invalid_response: "invalid_response";
        limit_exceeded: "limit_exceeded";
        provider_error: "provider_error";
        timeout: "timeout";
        unavailable: "unavailable";
        unsupported: "unsupported";
    }>;
    message: z.ZodString;
    retryable: z.ZodOptional<z.ZodBoolean>;
    httpStatus: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const responseSchema: z.ZodObject<{
    model: z.ZodString;
    revision: z.ZodOptional<z.ZodString>;
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    usage: z.ZodOptional<z.ZodObject<{
        inputTokens: z.ZodOptional<z.ZodNumber>;
        outputTokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    approximate: z.ZodOptional<z.ZodBoolean>;
    degraded: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const capabilitiesSchema: z.ZodObject<{
    primitives: z.ZodArray<z.ZodEnum<{
        box: "box";
        choice: "choice";
        noul: "noul";
        score: "score";
    }>>;
    maxQuestions: z.ZodOptional<z.ZodNumber>;
    maxChoiceOptions: z.ZodOptional<z.ZodNumber>;
    maxScoreLevels: z.ZodOptional<z.ZodNumber>;
    images: z.ZodOptional<z.ZodObject<{
        formats: z.ZodArray<z.ZodEnum<{
            "image/jpeg": "image/jpeg";
            "image/png": "image/png";
            "image/webp": "image/webp";
        }>>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        maxBytesPerImage: z.ZodOptional<z.ZodNumber>;
        maxTotalBytes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    audio: z.ZodOptional<z.ZodObject<{
        formats: z.ZodArray<z.ZodEnum<{
            "audio/mpeg": "audio/mpeg";
            "audio/wav": "audio/wav";
        }>>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        maxBytesPerItem: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    videos: z.ZodOptional<z.ZodObject<{
        formats: z.ZodArray<z.ZodEnum<{
            "video/mp4": "video/mp4";
            "video/webm": "video/webm";
        }>>;
        maxCount: z.ZodOptional<z.ZodNumber>;
        maxBytesPerItem: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    audioVideo: z.ZodOptional<z.ZodObject<{
        maxTotalBytes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    longContext: z.ZodOptional<z.ZodObject<{
        maxTokens: z.ZodNumber;
    }, z.core.$strict>>;
    context: z.ZodOptional<z.ZodObject<{
        maxTokens: z.ZodNumber;
        includesQuestions: z.ZodBoolean;
        maxStatePlusQuestionTokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare function validateAnswer(q: Question, value: unknown): QuestionResult;
//# sourceMappingURL=validation.d.ts.map