/**
 * Content Validator - Firewall for ensuring correct English content
 * Validates generated questions before rendering
 */

import { joinTokensWithSpacing, compareTokenArrays } from './shuffleUtils';

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface ArrangeWordsQuestion {
    id: string;
    type: 'arrange_words';
    level?: 'A1' | 'A2' | 'B1';
    display_tokens: string[];
    correct_tokens: string[];
    word_bank_tokens: string[];
    correct_answer_string: string;
    explanation_vi?: string;
    translation?: string;
}

export interface FillBlanksQuestion {
    id: string;
    type: 'fill_blanks';
    level?: 'A1' | 'A2' | 'B1';
    sentence_template: string; // e.g., "She ___ to school."
    blanks: number[]; // Indices of blanks
    display_tokens: string[];
    correct_tokens: string[];
    word_bank_tokens: string[];
    correct_answer_string: string;
    explanation_vi?: string;
    clueEmoji?: string;
}

export type ValidatedQuestion = ArrangeWordsQuestion | FillBlanksQuestion;

// Validate that all correct tokens exist in word bank with proper counts
const validateTokenIntegrity = (
    correctTokens: string[],
    wordBankTokens: string[]
): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Count occurrences in word bank
    const bankCounts = new Map<string, number>();
    wordBankTokens.forEach(t => {
        const key = t.toLowerCase();
        bankCounts.set(key, (bankCounts.get(key) || 0) + 1);
    });

    // Count required occurrences
    const requiredCounts = new Map<string, number>();
    correctTokens.forEach(t => {
        const key = t.toLowerCase();
        requiredCounts.set(key, (requiredCounts.get(key) || 0) + 1);
    });

    // Check each required token exists with sufficient count
    requiredCounts.forEach((count, token) => {
        const available = bankCounts.get(token) || 0;
        if (available < count) {
            errors.push({
                field: 'word_bank_tokens',
                message: `Token "${token}" required ${count}x but only ${available}x in word bank`,
                severity: 'error'
            });
        }
    });

    return errors;
};

// Validate that joined tokens produce the correct answer string
const validateJoinedAnswer = (
    correctTokens: string[],
    correctAnswerString: string
): ValidationError[] => {
    const errors: ValidationError[] = [];
    const joined = joinTokensWithSpacing(correctTokens);

    if (joined.toLowerCase() !== correctAnswerString.toLowerCase()) {
        errors.push({
            field: 'correct_answer_string',
            message: `Joined tokens "${joined}" doesn't match expected "${correctAnswerString}"`,
            severity: 'error'
        });
    }

    return errors;
};

// Basic grammar checks (simple heuristics)
const validateGrammarBasics = (sentence: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check for double spaces
    if (/\s{2,}/.test(sentence)) {
        errors.push({
            field: 'correct_answer_string',
            message: 'Double spaces detected',
            severity: 'warning'
        });
    }

    // Check for space before punctuation
    if (/\s[.,!?;:]/.test(sentence)) {
        errors.push({
            field: 'correct_answer_string',
            message: 'Space before punctuation detected',
            severity: 'error'
        });
    }

    // Check sentence starts with capital
    if (sentence.length > 0 && sentence[0] !== sentence[0].toUpperCase()) {
        errors.push({
            field: 'correct_answer_string',
            message: 'Sentence should start with capital letter',
            severity: 'warning'
        });
    }

    // Check sentence ends with punctuation
    if (sentence.length > 0 && !/[.!?]$/.test(sentence)) {
        errors.push({
            field: 'correct_answer_string',
            message: 'Sentence should end with punctuation',
            severity: 'warning'
        });
    }

    return errors;
};

// Validate arrange_words question
export const validateArrangeWordsQuestion = (q: ArrangeWordsQuestion): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required fields
    if (!q.id) errors.push({ field: 'id', message: 'Missing id', severity: 'error' });
    if (!q.correct_tokens?.length) errors.push({ field: 'correct_tokens', message: 'Missing correct_tokens', severity: 'error' });
    if (!q.word_bank_tokens?.length) errors.push({ field: 'word_bank_tokens', message: 'Missing word_bank_tokens', severity: 'error' });
    if (!q.correct_answer_string) errors.push({ field: 'correct_answer_string', message: 'Missing correct_answer_string', severity: 'error' });

    if (errors.some(e => e.severity === 'error')) return errors;

    // Token integrity
    errors.push(...validateTokenIntegrity(q.correct_tokens, q.word_bank_tokens));

    // Joined answer matches
    errors.push(...validateJoinedAnswer(q.correct_tokens, q.correct_answer_string));

    // Grammar basics
    errors.push(...validateGrammarBasics(q.correct_answer_string));

    // Token count match
    if (q.correct_tokens.length !== q.word_bank_tokens.length) {
        errors.push({
            field: 'word_bank_tokens',
            message: `Token count mismatch: correct=${q.correct_tokens.length}, bank=${q.word_bank_tokens.length}`,
            severity: 'error'
        });
    }

    return errors;
};

// Validate fill_blanks question
export const validateFillBlanksQuestion = (q: FillBlanksQuestion): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required fields
    if (!q.id) errors.push({ field: 'id', message: 'Missing id', severity: 'error' });
    if (!q.sentence_template) errors.push({ field: 'sentence_template', message: 'Missing sentence_template', severity: 'error' });
    if (!q.correct_tokens?.length) errors.push({ field: 'correct_tokens', message: 'Missing correct_tokens', severity: 'error' });
    if (!q.word_bank_tokens?.length) errors.push({ field: 'word_bank_tokens', message: 'Missing word_bank_tokens', severity: 'error' });

    if (errors.some(e => e.severity === 'error')) return errors;

    // Check blanks count matches answer tokens
    const blankCount = (q.sentence_template.match(/___/g) || []).length;
    if (blankCount !== q.correct_tokens.length) {
        errors.push({
            field: 'blanks',
            message: `Blank count (${blankCount}) doesn't match answer token count (${q.correct_tokens.length})`,
            severity: 'error'
        });
    }

    // Token integrity
    errors.push(...validateTokenIntegrity(q.correct_tokens, q.word_bank_tokens));

    // Grammar basics on full answer
    if (q.correct_answer_string) {
        errors.push(...validateGrammarBasics(q.correct_answer_string));
    }

    return errors;
};

// Validate any question type
export const validateQuestion = (q: ValidatedQuestion): ValidationError[] => {
    if (q.type === 'arrange_words') {
        return validateArrangeWordsQuestion(q as ArrangeWordsQuestion);
    } else if (q.type === 'fill_blanks') {
        return validateFillBlanksQuestion(q as FillBlanksQuestion);
    }
    return [{ field: 'type', message: 'Unknown question type', severity: 'error' }];
};

// Check if question is valid (no errors, warnings ok)
export const isQuestionValid = (q: ValidatedQuestion): boolean => {
    const errors = validateQuestion(q);
    return !errors.some(e => e.severity === 'error');
};

// Convert legacy scramble question to new format
export const convertLegacyScramble = (legacy: {
    id: string;
    scrambled: string[];
    correctSentence: string;
    translation?: string;
}): ArrangeWordsQuestion => {
    // Parse correct sentence into tokens
    const correctTokens = parseIntoTokens(legacy.correctSentence);

    return {
        id: legacy.id,
        type: 'arrange_words',
        display_tokens: correctTokens,
        correct_tokens: correctTokens,
        word_bank_tokens: legacy.scrambled,
        correct_answer_string: legacy.correctSentence,
        translation: legacy.translation
    };
};

// Parse sentence into tokens (split by whitespace, keeping punctuation attached to words)
// This ensures "He promised to call me back." → ["He", "promised", "to", "call", "me", "back."]
// NOT → ["He", "promised", "to", "call", "me", "back", "."]
export const parseIntoTokens = (sentence: string): string[] => {
    return sentence.trim().split(/\s+/).filter(t => t.length > 0);
};

// Convert legacy fill-blank question to new format
export const convertLegacyFillBlank = (legacy: {
    id: string;
    question: string;
    correctAnswer: string;
    clueEmoji?: string;
    explanation?: string;
}): FillBlanksQuestion => {
    // Parse correct answers (may be comma-separated)
    const answers = legacy.correctAnswer.split(',').map(s => s.trim());

    // Generate word bank with correct answers + distractors
    const wordBank = [...answers];

    return {
        id: legacy.id,
        type: 'fill_blanks',
        sentence_template: legacy.question,
        blanks: [],
        display_tokens: [],
        correct_tokens: answers,
        word_bank_tokens: wordBank,
        correct_answer_string: legacy.question.replace(/___/g, () => answers.shift() || '___'),
        explanation_vi: legacy.explanation,
        clueEmoji: legacy.clueEmoji
    };
};
