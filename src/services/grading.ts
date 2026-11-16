// Chấm bài nộp của học sinh — chạy trên máy GIÁO VIÊN bằng API key Gemini của cô.
// Key không bao giờ được gửi lên Firebase hay tới máy học sinh.
import { evaluateSpeech, EnglishLevel } from './geminiService';
import {
  Assignment, GradeResult, buildParentReport, fetchRecording, markGradeError, saveGrade,
} from './classroom';

export const friendlyAiError = (e: any): string => {
  const msg = String(e?.message || e);
  if (msg === 'QUOTA_EXCEEDED' || /429|quota/i.test(msg)) return 'API key Gemini hết hạn mức (quota). Cô đổi key khác hoặc thử lại sau.';
  if (msg === 'INVALID_KEY' || /api key|API_KEY_INVALID|permission/i.test(msg)) return 'API key Gemini không hợp lệ. Cô kiểm tra lại trong Cài đặt API Key.';
  if (msg === 'MODEL_OVERLOADED' || /overload|503|unavailable/i.test(msg)) return 'Máy chủ Google AI đang quá tải, cô thử lại sau ít phút.';
  return msg.slice(0, 200);
};

export const gradeSubmission = async (
  code: string, aid: string, sid: string, a: Assignment, callName: string,
): Promise<GradeResult> => {
  if (!a.readingText) throw new Error('Bài này không có bài đọc để chấm.');
  const audio = await fetchRecording(code, aid, sid);
  if (!audio) {
    await markGradeError(code, aid, sid, 'Không tìm thấy file ghi âm.');
    throw new Error('Không tìm thấy file ghi âm.');
  }
  try {
    const ev = await evaluateSpeech(a.readingText, audio, a.level as EnglishLevel, 'audio/wav');
    const r: GradeResult = {
      score: ev.score,
      isSilent: !!ev.isSilent,
      feedback: ev.feedback,
      transcribedText: ev.transcribedText || '',
      strengthsSummary: ev.strengthsSummary,
      improvementsList: (ev.improvementsList || []).map(i => ({ word: i.word, ipa: i.ipa || '', detail: i.detail })),
      reviewItems: ev.reviewItems || [],
      criteriaScores: ev.criteriaScores ? {
        pronunciation: ev.criteriaScores.pronunciation,
        fluency: ev.criteriaScores.fluency,
        intonation: ev.criteriaScores.intonation,
        grammar: ev.criteriaScores.grammar,
      } : undefined,
    };
    await saveGrade(code, aid, sid, r, buildParentReport(r, callName));
    return r;
  } catch (e) {
    const m = friendlyAiError(e);
    await markGradeError(code, aid, sid, m).catch(() => {});
    throw new Error(m);
  }
};
