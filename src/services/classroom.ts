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
export interface Assignment { topic: string; level: string; note?: string; createdAt: number }

export interface ClassData {
  info: ClassInfo | null;
  students: Record<string, StudentInfo>;
  results: Record<string, Record<string, LessonResult>>;
  assignments: Record<string, Assignment>;
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

export const listenClass = (code: string, cb: (data: ClassData) => void, onError?: (e: Error) => void) =>
  onValue(
    ref(getDb(), `classes/${code}`),
    snap => {
      const v = snap.val() || {};
      cb({
        info: v.info || null,
        students: v.students || {},
        results: v.results || {},
        assignments: v.assignments || {},
      });
    },
    e => onError?.(friendlyError(e)),
  );

export const addAssignment = async (code: string, topic: string, level: string, note = '') => {
  if (!topic.trim()) throw new Error('Vui lòng nhập chủ đề cần giao.');
  const id = `a_${Date.now()}`;
  await set(ref(getDb(), `classes/${code}/assignments/${id}`), {
    topic: topic.trim(), level, note: note.trim(), createdAt: serverTimestamp(),
  });
};

export const removeAssignment = (code: string, id: string) =>
  remove(ref(getDb(), `classes/${code}/assignments/${id}`));

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
