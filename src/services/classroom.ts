// ============================================================
// 🔗 Kết nối Giáo viên – Học sinh qua Firebase Realtime Database
// Mô hình: GV tạo lớp → nhận MÃ LỚP → HS nhập mã + họ tên để vào lớp.
// Mọi bài học & điểm của HS được ghi riêng từng bản ghi (không ghi đè nhau)
// và hiện ngay lập tức trên bảng theo dõi của GV.
// ============================================================
import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase, ref, get, set, update, remove, onValue, serverTimestamp, Database,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBAAlRpYdSoGwbnyyQJeE97PetuHkxPWoA',
  authDomain: 'mslyenglish-app.firebaseapp.com',
  databaseURL: 'https://mslyenglish-app-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mslyenglish-app',
  storageBucket: 'mslyenglish-app.firebasestorage.app',
  messagingSenderId: '573782840291',
  appId: '1:573782840291:web:77c05293f1d495283e46d6',
};

const TEACHER_ID = 'msly';
export const TEACHER_DISPLAY_NAME = 'Ms Lý';
// SHA-256("msly-english:" + mật khẩu ban đầu). Mật khẩu gốc KHÔNG nằm trong mã nguồn.
const DEFAULT_TEACHER_HASH = 'd02a4338f3d4fa5413c4f286ca2a826ecd33aea825e1a4388265c30bfaee0475';
const SESSION_KEY = 'msly_classroom_session';

let db: Database | null = null;
const getDb = (): Database => {
  if (!db) {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
};

// ---------------- Types ----------------
export type Session =
  | { role: 'teacher'; name: string }
  | { role: 'student'; code: string; className: string; sid: string; name: string };

export type StudentSession = Extract<Session, { role: 'student' }>;

export interface ClassInfo { name: string; createdAt: number; teacher: string }
export interface StudentInfo { name: string; joinedAt: number; lastActive?: number }
export interface LessonResult {
  topic: string;
  level: string;
  createdAt: number;
  speakingScore?: number;
  exerciseScore?: number;
  submitted?: boolean;
  submittedAt?: number;
}
export interface VocabItem { word: string; ipa?: string; meaning?: string; emoji?: string }

/** Bài cô giao. Có readingText = bài nói do cô tạo sẵn (HS không cần API key). */
export interface Assignment {
  topic: string;
  level: string;
  note?: string;
  createdAt: number;
  readingText?: string;
  translation?: string;
  vocabulary?: VocabItem[];
  /** URL hoặc data URI ảnh minh hoạ */
  image?: string;
  /** Có file giọng đọc AI ở classes/{MÃ}/lessonAudio/{aid} */
  hasAudio?: boolean;
}

/** Kết quả chấm (rút gọn từ EvaluationResult) */
export interface GradeResult {
  score: number;
  criteriaScores?: { pronunciation: number; fluency: number; intonation: number; grammar: number };
  strengthsSummary?: { attitude: string; goodWords: string[] };
  improvementsList?: { word: string; ipa?: string; detail: string }[];
  reviewItems?: { original: string; corrected: string }[];
  transcribedText?: string;
  isSilent?: boolean;
  feedback?: string;
}

export interface Submission {
  name: string;
  duration?: number;
  submittedAt: number;
  status: 'pending' | 'graded' | 'error';
  gradedAt?: number;
  result?: GradeResult;
  report?: string;      // lời nhận xét gửi phụ huynh (cô có thể sửa)
  error?: string;
}

export interface ClassData {
  info: ClassInfo | null;
  students: Record<string, StudentInfo>;
  results: Record<string, Record<string, LessonResult>>;
  assignments: Record<string, Assignment>;
  /** submissions[assignmentId][studentId] — KHÔNG kèm file ghi âm (tải riêng khi cần) */
  submissions: Record<string, Record<string, Submission>>;
}

// ---------------- Session ----------------
export const getSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

const saveSession = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* trình duyệt chặn lưu trữ: vẫn chạy được trong phiên */ }
};

export const logout = () => saveSession(null);

// ---------------- Helpers ----------------
const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hashPass = (pass: string) => sha256('msly-english:' + pass.trim());

/** Chuẩn hoá họ tên thành khoá: "Nguyễn Minh Anh" → "nguyen-minh-anh" */
export const studentKey = (name: string): string =>
  name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(n => CODE_CHARS[n % CODE_CHARS.length]).join('');

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const friendlyError = (e: any): Error => {
  const msg = String(e?.message || e);
  if (/permission/i.test(msg)) return new Error('Máy chủ lớp học chưa sẵn sàng (chưa cấp quyền). Vui lòng báo cô giáo.');
  if (/network|offline|failed to fetch/i.test(msg)) return new Error('Không có mạng. Vui lòng kiểm tra kết nối Internet rồi thử lại.');
  return new Error(msg);
};

// ---------------- Teacher ----------------
export const teacherLogin = async (password: string): Promise<Session> => {
  if (!password.trim()) throw new Error('Vui lòng nhập mật khẩu giáo viên.');
  const h = await hashPass(password);
  let stored: string | null = null;
  try {
    const snap = await get(ref(getDb(), `teachers/${TEACHER_ID}/passHash`));
    stored = snap.exists() ? String(snap.val()) : null;
  } catch (e) {
    throw friendlyError(e);
  }
  if (h !== (stored || DEFAULT_TEACHER_HASH)) throw new Error('Mật khẩu giáo viên không đúng.');
  const s: Session = { role: 'teacher', name: TEACHER_DISPLAY_NAME };
  saveSession(s);
  return s;
};

export const changeTeacherPassword = async (oldPass: string, newPass: string) => {
  if (newPass.trim().length < 6) throw new Error('Mật khẩu mới cần ít nhất 6 ký tự.');
  const snap = await get(ref(getDb(), `teachers/${TEACHER_ID}/passHash`));
  const current = snap.exists() ? String(snap.val()) : DEFAULT_TEACHER_HASH;
  if ((await hashPass(oldPass)) !== current) throw new Error('Mật khẩu cũ không đúng.');
  await set(ref(getDb(), `teachers/${TEACHER_ID}/passHash`), await hashPass(newPass));
};

export const createClass = async (name: string): Promise<string> => {
  const clean = normalizeName(name);
  if (!clean) throw new Error('Vui lòng nhập tên lớp.');
  try {
    for (let i = 0; i < 8; i++) {
      const code = randomCode();
      const exists = await get(ref(getDb(), `classes/${code}/info`));
      if (exists.exists()) continue;
      await update(ref(getDb()), {
        [`classes/${code}/info`]: { name: clean, teacher: TEACHER_ID, createdAt: serverTimestamp() },
        [`teachers/${TEACHER_ID}/classes/${code}`]: { name: clean, createdAt: serverTimestamp() },
      });
      return code;
    }
  } catch (e) {
    throw friendlyError(e);
  }
  throw new Error('Không tạo được mã lớp, vui lòng thử lại.');
};

export const deleteClass = async (code: string) => {
  await update(ref(getDb()), {
    [`classes/${code}`]: null,
    [`teachers/${TEACHER_ID}/classes/${code}`]: null,
  });
};

export const listenTeacherClasses = (
  cb: (classes: Record<string, { name: string; createdAt: number }>) => void,
  onError?: (e: Error) => void,
) =>
  onValue(
    ref(getDb(), `teachers/${TEACHER_ID}/classes`),
    snap => cb(snap.val() || {}),
    e => onError?.(friendlyError(e)),
  );

/** Nghe từng nhánh riêng để KHÔNG tải file ghi âm (nặng) của cả lớp. */
export const listenClass = (code: string, cb: (data: ClassData) => void, onError?: (e: Error) => void) => {
  const parts = ['info', 'students', 'results', 'assignments', 'submissions'] as const;
  const state: any = { info: null, students: {}, results: {}, assignments: {}, submissions: {} };
  const loaded = new Set<string>();
  const unsubs = parts.map(p =>
    onValue(
      ref(getDb(), `classes/${code}/${p}`),
      snap => {
        state[p] = snap.val() || (p === 'info' ? null : {});
        loaded.add(p);
        if (loaded.size === parts.length) cb({ ...state });
      },
      e => onError?.(friendlyError(e)),
    ),
  );
  return () => unsubs.forEach(u => u());
};

export const addAssignment = async (
  code: string,
  topic: string,
  level: string,
  note = '',
  lesson?: { readingText: string; translation?: string; vocabulary?: VocabItem[]; image?: string; audio?: string | null },
) => {
  if (!topic.trim()) throw new Error('Vui lòng nhập chủ đề cần giao.');
  const id = `a_${Date.now()}`;
  const data: Record<string, any> = { topic: topic.trim(), level, note: note.trim(), createdAt: serverTimestamp() };
  if (lesson?.readingText?.trim()) {
    data.readingText = lesson.readingText.trim();
    if (lesson.translation) data.translation = lesson.translation.trim();
    if (lesson.image && lesson.image.length <= 400000) data.image = lesson.image;
    if (lesson.audio) data.hasAudio = true;
    if (lesson.vocabulary?.length) {
      data.vocabulary = lesson.vocabulary.slice(0, 20).map(v => ({
        word: String(v.word || ''), ipa: String(v.ipa || ''), meaning: String(v.meaning || ''), emoji: String(v.emoji || ''),
      }));
    }
  }
  await set(ref(getDb(), `classes/${code}/assignments/${id}`), data);
  if (lesson?.audio && lesson.readingText?.trim()) {
    await set(ref(getDb(), `classes/${code}/lessonAudio/${id}`), lesson.audio);
  }
  return id;
};

// ---------------- Bài nộp & chấm ----------------
/** HS nộp file ghi âm bài cô giao (WAV base64). File lưu riêng ở nhánh audio. */
export const submitRecording = async (
  s: StudentSession, aid: string, a: Assignment, audioBase64: string, duration: number,
) => {
  try {
    await update(ref(getDb()), {
      [`classes/${s.code}/audio/${aid}/${s.sid}`]: audioBase64,
      [`classes/${s.code}/submissions/${aid}/${s.sid}`]: {
        name: s.name, duration: Math.round(duration * 10) / 10, submittedAt: serverTimestamp(), status: 'pending',
      },
      [`classes/${s.code}/results/${s.sid}/${aid}`]: {
        topic: a.topic, level: a.level, createdAt: serverTimestamp(), submitted: true, submittedAt: serverTimestamp(),
      },
      [`classes/${s.code}/students/${s.sid}/lastActive`]: serverTimestamp(),
    });
  } catch (e) {
    throw friendlyError(e);
  }
};

export const listenMySubmissions = (s: StudentSession, cb: (subs: Record<string, Submission>) => void) => {
  // Lấy toàn bộ submissions của lớp rồi lọc bài của con (không kèm file ghi âm)
  return onValue(ref(getDb(), `classes/${s.code}/submissions`), snap => {
    const all = (snap.val() || {}) as Record<string, Record<string, Submission>>;
    const mine: Record<string, Submission> = {};
    Object.entries(all).forEach(([aid, bySid]) => { if (bySid?.[s.sid]) mine[aid] = bySid[s.sid]; });
    cb(mine);
  }, () => cb({}));
};

export const fetchRecording = async (code: string, aid: string, sid: string): Promise<string | null> => {
  const snap = await get(ref(getDb(), `classes/${code}/audio/${aid}/${sid}`));
  return snap.exists() ? String(snap.val()) : null;
};

export const saveGrade = async (
  code: string, aid: string, sid: string, result: GradeResult, report: string,
) => {
  const clean = JSON.parse(JSON.stringify(result)); // bỏ undefined
  await update(ref(getDb()), {
    [`classes/${code}/submissions/${aid}/${sid}/status`]: 'graded',
    [`classes/${code}/submissions/${aid}/${sid}/gradedAt`]: serverTimestamp(),
    [`classes/${code}/submissions/${aid}/${sid}/result`]: clean,
    [`classes/${code}/submissions/${aid}/${sid}/report`]: report,
    [`classes/${code}/submissions/${aid}/${sid}/error`]: null,
    [`classes/${code}/results/${sid}/${aid}/speakingScore`]: result.isSilent ? 0 : result.score,
  });
};

export const saveReportText = (code: string, aid: string, sid: string, report: string) =>
  set(ref(getDb(), `classes/${code}/submissions/${aid}/${sid}/report`), report);

export const markGradeError = (code: string, aid: string, sid: string, msg: string) =>
  update(ref(getDb(), `classes/${code}/submissions/${aid}/${sid}`), { status: 'error', error: msg.slice(0, 300) });

export const resetToPending = (code: string, aid: string, sid: string) =>
  update(ref(getDb(), `classes/${code}/submissions/${aid}/${sid}`), { status: 'pending', error: null });

// ---------------- Kho bài của cô ----------------
/** Bài cô đã tạo, lưu lại để giao cho lớp khác / năm sau. teachers/msly/library/{lid} */
export interface SavedLesson {
  topic: string;
  level: string;
  readingText: string;
  translation?: string;
  vocabulary?: VocabItem[];
  createdAt: number;
  updatedAt?: number;
  usedCount?: number;
  image?: string;
  hasAudio?: boolean;
}

export const newLibraryId = () => `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const listenLibrary = (cb: (l: Record<string, SavedLesson>) => void) =>
  onValue(ref(getDb(), `teachers/${TEACHER_ID}/library`), snap => cb(snap.val() || {}), () => cb({}));

/** Lưu (hoặc ghi đè) một bài vào kho của cô. */
export const saveToLibrary = async (
  lid: string,
  lesson: { topic: string; level: string; readingText: string; translation?: string; vocabulary?: VocabItem[]; image?: string; audio?: string | null },
  isNew: boolean,
) => {
  if (!lesson.readingText?.trim()) return;
  const data: Record<string, any> = {
    topic: (lesson.topic || '').trim().slice(0, 200) || 'Bài nói',
    level: lesson.level,
    readingText: lesson.readingText.trim().slice(0, 6000),
    translation: (lesson.translation || '').trim().slice(0, 8000),
    vocabulary: (lesson.vocabulary || []).slice(0, 20).map(v => ({
      word: String(v.word || ''), ipa: String(v.ipa || ''), meaning: String(v.meaning || ''), emoji: String(v.emoji || ''),
    })),
    updatedAt: serverTimestamp(),
    image: lesson.image && lesson.image.length <= 400000 ? lesson.image : null,
  };
  if (lesson.audio !== undefined) data.hasAudio = !!lesson.audio;
  if (isNew) data.createdAt = serverTimestamp();
  await update(ref(getDb(), `teachers/${TEACHER_ID}/library/${lid}`), data);
  if (lesson.audio !== undefined) await set(ref(getDb(), `teachers/${TEACHER_ID}/libraryAudio/${lid}`), lesson.audio || null);
};

export const markLibraryUsed = async (lid: string, prev = 0) =>
  set(ref(getDb(), `teachers/${TEACHER_ID}/library/${lid}/usedCount`), prev + 1);

export const removeFromLibrary = (lid: string) => update(ref(getDb()), {
  [`teachers/${TEACHER_ID}/library/${lid}`]: null,
  [`teachers/${TEACHER_ID}/libraryAudio/${lid}`]: null,
});

/** Giọng Leda cho bài mẫu: chỉ mục nhẹ (id → true) + file WAV tải riêng */
export const listenSampleAudioDone = (cb: (m: Record<string, boolean>) => void) =>
  onValue(ref(getDb(), `teachers/${TEACHER_ID}/sampleAudioDone`), snap => cb(snap.val() || {}), () => cb({}));
export const fetchSampleAudio = async (sid: string): Promise<string | null> => {
  const snap = await get(ref(getDb(), `teachers/${TEACHER_ID}/sampleAudio/${sid}`));
  return snap.exists() ? String(snap.val()) : null;
};
export const saveSampleAudio = (sid: string, b64: string) =>
  update(ref(getDb()), {
    [`teachers/${TEACHER_ID}/sampleAudio/${sid}`]: b64,
    [`teachers/${TEACHER_ID}/sampleAudioDone/${sid}`]: true,
  });

/** Giọng đọc AI (WAV base64) — tải riêng khi cần */
export const fetchLibraryAudio = async (lid: string): Promise<string | null> => {
  const snap = await get(ref(getDb(), `teachers/${TEACHER_ID}/libraryAudio/${lid}`));
  return snap.exists() ? String(snap.val()) : null;
};
export const fetchLessonAudio = async (code: string, aid: string): Promise<string | null> => {
  const snap = await get(ref(getDb(), `classes/${code}/lessonAudio/${aid}`));
  return snap.exists() ? String(snap.val()) : null;
};

// ---------------- Cài đặt giáo viên ----------------
export const DEFAULT_CALL_NAME = 'Cô Lý';
export const listenCallName = (cb: (name: string) => void) =>
  onValue(ref(getDb(), `teachers/${TEACHER_ID}/callName`), snap => cb(snap.val() || DEFAULT_CALL_NAME), () => cb(DEFAULT_CALL_NAME));
export const saveCallName = (name: string) =>
  set(ref(getDb(), `teachers/${TEACHER_ID}/callName`), name.trim().slice(0, 40) || DEFAULT_CALL_NAME);

/** Lời nhận xét gửi phụ huynh — theo đúng mẫu của cô. */
export const buildParentReport = (r: GradeResult, callName = DEFAULT_CALL_NAME): string => {
  const f = (n?: number) => (typeof n === 'number' ? n.toFixed(1) : '—');
  const L: string[] = [];
  L.push(`${callName} cảm ơn bố/mẹ ạ! ❤️ Cô đã nhận được bài luyện đọc của con rồi ạ!`);
  L.push('Cô xin gửi lại bố/mẹ nhận xét bài của con như sau:');
  if (r.isSilent) {
    L.push('');
    L.push('◦ Bài ghi âm của con chưa nghe được tiếng (micro chưa thu được). Bố/mẹ giúp con kiểm tra micro và cho con đọc lại, nộp lại bài nhé ạ.');
  } else {
    L.push('');
    L.push('🌟 Ưu điểm:');
    L.push(`◦ Phong thái: ${r.strengthsSummary?.attitude || 'Con rất tự tin, giọng đọc to, rõ ràng.'}`);
    const good = r.strengthsSummary?.goodWords || [];
    if (good.length) L.push(`◦ Phát âm tốt: ${good.join(', ')}.`);
    L.push('');
    L.push('📝 Điểm cần cải thiện:');
    const imp = r.improvementsList || [];
    if (imp.length) {
      imp.forEach(i => {
        const ipa = i.ipa ? ` /${i.ipa.replace(/^\/|\/$/g, '')}/` : '';
        L.push(`◦ ${i.word}${ipa}: ${i.detail}`);
      });
    } else {
      L.push('◦ Con phát âm các từ trong bài rất tốt, tiếp tục phát huy nhé!');
    }
    L.push('');
    L.push('📊 Đánh giá:');
    const c = r.criteriaScores;
    L.push(`🏆 Tổng điểm: ${f(r.score)}/10`);
    L.push(`🗣️ Phát âm: ${f(c?.pronunciation ?? r.score)}/10`);
    L.push(`🌊 Trôi chảy: ${f(c?.fluency ?? r.score)}/10`);
    L.push(`🎵 Ngữ điệu: ${f(c?.intonation ?? r.score)}/10`);
    L.push(`📖 Ngữ pháp: ${f(c?.grammar ?? r.score)}/10`);
    const rev = r.reviewItems || [];
    if (rev.length) {
      L.push('');
      L.push('📚 Con cần ôn thêm:');
      rev.forEach(i => L.push(`◦ ${i.original} → sửa đúng thành ${i.corrected.replace(/\.?$/, '.')}`));
    }
  }
  L.push('');
  L.push('Cô mong con tiếp tục cố gắng và duy trì tinh thần học tập thật tốt nhé! ❤️');
  L.push('Cô xin cảm ơn bố mẹ đã luôn đồng hành cùng cô và con ạ!');
  return L.join('\n');
};

export const removeAssignment = (code: string, id: string) =>
  update(ref(getDb()), {
    [`classes/${code}/assignments/${id}`]: null,
    [`classes/${code}/submissions/${id}`]: null,
    [`classes/${code}/audio/${id}`]: null,
    [`classes/${code}/lessonAudio/${id}`]: null,
  });

export const removeStudent = (code: string, sid: string) =>
  update(ref(getDb()), {
    [`classes/${code}/students/${sid}`]: null,
    [`classes/${code}/results/${sid}`]: null,
  });

// ---------------- Student ----------------
export const joinClass = async (rawCode: string, rawName: string): Promise<StudentSession> => {
  const code = normalizeCode(rawCode);
  const name = normalizeName(rawName);
  if (code.length < 4) throw new Error('Con nhập mã lớp cô giáo đưa nhé (6 ký tự).');
  if (name.length < 2) throw new Error('Con nhập đầy đủ họ và tên nhé.');
  const sid = studentKey(name);
  if (!sid) throw new Error('Họ tên chưa hợp lệ, con kiểm tra lại nhé.');
  try {
    const info = await get(ref(getDb(), `classes/${code}/info`));
    if (!info.exists()) throw new Error('Không tìm thấy lớp có mã này. Con kiểm tra lại mã lớp nhé.');
    const studentRef = ref(getDb(), `classes/${code}/students/${sid}`);
    const existing = await get(studentRef);
    if (existing.exists()) {
      await update(studentRef, { lastActive: serverTimestamp() });
    } else {
      await set(studentRef, { name, joinedAt: serverTimestamp(), lastActive: serverTimestamp() });
    }
    const s: StudentSession = { role: 'student', code, className: info.val().name, sid, name };
    saveSession(s);
    return s;
  } catch (e: any) {
    if (e?.message?.startsWith('Không tìm thấy lớp')) throw e;
    throw friendlyError(e);
  }
};

export const listenAssignments = (code: string, cb: (a: Record<string, Assignment>) => void) =>
  onValue(ref(getDb(), `classes/${code}/assignments`), snap => cb(snap.val() || {}), () => cb({}));

/** Ghi/cập nhật kết quả 1 bài học của HS (chạy ngầm, lỗi mạng không làm hỏng app). */
export const saveLessonResult = async (s: StudentSession, lessonId: string, fields: Partial<LessonResult>) => {
  try {
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await update(ref(getDb()), {
      ...Object.fromEntries(
        Object.entries(clean).map(([k, v]) => [`classes/${s.code}/results/${s.sid}/${lessonId}/${k}`, v]),
      ),
      [`classes/${s.code}/students/${s.sid}/lastActive`]: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('Không gửi được kết quả lên lớp học:', e);
    return false;
  }
};
