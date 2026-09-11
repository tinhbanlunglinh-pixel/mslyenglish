
import React, { useState, useEffect, useCallback } from 'react';
import { PracticeContent, ListeningQ } from '../types';
import { WordBankFill } from './WordBankFill';
import { playGeminiTTS, stopTTS } from '../services/geminiService';
import {
  shuffleWithRecheck,
  generateSeed,
  joinTokensWithSpacing,
  compareTokenArrays,
  parseIntoTokens
} from '../utils/shuffleUtils';
import { smartCheckMC, getAllSmartCorrectIndices, checkFillAnswer } from '../utils/smartGrading';

// Helper to extract blank and target word from ListeningQ
export const getListeningQuestionDetails = (q: ListeningQ): {
  sentenceWithBlank: string;
  missingWord: string;
  alternativeAnswers: string[];
} => {
  if (q.sentenceWithBlank && q.missingWord) {
    return {
      sentenceWithBlank: q.sentenceWithBlank,
      missingWord: q.missingWord,
      alternativeAnswers: q.alternativeAnswers || []
    };
  }

  // Automatic derivation for legacy data
  const fullText = (q.audioText || '').trim();
  const matchPunct = fullText.match(/[.!?]$/);
  const punct = matchPunct ? matchPunct[0] : '';
  const clean = fullText.replace(/[.!?]$/, '');
  const words = clean.split(/\s+/);

  if (words.length <= 1) {
    return {
      sentenceWithBlank: '______' + punct,
      missingWord: clean,
      alternativeAnswers: []
    };
  }

  // Mask the last word or 2 words
  const maskCount = words.length > 5 ? 2 : 1;
  const blankWord = words.slice(-maskCount).join(' ');
  const sentenceWithBlank = words.slice(0, -maskCount).join(' ') + ' ______' + punct;

  return {
    sentenceWithBlank,
    missingWord: blankWord,
    alternativeAnswers: []
  };
};

export const checkListeningBlank = (userInput: string, q: ListeningQ): boolean => {
  const details = getListeningQuestionDetails(q);
  const cleanUser = (userInput || '').trim().toLowerCase().replace(/[.,!?'"-]/g, '');
  if (!cleanUser) return false;

  const targetWord = details.missingWord.trim().toLowerCase().replace(/[.,!?'"-]/g, '');
  if (cleanUser === targetWord) return true;

  if (details.alternativeAnswers && Array.isArray(details.alternativeAnswers)) {
    if (
      details.alternativeAnswers.some(
        alt => alt.trim().toLowerCase().replace(/[.,!?'"-]/g, '') === cleanUser
      )
    ) {
      return true;
    }
  }

  // Also check if user typed full sentence correctly
  const fullClean = (q.audioText || '').trim().toLowerCase().replace(/[.,!?'"-]/g, '');
  if (cleanUser === fullClean) return true;

  return false;
};

interface MegaChallengeProps {
  megaData: PracticeContent['megaTest'];
  listeningData?: PracticeContent['listening'];
  onScoresUpdate?: (scores: { mc: number; scramble: number; fill: number; vocab: number; tf: number; listen: number }) => void;
}

// Collapsible Explanation Component
const CollapsibleExplanation: React.FC<{
  isCorrect: boolean;
  explanation: string;
  correctAnswer?: string;
  userAnswer?: string;
}> = ({ isCorrect, explanation, correctAnswer, userAnswer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`mt-3 rounded-2xl border-l-4 overflow-hidden transition-all ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-amber-50 border-amber-500'
      }`}>
      {/* Header - Always visible */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isCorrect ? '🌟' : '💡'}</span>
          <span className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
            {isCorrect ? 'Tuyệt vời! Con giỏi lắm!' : 'Chưa đúng rồi!'}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 text-xs font-bold bg-white/50 rounded-lg hover:bg-white/80 transition-all"
        >
          {isOpen ? '▲ Thu gọn' : '▼ Xem giải thích'}
        </button>
      </div>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-4 pb-4 space-y-2">
          {!isCorrect && correctAnswer && (
            <div className="bg-white/50 p-2 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Đáp án đúng:</p>
              <p className="font-bold text-green-700 text-sm">{correctAnswer}</p>
            </div>
          )}
          {explanation && (
            <p className="text-xs italic text-slate-600 leading-relaxed">{explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Session seed for consistent shuffling within session
const SESSION_SEED = Date.now().toString();

export const MegaChallenge: React.FC<MegaChallengeProps> = ({ megaData, listeningData, onScoresUpdate }) => {
  const [activeZone, setActiveZone] = useState<'mc' | 'fill' | 'scramble' | 'vocab' | 'tf' | 'listen'>('mc');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const normalizeStrict = (s: string) => {
    return String(s || "")
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleAnswer = (qId: string, val: any) => {
    if (submitted[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const checkFinal = (qId: string, isCorrect: boolean) => {
    setSubmitted(prev => ({ ...prev, [qId]: true }));
  };

  const calculateZoneScore = (zone: string) => {
    let correct = 0;
    if (!megaData) return 0;
    if (zone === 'mc') {
      (megaData.multipleChoice || []).forEach(q => { if (submitted[q.id] && smartCheckMC(answers[q.id], q.correctAnswer, q.options, q.alternativeCorrectAnswers)) correct++; });
    } else if (zone === 'fill') {
      (megaData.fillBlank || []).forEach(q => {
        if (submitted[q.id]) {
          const result = answers[q.id];
          if (result?.isCorrect) correct++;
        }
      });
    } else if (zone === 'scramble') {
      (megaData.scramble || []).forEach(q => {
        if (submitted[q.id]) {
          const result = answers[q.id];
          if (result?.isCorrect) correct++;
        }
      });
    } else if (zone === 'vocab') {
      (megaData.vocabTranslation || []).forEach(q => {
        if (submitted[q.id] && smartCheckMC(answers[q.id], q.correctAnswer, q.options, q.alternativeCorrectAnswers)) correct++;
      });
    } else if (zone === 'tf') {
      (megaData.trueFalse || []).forEach(q => {
        if (submitted[q.id] && answers[q.id] === q.isTrue) correct++;
      });
    } else if (zone === 'listen') {
      (listeningData || []).forEach(q => {
        if (submitted[q.id] && checkListeningBlank(String(answers[q.id] || ''), q)) correct++;
      });
    }
    return correct;
  };

  useEffect(() => {
    if (onScoresUpdate) {
      onScoresUpdate({
        mc: calculateZoneScore('mc'),
        scramble: calculateZoneScore('scramble'),
        fill: calculateZoneScore('fill'),
        vocab: calculateZoneScore('vocab'),
        tf: calculateZoneScore('tf'),
        listen: calculateZoneScore('listen')
      });
    }
  }, [submitted, megaData, listeningData]);

  if (!megaData) return null;

  return (
    <div className="bg-brand-900 rounded-[3rem] shadow-xl border-[8px] border-brand-800 overflow-hidden mb-12 font-sans">
      <div className="bg-brand-800 p-6 text-center border-b-2 border-brand-700">
        <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-4 tracking-tighter">🚀 MEGA CHALLENGES 🚀</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'mc', label: 'Quiz', icon: '📝', count: megaData.multipleChoice?.length || 0 },
            { id: 'fill', label: 'Điền từ', icon: '✏️', count: megaData.fillBlank?.length || 0 },
            { id: 'scramble', label: 'Sắp xếp', icon: '🧩', count: megaData.scramble?.length || 0 },
            { id: 'vocab', label: 'Dịch nghĩa', icon: '📚', count: megaData.vocabTranslation?.length || 0 },
            { id: 'tf', label: 'True/False', icon: '✅', count: megaData.trueFalse?.length || 0 },
            { id: 'listen', label: 'Nghe', icon: '🎧', count: listeningData?.length || 0 },
          ].map(z => (
            <button key={z.id} onClick={() => setActiveZone(z.id as any)} className={`px-4 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeZone === z.id ? 'bg-highlight-400 text-brand-900 scale-105 shadow-lg ring-2 ring-white/20' : 'bg-brand-700 text-brand-200 hover:bg-brand-600'}`}>
              <span className="text-xl">{z.icon}</span> {z.count} {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 bg-white/5">
        {/* Multiple Choice Section */}
        {activeZone === 'mc' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {(megaData.multipleChoice || []).map((q, idx) => {
              const allCorrectIndices = getAllSmartCorrectIndices(q.correctAnswer, q.options, q.alternativeCorrectAnswers);
              return (
              <div key={q.id} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-lg border-2 border-slate-50 transition-all hover:border-brand-200">
                <p className="font-black text-base md:text-lg text-slate-800 mb-4 flex gap-3 leading-tight">
                  <span className="bg-brand-100 text-brand-600 px-3 py-0.5 rounded-lg h-fit text-sm shrink-0">Q{idx + 1}</span>
                  <span className="break-words">{q.question}</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(q.options || []).map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => { handleAnswer(q.id, i); checkFinal(q.id, smartCheckMC(i, q.correctAnswer, q.options, q.alternativeCorrectAnswers)); }}
                      disabled={submitted[q.id]}
                      className={`p-4 rounded-xl border-2 font-bold text-left text-sm md:text-base transition-all ${submitted[q.id]
                        ? allCorrectIndices.includes(i)
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : answers[q.id] === i
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-slate-50 opacity-50'
                        : 'bg-white border-slate-50 hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98]'
                        }`}
                    >
                      <span className="mr-3 text-slate-300">{String.fromCharCode(65 + i)}.</span> {opt}
                    </button>
                  ))}
                </div>
                {submitted[q.id] && (
                  <CollapsibleExplanation
                    isCorrect={smartCheckMC(answers[q.id], q.correctAnswer, q.options, q.alternativeCorrectAnswers)}
                    explanation={q.explanation || ''}
                    correctAnswer={allCorrectIndices.map(ci => `${String.fromCharCode(65 + ci)}. ${q.options[ci]}`).join(' hoặc ')}
                  />
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Fill-in-the-Blank Section - TEXT INPUT */}
        {activeZone === 'fill' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {(megaData.fillBlank || []).map((q, idx) => {
              const isSubmitted = submitted[q.id];
              const userInput = answers[q.id]?.userAnswer || '';
              const isCorrect = answers[q.id]?.isCorrect;

              return (
                <div key={q.id} className="bg-white p-4 md:p-8 rounded-[2rem] shadow-lg border-b-4 border-slate-100">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-4xl md:text-5xl bg-brand-50 p-3 md:p-4 rounded-2xl shadow-inner shrink-0">{q.clueEmoji || '📝'}</span>
                    <div className="flex-1">
                      <p className="text-slate-400 font-black uppercase text-[10px] mb-2 tracking-widest">ĐIỀN TỪ CÂU {idx + 1}:</p>
                      <p className="text-lg md:text-xl font-bold text-slate-700 leading-relaxed break-words">{q.question}</p>
                    </div>
                  </div>

                  {/* Text Input Field */}
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={answers[q.id]?.userAnswer || ''}
                      onChange={(e) => {
                        if (!isSubmitted) {
                          handleAnswer(q.id, { userAnswer: e.target.value, isCorrect: false });
                        }
                      }}
                      disabled={isSubmitted}
                      placeholder="Nhập đáp án của bạn..."
                      className={`w-full p-4 text-lg font-bold rounded-xl border-2 transition-all outline-none ${isSubmitted
                        ? isCorrect
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-white border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
                        }`}
                    />

                    {!isSubmitted && (
                      <button
                        onClick={() => {
                          const userAnswer = (answers[q.id]?.userAnswer || '').trim();
                          const correct = checkFillAnswer(userAnswer, q.correctAnswer, q.alternativeAnswers, q.question);
                          handleAnswer(q.id, { userAnswer, isCorrect: correct });
                          checkFinal(q.id, correct);
                        }}
                        disabled={!answers[q.id]?.userAnswer?.trim()}
                        className="w-full py-3 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        ✅ Kiểm tra
                      </button>
                    )}
                  </div>

                  {isSubmitted && (
                    <CollapsibleExplanation
                      isCorrect={isCorrect}
                      explanation={q.explanation || ''}
                      correctAnswer={q.correctAnswer}
                      userAnswer={userInput}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scramble/Arrange Words Section - TAP TO BUILD SENTENCE */}
        {activeZone === 'scramble' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {(megaData.scramble || []).map((q, idx) => {
              const result = answers[q.id];
              const isSubmitted = submitted[q.id];

              // Parse correct sentence into tokens for validation
              const correctTokens = parseIntoTokens(q.correctSentence);

              // Use provided scrambled array as word bank
              let wordBank = q.scrambled || [];

              // Validation: ensure word bank matches expected token count
              // If mismatch detected, use correct tokens as fallback
              const expectedTokenCount = correctTokens.length;
              const wordBankTokenCount = wordBank.length;

              if (wordBankTokenCount !== expectedTokenCount) {
                console.warn(`⚠️ Word bank mismatch for Q${idx + 1}:`, {
                  expected: expectedTokenCount,
                  actual: wordBankTokenCount,
                  correctSentence: q.correctSentence,
                  wordBank: wordBank
                });
                // Fallback: use parsed tokens from correct sentence
                wordBank = [...correctTokens];
              }

              return (
                <div key={q.id} className="bg-white p-4 md:p-8 rounded-[2rem] shadow-lg border-b-4 border-slate-100">
                  <div className="mb-4">
                    <p className="text-slate-400 font-black uppercase text-[10px] mb-2 tracking-widest">SẮP XẾP CÂU {idx + 1}:</p>
                    <p className="text-sm text-slate-600 font-medium">Chạm vào các từ để xếp thành câu hoàn chỉnh:</p>
                  </div>

                  <WordBankFill
                    questionId={q.id}
                    wordBank={wordBank}
                    correctTokens={correctTokens}
                    mode="arrange_words"
                    disabled={isSubmitted}
                    showResult={isSubmitted}
                    sessionSeed={SESSION_SEED}
                    onComplete={(res) => {
                      handleAnswer(q.id, res);
                      checkFinal(q.id, res.isCorrect);
                    }}
                  />

                  {isSubmitted && (
                    <CollapsibleExplanation
                      isCorrect={result?.isCorrect}
                      explanation={q.translation ? `Nghĩa: ${q.translation}` : ''}
                      correctAnswer={q.correctSentence}
                      userAnswer={result?.userAnswer}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Vocabulary Translation Section - Dịch nghĩa Anh-Việt */}
        {activeZone === 'vocab' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-2xl mb-6 text-center">
              <h3 className="text-lg font-black">📚 Bài tập dịch nghĩa</h3>
              <p className="text-sm opacity-90">Chọn nghĩa tiếng Việt đúng cho từ tiếng Anh</p>
            </div>
            {(megaData.vocabTranslation || []).map((q, idx) => {
              const allCorrectIndices = getAllSmartCorrectIndices(q.correctAnswer, q.options, q.alternativeCorrectAnswers);
              return (
              <div key={q.id} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-lg border-2 border-slate-50 transition-all hover:border-purple-200">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg font-bold text-sm">#{idx + 1}</span>
                  <span className="text-3xl md:text-4xl font-black text-slate-800 tracking-wide">{q.word}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(q.options || []).map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => { handleAnswer(q.id, i); checkFinal(q.id, smartCheckMC(i, q.correctAnswer, q.options, q.alternativeCorrectAnswers)); }}
                      disabled={submitted[q.id]}
                      className={`p-4 rounded-xl border-2 font-bold text-left text-sm md:text-base transition-all ${submitted[q.id]
                        ? allCorrectIndices.includes(i)
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : answers[q.id] === i
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-slate-50 opacity-50'
                        : 'bg-white border-slate-50 hover:border-purple-300 hover:bg-purple-50 active:scale-[0.98]'
                        }`}
                    >
                      <span className="mr-3 text-slate-300">{String.fromCharCode(65 + i)}.</span> {opt}
                    </button>
                  ))}
                </div>
                {submitted[q.id] && (
                  <CollapsibleExplanation
                    isCorrect={smartCheckMC(answers[q.id], q.correctAnswer, q.options, q.alternativeCorrectAnswers)}
                    explanation={q.explanation || `'${q.word}' nghĩa là '${q.options[q.correctAnswer]}'`}
                    correctAnswer={allCorrectIndices.map(ci => `${String.fromCharCode(65 + ci)}. ${q.options[ci]}`).join(' hoặc ')}
                  />
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* True/False Reading Comprehension Section */}
        {activeZone === 'tf' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Reading Passage */}
            {megaData.trueFalsePassage && (
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 md:p-8 rounded-[2rem] shadow-lg border-2 border-teal-100 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">📖</span>
                  <h3 className="text-lg font-black text-teal-700">Bài đọc hiểu</h3>
                </div>
                <p className="text-slate-700 leading-relaxed text-base md:text-lg whitespace-pre-line">
                  {megaData.trueFalsePassage}
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-4 rounded-2xl text-center">
              <h3 className="text-lg font-black">✅ Câu hỏi True / False</h3>
              <p className="text-sm opacity-90">Đọc bài văn và chọn True (Đúng) hoặc False (Sai)</p>
            </div>

            {(megaData.trueFalse || []).map((q, idx) => (
              <div key={q.id} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-lg border-2 border-slate-50 transition-all hover:border-teal-200">
                <div className="mb-4">
                  <span className="bg-teal-100 text-teal-600 px-3 py-1 rounded-lg font-bold text-sm">Câu {idx + 1}</span>
                </div>
                <p className="text-base md:text-lg font-bold text-slate-800 mb-4 leading-relaxed">{q.statement}</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => { handleAnswer(q.id, true); checkFinal(q.id, q.isTrue === true); }}
                    disabled={submitted[q.id]}
                    className={`flex-1 p-4 rounded-xl border-2 font-black text-lg transition-all ${submitted[q.id]
                      ? q.isTrue === true
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : answers[q.id] === true
                          ? 'bg-red-100 border-red-500 text-red-700'
                          : 'bg-slate-50 opacity-50'
                      : 'bg-white border-slate-50 hover:border-green-300 hover:bg-green-50 active:scale-[0.98]'
                      }`}
                  >
                    ✓ TRUE
                  </button>
                  <button
                    onClick={() => { handleAnswer(q.id, false); checkFinal(q.id, q.isTrue === false); }}
                    disabled={submitted[q.id]}
                    className={`flex-1 p-4 rounded-xl border-2 font-black text-lg transition-all ${submitted[q.id]
                      ? q.isTrue === false
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : answers[q.id] === false
                          ? 'bg-red-100 border-red-500 text-red-700'
                          : 'bg-slate-50 opacity-50'
                      : 'bg-white border-slate-50 hover:border-red-300 hover:bg-red-50 active:scale-[0.98]'
                      }`}
                  >
                    ✗ FALSE
                  </button>
                </div>
                {submitted[q.id] && (
                  <CollapsibleExplanation
                    isCorrect={answers[q.id] === q.isTrue}
                    explanation={q.explanation}
                    correctAnswer={q.isTrue ? 'TRUE (Đúng)' : 'FALSE (Sai)'}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Listening Comprehension Section - BLANK FILLING */}
        {activeZone === 'listen' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 text-white p-5 rounded-2xl mb-6 text-center shadow-lg">
              <h3 className="text-xl font-black flex items-center justify-center gap-2">
                <span>🎧</span> Bài tập Nghe & Điền từ
              </h3>
              <p className="text-xs sm:text-sm opacity-95 mt-1 font-medium">
                Audio đọc đầy đủ nội dung câu/đoạn văn. Nhiệm vụ của con là lắng nghe và điền từ còn thiếu vào ô trống.
              </p>
            </div>

            {(listeningData || []).map((q, idx) => {
              const details = getListeningQuestionDetails(q);
              const isDone = !!submitted[q.id];
              const userInput = String(answers[q.id] || '');
              const isCorrect = isDone && checkListeningBlank(userInput, q);

              return (
                <div
                  key={q.id}
                  className={`bg-white p-5 md:p-7 rounded-[2rem] shadow-lg border-2 transition-all ${
                    isDone
                      ? isCorrect
                        ? 'border-green-400 bg-green-50/20 ring-4 ring-green-100'
                        : 'border-rose-400 bg-rose-50/20 ring-4 ring-rose-100'
                      : 'border-slate-100 hover:border-cyan-300'
                  }`}
                >
                  {/* Top Bar: Question badge + Audio Play Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-100 text-cyan-700 px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide">
                        Câu {idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                        🎧 Nghe trọn vẹn câu:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playGeminiTTS(q.audioText)}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <span className="text-lg">🔊</span> Phát âm thanh (Đọc trọn câu)
                      </button>
                    </div>
                  </div>

                  {/* Sentence with blank display */}
                  <div className="bg-gradient-to-r from-slate-50 to-cyan-50/40 p-4 sm:p-5 rounded-2xl border border-cyan-100 mb-5">
                    <p className="text-xs uppercase font-black tracking-wider text-cyan-800 mb-1 flex items-center gap-1.5">
                      <span>📝</span> Câu / Đoạn văn cần điền từ:
                    </p>
                    <p className="text-base sm:text-xl font-bold text-slate-800 leading-relaxed font-display">
                      {details.sentenceWithBlank}
                    </p>
                  </div>

                  {/* Input area for student */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                      Gõ từ còn thiếu con nghe được:
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-base pointer-events-none">
                          ✏️
                        </span>
                        <input
                          type="text"
                          disabled={isDone}
                          value={userInput}
                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isDone && userInput.trim()) {
                              checkFinal(q.id, checkListeningBlank(userInput, q));
                            }
                          }}
                          placeholder="Ví dụ: school bag..."
                          className={`w-full pl-10 pr-4 py-3.5 rounded-xl border-2 font-bold text-base outline-none transition-all ${
                            isDone
                              ? isCorrect
                                ? 'bg-green-50 border-green-500 text-green-800'
                                : 'bg-rose-50 border-rose-500 text-rose-800'
                              : 'bg-white border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isDone || !userInput.trim()}
                        onClick={() => checkFinal(q.id, checkListeningBlank(userInput, q))}
                        className="px-6 py-3.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>✓</span> Kiểm tra
                      </button>
                    </div>
                  </div>

                  {/* Explanation after submission */}
                  {isDone && (
                    <CollapsibleExplanation
                      isCorrect={isCorrect}
                      explanation={q.explanation || ''}
                      correctAnswer={details.missingWord}
                      userAnswer={userInput}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
