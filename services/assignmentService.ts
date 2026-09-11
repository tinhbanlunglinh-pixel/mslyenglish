import {
  ClassRoom,
  Student,
  Assignment,
  Submission,
  DailySummary,
  DeadlineStatus,
  LessonPlan,
  MonthlyReport,
  MonthlySessionConfig,
  StudentMonthlyScore,
  WeeklyReportRecord,
  WeeklySessionConfig,
  StudentWeeklyScore,
  ClassScheduleConfig,
  WeeklyTimeSlot,
  AttendanceRecord,
  AttendanceStudentItem,
  AttendanceStatus
} from '../types';
import { syncToFirebaseIfConfigured, pullAllFromFirebase, seedFirebaseIfEmpty } from './firebaseService';
import { ensureCompletePracticeContent } from '../utils/practiceBuilder';

// Storage keys
const CLASSES_KEY = 'mrs_dung_classes';
const STUDENTS_KEY = 'mrs_dung_students';
const ASSIGNMENTS_KEY = 'mrs_dung_assignments';
const SUBMISSIONS_KEY = 'mrs_dung_submissions';
const MONTHLY_REPORTS_KEY = 'mrs_dung_monthly_reports';
const WEEKLY_REPORTS_KEY = 'mrs_dung_weekly_reports';
const CLASS_SCHEDULES_KEY = 'mrs_dung_class_schedules';
const ATTENDANCE_RECORDS_KEY = 'mrs_dung_attendance_records';
const DATA_CLEANED_KEY = 'mrs_dung_data_cleaned';

// BroadcastChannel for instant multi-tab sync
const SYNC_CHANNEL_NAME = 'mrs_dung_sync_channel';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported or error:', e);
  }
}

export const notifySync = (type: string, data?: any) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
  }
  // Also dispatch CustomEvent on window for single-tab state reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mrs_dung_local_sync', { detail: { type, data } }));
  }
};

export const subscribeToSync = (callback: (event: { type: string; data?: any }) => void): (() => void) => {
  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };

  const handleLocalEvent = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mrs_dung_local_sync', handleLocalEvent);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mrs_dung_local_sync', handleLocalEvent);
    }
  };
};

// ==================== DEFAULT SEED DATA ====================
const DEFAULT_CLASSES: ClassRoom[] = [
  { id: 'class_6a1', name: 'Lớp 6A1', grade: 6, description: 'Lớp 6A1 - Global Success', studentCount: 8, createdAt: new Date().toISOString() },
  { id: 'class_6a2', name: 'Lớp 6A2', grade: 6, description: 'Lớp 6A2 - Tiếng Anh Tăng Cường', studentCount: 4, createdAt: new Date().toISOString() },
  { id: 'class_7b1', name: 'Lớp 7B1', grade: 7, description: 'Lớp 7B1 - Global Success', studentCount: 3, createdAt: new Date().toISOString() },
  { id: 'class_8a1', name: 'Lớp 8A1', grade: 8, description: 'Lớp 8A1 - Luyện Thi Chuyên Sâu', studentCount: 2, createdAt: new Date().toISOString() },
];

const DEFAULT_STUDENTS: Student[] = [
  { id: 'std_1', name: 'Nguyễn Minh Anh', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🌸', rollNumber: '01', notes: 'Học sinh giỏi, tích cực phát biểu', createdAt: new Date().toISOString() },
  { id: 'std_2', name: 'Trần Bảo Nam', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🚀', rollNumber: '02', notes: 'Ngữ pháp tốt, chăm chỉ', createdAt: new Date().toISOString() },
  { id: 'std_3', name: 'Lê Phương Linh', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '⭐', rollNumber: '03', notes: 'Từ vựng rất phong phú', createdAt: new Date().toISOString() },
  { id: 'std_4', name: 'Phạm Gia Huy', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '⚡', rollNumber: '04', notes: 'Phát âm chuẩn', createdAt: new Date().toISOString() },
  { id: 'std_5', name: 'Hoàng Mai Chi', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🦄', rollNumber: '05', notes: 'Nghe tốt, điểm cao', createdAt: new Date().toISOString() },
  { id: 'std_6', name: 'Vũ Đức Khang', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🦁', rollNumber: '06', notes: 'Cần luyện thêm sắp xếp câu', createdAt: new Date().toISOString() },
  { id: 'std_7', name: 'Đặng Thùy Dương', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🌻', rollNumber: '07', notes: 'Tiến bộ vượt bậc', createdAt: new Date().toISOString() },
  { id: 'std_8', name: 'Bùi Quốc Anh', classId: 'class_6a1', className: 'Lớp 6A1', avatar: '🎯', rollNumber: '08', notes: 'Cẩn thận, tỉ mỉ', createdAt: new Date().toISOString() },

  { id: 'std_9', name: 'Nguyễn Hoàng Yến', classId: 'class_6a2', className: 'Lớp 6A2', avatar: '🐱', rollNumber: '01', createdAt: new Date().toISOString() },
  { id: 'std_10', name: 'Đỗ Tiến Đạt', classId: 'class_6a2', className: 'Lớp 6A2', avatar: '⚽', rollNumber: '02', createdAt: new Date().toISOString() },
  { id: 'std_11', name: 'Vũ Thanh Thảo', classId: 'class_6a2', className: 'Lớp 6A2', avatar: '🎨', rollNumber: '03', createdAt: new Date().toISOString() },
  { id: 'std_12', name: 'Lý Quốc Cường', classId: 'class_6a2', className: 'Lớp 6A2', avatar: '🎸', rollNumber: '04', createdAt: new Date().toISOString() },

  { id: 'std_13', name: 'Lê Gia Hân', classId: 'class_7b1', className: 'Lớp 7B1', avatar: '🌺', rollNumber: '01', createdAt: new Date().toISOString() },
  { id: 'std_14', name: 'Nguyễn Tuấn Kiệt', classId: 'class_7b1', className: 'Lớp 7B1', avatar: '🏹', rollNumber: '02', createdAt: new Date().toISOString() },
  { id: 'std_15', name: 'Phan Như Quỳnh', classId: 'class_7b1', className: 'Lớp 7B1', avatar: '🍀', rollNumber: '03', createdAt: new Date().toISOString() },

  { id: 'std_16', name: 'Nguyễn Thành Trung', classId: 'class_8a1', className: 'Lớp 8A1', avatar: '👑', rollNumber: '01', createdAt: new Date().toISOString() },
  { id: 'std_17', name: 'Trần Thảo My', classId: 'class_8a1', className: 'Lớp 8A1', avatar: '💎', rollNumber: '02', createdAt: new Date().toISOString() },
];

// Helper to get today's date in YYYY-MM-DD
export const getTodayString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ==================== DATA RESET & CLEANUP ====================
export const isDataCleaned = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DATA_CLEANED_KEY) === 'true';
};

export const clearAllDemoData = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATA_CLEANED_KEY, 'true');
  localStorage.setItem(CLASSES_KEY, JSON.stringify([]));
  localStorage.setItem(STUDENTS_KEY, JSON.stringify([]));
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify([]));
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify([]));
  localStorage.setItem(WEEKLY_REPORTS_KEY, JSON.stringify([]));
  localStorage.setItem(CLASS_SCHEDULES_KEY, JSON.stringify([]));
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify([]));

  // Sync empty arrays to Firebase so cloud is also cleaned
  await Promise.all([
    syncToFirebaseIfConfigured('classes', []),
    syncToFirebaseIfConfigured('students', []),
    syncToFirebaseIfConfigured('assignments', []),
    syncToFirebaseIfConfigured('submissions', []),
    syncToFirebaseIfConfigured('monthly_reports', []),
    syncToFirebaseIfConfigured('weekly_reports', []),
    syncToFirebaseIfConfigured('class_schedules', []),
    syncToFirebaseIfConfigured('attendance_records', [])
  ]);

  notifySync('data_reset_all', { timestamp: Date.now() });
};

// ==================== CLASS MANAGEMENT ====================
export const getClasses = (): ClassRoom[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLASSES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (isDataCleaned()) return [];
    localStorage.setItem(CLASSES_KEY, JSON.stringify(DEFAULT_CLASSES));
    return DEFAULT_CLASSES;
  } catch {
    return [];
  }
};

export const saveClasses = (classes: ClassRoom[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  notifySync('classes_updated', classes);
  syncToFirebaseIfConfigured('classes', classes);
};

export const addClass = (name: string, grade: number, description = ''): ClassRoom => {
  const current = getClasses();
  const newClass: ClassRoom = {
    id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    grade,
    description: description.trim(),
    studentCount: 0,
    createdAt: new Date().toISOString()
  };
  const updated = [...current, newClass];
  saveClasses(updated);
  return newClass;
};

export const updateClass = (id: string, updates: Partial<ClassRoom>): void => {
  const current = getClasses();
  const updated = current.map(c => c.id === id ? { ...c, ...updates } : c);
  saveClasses(updated);
};

export const deleteClass = (id: string): void => {
  const current = getClasses();
  const updated = current.filter(c => c.id !== id);
  saveClasses(updated);
  // Also clean up students of this class
  const students = getStudents();
  const remainingStudents = students.filter(s => s.classId !== id);
  saveStudents(remainingStudents);
};

// ==================== STUDENT MANAGEMENT ====================
export const getStudents = (classId?: string): Student[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    let all: Student[] = [];
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      all = Array.isArray(parsed) ? parsed : [];
    } else if (!isDataCleaned()) {
      all = DEFAULT_STUDENTS;
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENTS));
    }
    if (classId && classId !== 'ALL') {
      return all.filter(s => s.classId === classId);
    }
    return all;
  } catch {
    return [];
  }
};

export const saveStudents = (students: Student[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  notifySync('students_updated', students);
  syncToFirebaseIfConfigured('students', students);

  // Update studentCount in classes
  const classes = getClasses();
  const updatedClasses = classes.map(c => {
    const count = students.filter(s => s.classId === c.id).length;
    return { ...c, studentCount: count };
  });
  saveClasses(updatedClasses);
};

const RANDOM_AVATARS = ['🌸', '🚀', '⭐', '⚡', '🦄', '🦁', '🌻', '🎯', '🐱', '⚽', '🎨', '🎸', '🌺', '🏹', '🍀', '👑', '💎', '🌈', '🐬', '☀️'];

export const addStudent = (
  name: string,
  classId: string,
  className: string,
  englishName = '',
  phone = '',
  notes = '',
  password = '123'
): Student => {
  const current = getStudents();
  const avatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
  const rollNumber = String(current.filter(s => s.classId === classId).length + 1).padStart(2, '0');
  const newStudent: Student = {
    id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    englishName: englishName.trim(),
    phone: phone.trim(),
    classId,
    className,
    avatar,
    rollNumber,
    notes: notes.trim(),
    password: password.trim() || '123',
    createdAt: new Date().toISOString()
  };
  saveStudents([...current, newStudent]);
  return newStudent;
};

export const batchAddStudents = (names: string[], classId: string, className: string): Student[] => {
  const current = getStudents();
  const existingCount = current.filter(s => s.classId === classId).length;
  const newStudents: Student[] = names
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .map((name, idx) => ({
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      englishName: '',
      classId,
      className,
      avatar: RANDOM_AVATARS[(existingCount + idx) % RANDOM_AVATARS.length],
      rollNumber: String(existingCount + idx + 1).padStart(2, '0'),
      password: '123',
      createdAt: new Date().toISOString()
    }));

  saveStudents([...current, ...newStudents]);
  return newStudents;
};

export const batchAddStudentsWithDetails = (
  items: Array<{ name: string; englishName?: string; phone?: string; notes?: string; password?: string }>,
  classId: string,
  className: string
): Student[] => {
  const current = getStudents();
  const existingCount = current.filter(s => s.classId === classId).length;
  const newStudents: Student[] = items
    .map(it => ({
      name: it.name.trim(),
      englishName: (it.englishName || '').trim(),
      phone: (it.phone || '').trim(),
      notes: (it.notes || '').trim(),
      password: (it.password || '123').trim() || '123'
    }))
    .filter(it => it.name.length > 0)
    .map((item, idx) => ({
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: item.name,
      englishName: item.englishName,
      phone: item.phone,
      classId,
      className,
      avatar: RANDOM_AVATARS[(existingCount + idx) % RANDOM_AVATARS.length],
      rollNumber: String(existingCount + idx + 1).padStart(2, '0'),
      notes: item.notes,
      password: item.password,
      createdAt: new Date().toISOString()
    }));

  saveStudents([...current, ...newStudents]);
  return newStudents;
};

export const updateStudent = (id: string, updates: Partial<Student>): void => {
  const current = getStudents();
  const updated = current.map(s => s.id === id ? { ...s, ...updates } : s);
  saveStudents(updated);
};

export const deleteStudent = (id: string): void => {
  const current = getStudents();
  const updated = current.filter(s => s.id !== id);
  saveStudents(updated);
};

const DEFAULT_SAMPLE_LESSON: LessonPlan = {
  topic: "Unit 1: My New School",
  vocabulary: [
    { word: "school bag", emoji: "🎒", ipa: "/ˈskuːl bæɡ/", meaning: "cặp sách", example: "I have a new school bag.", sentenceMeaning: "tôi có một chiếc cặp sách mới.", type: "noun" },
    { word: "calculator", emoji: "🔢", ipa: "/ˈkælkjuleɪtə/", meaning: "máy tính cầm tay", example: "She uses a calculator in maths.", sentenceMeaning: "cô ấy dùng máy tính trong giờ toán.", type: "noun" },
    { word: "pencil sharpener", emoji: "✏️", ipa: "/ˈpensl ʃɑːpnə/", meaning: "gọt bút chì", example: "This is my pencil sharpener.", sentenceMeaning: "đây là chiếc gọt bút chì của tôi.", type: "noun" },
    { word: "compass", emoji: "🧭", ipa: "/ˈkʌmpəs/", meaning: "com-pa", example: "We draw circles with a compass.", sentenceMeaning: "chúng tôi vẽ hình tròn bằng com-pa.", type: "noun" },
    { word: "uniform", emoji: "👔", ipa: "/ˈjuːnɪfɔːm/", meaning: "đồng phục", example: "Students wear uniform on Mondays.", sentenceMeaning: "học sinh mặc đồng phục vào thứ hai.", type: "noun" },
    { word: "classmate", emoji: "🤝", ipa: "/ˈklɑːsmeɪt/", meaning: "bạn cùng lớp", example: "Nam is my favourite classmate.", sentenceMeaning: "nam là bạn cùng lớp yêu thích của tôi.", type: "noun" },
  ],
  grammar: {
    topic: "The Present Simple Tense (Thì hiện tại đơn)",
    explanation: "Thì hiện tại đơn diễn tả hành động lặp đi lặp lại hoặc sự thật hiển nhiên. Với ngôi He/She/It, động từ thêm 's' hoặc 'es'.",
    examples: [
      "I go to school every morning. → Tôi đi học mỗi buổi sáng.",
      "She wears her uniform on Monday. → Cô ấy mặc đồng phục vào thứ Hai.",
      "They play football in the playground. → Họ chơi bóng đá ở sân trường."
    ]
  },
  reading: {
    title: "Lan's New School",
    passage: "Hello! My name is Lan. I am eleven years old. Today is my first day at my new school. The school is big and beautiful. I wear my new uniform and carry my school bag. I have many new classmates. We are very excited!",
    translation: "Xin chào! Mình tên là Lan. Mình 11 tuổi. Hôm nay là ngày đầu tiên ở trường mới của mình. Ngôi trường to và rất đẹp. Mình mặc đồng phục mới và mang cặp sách. Mình có nhiều bạn cùng lớp mới. Chúng mình rất hào hứng!",
    comprehension: [
      { id: "comp_1", question: "How old is Lan?", options: ["Ten", "Eleven", "Twelve", "Nine"], correctAnswer: 1, explanation: "Trong bài: 'I am eleven years old.' (Lan 11 tuổi)" },
      { id: "comp_2", question: "How is Lan's new school?", options: ["Small and old", "Big and beautiful", "Noisy", "Crowded"], correctAnswer: 1, explanation: "Trong bài: 'The school is big and beautiful.'" },
      { id: "comp_3", question: "What does Lan wear today?", options: ["A dress", "Her new uniform", "Jeans", "A jacket"], correctAnswer: 1, explanation: "Trong bài: 'I wear my new uniform.'" },
      { id: "comp_4", question: "What does Lan carry?", options: ["A book", "Her school bag", "A lunch box", "A bottle"], correctAnswer: 1, explanation: "Trong bài: 'and carry my school bag.'" },
      { id: "comp_5", question: "How do the students feel?", options: ["Tired", "Sad", "Very excited", "Bored"], correctAnswer: 2, explanation: "Trong bài: 'We are very excited!'" }
    ]
  },
  homework: {
    title: "Ôn tập Unit 1",
    description: "Học thuộc 6 từ vựng và làm đầy đủ bài tập MegaChallenge",
    instructions: "Làm bài trực tuyến trên app Mrs. Dung"
  },
  teacherTips: "Khuyến khích các con nghe phát âm chuẩn bằng cách bấm vào biểu tượng loa cạnh từng từ vựng.",
  practice: {
    listening: [
      { id: "lis_1", audioText: "I have a new school bag.", options: ["I have a new school bag.", "I have an old school bag.", "She has a new school bag.", "I have a big school bag."], correctAnswer: 0, explanation: "Câu đọc: 'I have a new school bag.'" },
      { id: "lis_2", audioText: "Students wear uniform on Mondays.", options: ["Students wear uniform on Sundays.", "Students wear uniform on Mondays.", "Students buy uniform on Mondays.", "Teachers wear uniform on Mondays."], correctAnswer: 1, explanation: "Câu đọc: 'Students wear uniform on Mondays.'" },
      { id: "lis_3", audioText: "Nam is my favourite classmate.", options: ["Nam is my favourite classmate.", "Lan is my favourite classmate.", "Nam is my friendly classmate.", "Nam is my new teacher."], correctAnswer: 0, explanation: "Câu đọc: 'Nam is my favourite classmate.'" },
      { id: "lis_4", audioText: "We draw circles with a compass.", options: ["We draw squares with a ruler.", "We draw circles with a pencil.", "We draw circles with a compass.", "We draw flowers with a brush."], correctAnswer: 2, explanation: "Câu đọc: 'We draw circles with a compass.'" },
      { id: "lis_5", audioText: "She uses a calculator in maths.", options: ["She uses a calculator in maths.", "He uses a calculator in physics.", "She loses a calculator in class.", "She needs a computer in maths."], correctAnswer: 0, explanation: "Câu đọc: 'She uses a calculator in maths.'" }
    ],
    megaTest: {
      multipleChoice: [
        { id: "mc_1", question: "I put my books in my ____.", options: ["school bag", "calculator", "compass", "uniform"], correctAnswer: 0, explanation: "school bag = cặp sách (đựng sách)" },
        { id: "mc_2", question: "She ____ to school every morning.", options: ["go", "goes", "going", "went"], correctAnswer: 1, explanation: "Chủ ngữ ngôi 3 số ít 'She' chia động từ thêm 'es' (goes)" },
        { id: "mc_3", question: "Students wear ____ to school every Monday.", options: ["uniform", "compass", "sharpener", "calculator"], correctAnswer: 0, explanation: "uniform = đồng phục" },
        { id: "mc_4", question: "We use a ____ to draw circles.", options: ["compass", "bag", "pencil", "book"], correctAnswer: 0, explanation: "compass = com-pa dùng để vẽ đường tròn" },
        { id: "mc_5", question: "Nam is my ____. We are in the same class.", options: ["classmate", "brother", "teacher", "parent"], correctAnswer: 0, explanation: "classmate = bạn cùng lớp" },
        { id: "mc_6", question: "She uses a ____ to do difficult math calculations.", options: ["calculator", "compass", "bag", "ruler"], correctAnswer: 0, explanation: "calculator = máy tính bỏ túi" },
        { id: "mc_7", question: "My pencil is broken. I need a pencil ____.", options: ["sharpener", "case", "bag", "box"], correctAnswer: 0, explanation: "pencil sharpener = gọt bút chì" },
        { id: "mc_8", question: "They ____ football after school.", options: ["plays", "play", "playing", "played"], correctAnswer: 1, explanation: "Chủ ngữ 'They' số nhiều nên động từ 'play' giữ nguyên mẫu" },
        { id: "mc_9", question: "Is your new school ____ and beautiful?", options: ["big", "bigness", "bigly", "bigger"], correctAnswer: 0, explanation: "Dùng tính từ 'big' sau động từ to be" },
        { id: "mc_10", question: "We are very ____ on the first day of school.", options: ["excited", "exciting", "excite", "excitement"], correctAnswer: 0, explanation: "excited (tính từ chỉ cảm xúc hào hứng của con người)" }
      ],
      scramble: [
        { id: "sc_1", scrambled: ["new", "a", "have", "I", "school", "bag."], correctSentence: "I have a new school bag.", translation: "Tôi có một chiếc cặp sách mới." },
        { id: "sc_2", scrambled: ["wears", "She", "uniform.", "her"], correctSentence: "She wears her uniform.", translation: "Cô ấy mặc đồng phục của mình." },
        { id: "sc_3", scrambled: ["is", "Nam", "classmate.", "my"], correctSentence: "Nam is my classmate.", translation: "Nam là bạn cùng lớp của tôi." },
        { id: "sc_4", scrambled: ["draw", "We", "a", "circles", "with", "compass."], correctSentence: "We draw circles with a compass.", translation: "Chúng tôi vẽ hình tròn bằng com-pa." },
        { id: "sc_5", scrambled: ["beautiful.", "new", "My", "is", "school"], correctSentence: "My new school is beautiful.", translation: "Ngôi trường mới của tôi rất đẹp." },
        { id: "sc_6", scrambled: ["pencil", "need", "I", "sharpener.", "a"], correctSentence: "I need a pencil sharpener.", translation: "Tôi cần một cái gọt bút chì." },
        { id: "sc_7", scrambled: ["uses", "He", "a", "calculator.", "maths"], correctSentence: "He uses a maths calculator.", translation: "Cậu ấy dùng một máy tính toán." },
        { id: "sc_8", scrambled: ["play", "They", "the", "in", "playground."], correctSentence: "They play in the playground.", translation: "Họ chơi ở sân trường." },
        { id: "sc_9", scrambled: ["love", "my", "I", "school.", "new"], correctSentence: "I love my new school.", translation: "Tôi yêu trường mới của mình." },
        { id: "sc_10", scrambled: ["excited", "Students", "are", "very."], correctSentence: "Students are very excited.", translation: "Học sinh rất hào hứng." }
      ],
      fillBlank: [
        { id: "fb_1", question: "I put my pencil in my school ____.", correctAnswer: "bag", clueEmoji: "🎒", explanation: "school bag (cặp sách)" },
        { id: "fb_2", question: "Students wear a ____ on Mondays.", correctAnswer: "uniform", clueEmoji: "👔", explanation: "uniform (đồng phục)" },
        { id: "fb_3", question: "Nam is my friendly ____ in class 6A1.", correctAnswer: "classmate", clueEmoji: "🤝", explanation: "classmate (bạn cùng lớp)" },
        { id: "fb_4", question: "We draw circles with a ____.", correctAnswer: "compass", clueEmoji: "🧭", explanation: "compass (com-pa)" },
        { id: "fb_5", question: "I use a pencil ____ to sharpen my pencil.", correctAnswer: "sharpener", clueEmoji: "✏️", explanation: "pencil sharpener (gọt bút chì)" },
        { id: "fb_6", question: "She calculates numbers using a ____.", correctAnswer: "calculator", clueEmoji: "🔢", explanation: "calculator (máy tính bỏ túi)" },
        { id: "fb_7", question: "My new school is big and ____.", correctAnswer: "beautiful", clueEmoji: "🏫", explanation: "beautiful (xinh đẹp)" },
        { id: "fb_8", question: "She ____ her new uniform today.", correctAnswer: "wears", clueEmoji: "👗", explanation: "wears (mặc)" },
        { id: "fb_9", question: "We are very ____ about the new school year.", correctAnswer: "excited", clueEmoji: "😊", explanation: "excited (hào hứng)" },
        { id: "fb_10", question: "They ____ football every afternoon.", correctAnswer: "play", clueEmoji: "⚽", explanation: "play (chơi thể thao)" }
      ],
      vocabTranslation: [
        { id: "vt_1", word: "school bag", options: ["cặp sách", "bút chì", "thước kẻ", "com-pa"], correctAnswer: 0 },
        { id: "vt_2", word: "uniform", options: ["áo khoác", "quần bò", "đồng phục", "giày thể thao"], correctAnswer: 2 },
        { id: "vt_3", word: "calculator", options: ["máy vi tính", "máy tính cầm tay", "đồng hồ", "điện thoại"], correctAnswer: 1 },
        { id: "vt_4", word: "compass", options: ["thước kẻ", "com-pa", "hộp bút", "tẩy"], correctAnswer: 1 },
        { id: "vt_5", word: "pencil sharpener", options: ["gọt bút chì", "bút dạ", "bút máy", "kéo"], correctAnswer: 0 },
        { id: "vt_6", word: "classmate", options: ["thầy giáo", "bạn cùng lớp", "anh em", "hàng xóm"], correctAnswer: 1 },
        { id: "vt_7", word: "excited", options: ["buồn bã", "mệt mỏi", "hào hứng, phấn khởi", "lo lắng"], correctAnswer: 2 },
        { id: "vt_8", word: "playground", options: ["phòng học", "sân chơi, sân trường", "thư viện", "căng tin"], correctAnswer: 1 },
        { id: "vt_9", word: "beautiful", options: ["xinh đẹp, đẹp đẽ", "xấu xí", "to lớn", "nhỏ nhắn"], correctAnswer: 0 },
        { id: "vt_10", word: "subject", options: ["môn học", "trường học", "bài thi", "điểm số"], correctAnswer: 0 }
      ],
      trueFalsePassage: "Lan is eleven years old. Today is her first day at her new school. The school is big and beautiful. She wears her new uniform and carries a new school bag. Lan has many friendly classmates. She loves her new school very much.",
      trueFalse: [
        { id: "tf_1", statement: "Lan is twelve years old.", isTrue: false, explanation: "Trong đoạn văn: 'Lan is eleven years old.' (Lan 11 tuổi, không phải 12)" },
        { id: "tf_2", statement: "Today is Lan's first day at her new school.", isTrue: true, explanation: "Trong đoạn văn: 'Today is her first day at her new school.'" },
        { id: "tf_3", statement: "Her new school is small and old.", isTrue: false, explanation: "Trong đoạn văn: 'The school is big and beautiful.'" },
        { id: "tf_4", statement: "Lan wears her new uniform.", isTrue: true, explanation: "Trong đoạn văn: 'She wears her new uniform.'" },
        { id: "tf_5", statement: "Lan hates her new school.", isTrue: false, explanation: "Trong đoạn văn: 'She loves her new school very much.'" }
      ],
      matching: [
        { id: "m_1", left: "school bag", right: "cặp sách" },
        { id: "m_2", left: "uniform", right: "đồng phục" },
        { id: "m_3", left: "calculator", right: "máy tính cầm tay" },
        { id: "m_4", left: "compass", right: "com-pa" },
        { id: "m_5", left: "classmate", right: "bạn cùng lớp" },
        { id: "m_6", left: "pencil sharpener", right: "gọt bút chì" },
        { id: "m_7", left: "playground", right: "sân trường" },
        { id: "m_8", left: "excited", right: "hào hứng" },
        { id: "m_9", left: "beautiful", right: "xinh đẹp" },
        { id: "m_10", left: "wear", right: "mặc (trang phục)" }
      ]
    }
  }
};

const getTomorrowISO = (): string => {
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  tmr.setHours(23, 59, 0, 0);
  return tmr.toISOString();
};

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign_unit1_school',
    title: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    assignedDate: getTodayString(),
    dueDate: getTomorrowISO(),
    targetClassId: 'ALL',
    targetClassName: 'Tất cả các lớp',
    teacherNote: 'Các con làm bài cẩn thận, xem kỹ phần giải thích đáp án và nộp trước 23:59 ngày mai nhé!',
    lessonPlan: DEFAULT_SAMPLE_LESSON,
    createdAt: new Date().toISOString()
  }
];

// ==================== ASSIGNMENT MANAGEMENT ====================
export const getAssignments = (classId?: string): Assignment[] => {
  if (typeof window === 'undefined') return DEFAULT_ASSIGNMENTS;
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!raw) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    const all: Assignment[] = JSON.parse(raw);
    if (!Array.isArray(all) || all.length === 0) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }

    // Auto-repair any assignments that may have had empty or incomplete exercises
    const sanitizedAll: Assignment[] = all.map(a => {
      const mega = a.lessonPlan?.practice?.megaTest;
      const mcCount = mega?.multipleChoice?.length || 0;
      const fillCount = mega?.fillBlank?.length || 0;
      const scrambleCount = mega?.scramble?.length || 0;
      const vocabCount = mega?.vocabTranslation?.length || 0;
      const tfCount = mega?.trueFalse?.length || 0;
      const lisCount = a.lessonPlan?.practice?.listening?.length || 0;

      // If all megaTest exercises are 0 or missing, synthesize them from core lesson
      if (!a.lessonPlan?.practice || !mega || (mcCount === 0 && fillCount === 0 && scrambleCount === 0 && vocabCount === 0 && tfCount === 0)) {
        return {
          ...a,
          lessonPlan: {
            ...a.lessonPlan,
            practice: ensureCompletePracticeContent(a.lessonPlan?.practice, a.lessonPlan || {})
          }
        };
      }
      return a;
    });

    // Multi-class filter: match if targeted for ALL, specific class ID, specific class name, or in targetClassIds / targetClassNames
    const filtered = (classId && classId !== 'ALL')
      ? sanitizedAll.filter(a => {
          if (a.targetClassId === 'ALL') return true;
          if (a.targetClassId === classId) return true;
          if (a.targetClassName === classId) return true;
          if (Array.isArray(a.targetClassIds) && (a.targetClassIds.includes(classId) || a.targetClassIds.includes('ALL'))) return true;
          if (Array.isArray(a.targetClassNames) && a.targetClassNames.includes(classId)) return true;
          if (a.targetClassName && a.targetClassName.includes(classId)) return true;
          return false;
        })
      : sanitizedAll;

    // Sort newest first by assignedDate or createdAt
    return filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.assignedDate).getTime();
      const timeB = new Date(b.createdAt || b.assignedDate).getTime();
      return timeB - timeA;
    });
  } catch {
    return DEFAULT_ASSIGNMENTS;
  }
};

export const getAssignmentById = (id: string): Assignment | undefined => {
  const all = getAssignments();
  return all.find(a => a.id === id);
};

export const saveAssignment = (assignment: Assignment): void => {
  if (typeof window === 'undefined') return;

  // Guarantee that practice content has complete non-empty exercises before saving
  const safeLessonPlan: LessonPlan = {
    ...assignment.lessonPlan,
    practice: ensureCompletePracticeContent(assignment.lessonPlan?.practice, assignment.lessonPlan || {})
  };

  const safeAssignment: Assignment = {
    ...assignment,
    lessonPlan: safeLessonPlan
  };

  const all = getAssignments();
  const exists = all.some(a => a.id === safeAssignment.id);
  const updated = exists ? all.map(a => a.id === safeAssignment.id ? safeAssignment : a) : [safeAssignment, ...all];
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(updated));
  notifySync('assignment_created', safeAssignment);
  syncToFirebaseIfConfigured('assignments', updated);
};

export const deleteAssignment = (id: string): void => {
  if (typeof window === 'undefined') return;
  const all = getAssignments();
  const updated = all.filter(a => a.id !== id);
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(updated));
  notifySync('assignment_deleted', { id });
  syncToFirebaseIfConfigured('assignments', updated);
};

// ==================== DEADLINE STATUS CALCULATION ====================
export interface DeadlineInfo {
  status: DeadlineStatus;
  label: string;
  badgeClass: string;
  remainingText: string;
  isExpired: boolean;
  isDueSoon: boolean;
}

export const calculateDeadlineStatus = (dueDateStr: string, hasSubmitted = false): DeadlineInfo => {
  if (hasSubmitted) {
    return {
      status: 'submitted',
      label: 'Đã hoàn thành',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200',
      remainingText: 'Đã nộp bài thành công',
      isExpired: false,
      isDueSoon: false
    };
  }

  if (!dueDateStr) {
    return {
      status: 'active',
      label: 'Còn thời hạn',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
      remainingText: 'Không giới hạn thời gian',
      isExpired: false,
      isDueSoon: false
    };
  }

  const now = Date.now();
  const due = new Date(dueDateStr).getTime();
  const diffMs = due - now;

  if (diffMs <= 0) {
    return {
      status: 'expired',
      label: 'Hết hạn',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200',
      remainingText: 'Đã quá hạn nộp bài',
      isExpired: true,
      isDueSoon: false
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  let timeString = '';
  if (diffDays > 0) {
    timeString = `Còn ${diffDays} ngày ${remainingHours > 0 ? remainingHours + ' giờ' : ''}`;
  } else {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    timeString = `Còn ${diffHours} giờ ${diffMinutes} phút`;
  }

  // If less than 24 hours remaining -> Due Soon (Sắp hết hạn)
  if (diffHours < 24) {
    return {
      status: 'due_soon',
      label: 'Sắp hết hạn',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-300 animate-pulse',
      remainingText: timeString,
      isExpired: false,
      isDueSoon: true
    };
  }

  return {
    status: 'active',
    label: 'Còn thời hạn',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    remainingText: timeString,
    isExpired: false,
    isDueSoon: false
  };
};

const DEFAULT_SUBMISSIONS: Submission[] = [
  {
    id: 'sub_seed_1',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_1',
    studentName: 'Nguyễn Minh Anh',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    score: 10.0,
    totalCorrect: 10,
    totalQuestions: 10,
    skillScores: { mc: 10, scramble: 10, fill: 10, vocab: 10, tf: 10, listen: 10 },
    evaluation: {
      text: 'Xuất sắc tuyệt đối! Con làm bài rất nhanh và chuẩn xác.',
      emoji: '🌟',
      level: 'Xuất sắc',
      praise: 'Thủ khoa chăm chỉ đạt điểm 10 tuyệt đối!'
    },
    teacherFeedback: 'Cô Dung khen Minh Anh rất nhiều, tiếp tục phát huy con nhé! ❤️'
  },
  {
    id: 'sub_seed_2',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_13',
    studentName: 'Lê Gia Hân',
    studentClass: 'Lớp 7B1',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    score: 9.8,
    totalCorrect: 10,
    totalQuestions: 10,
    skillScores: { mc: 10, scramble: 10, fill: 9.5, vocab: 10, tf: 10, listen: 9.5 },
    evaluation: {
      text: 'Rất xuất sắc! Kiến thức ngữ pháp và từ vựng rất vững.',
      emoji: '👑',
      level: 'Xuất sắc',
      praise: 'Ngôi sao chăm chỉ dẫn đầu Lớp 7B1!'
    },
    teacherFeedback: 'Bài làm rất cẩn thận, phát âm rất chuẩn.'
  },
  {
    id: 'sub_seed_3',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_16',
    studentName: 'Nguyễn Thành Trung',
    studentClass: 'Lớp 8A1',
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    score: 9.7,
    totalCorrect: 10,
    totalQuestions: 10,
    skillScores: { mc: 10, scramble: 9.5, fill: 10, vocab: 9.5, tf: 10, listen: 9.5 },
    evaluation: {
      text: 'Làm bài xuất sắc, nắm chắc thì hiện tại đơn.',
      emoji: '⭐',
      level: 'Xuất sắc',
      praise: 'Thành tích xuất sắc Lớp 8A1!'
    },
    teacherFeedback: 'Cô khen ngợi tinh thần tự giác học tập của Trung!'
  },
  {
    id: 'sub_seed_4',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_2',
    studentName: 'Trần Bảo Nam',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    score: 9.5,
    totalCorrect: 9,
    totalQuestions: 10,
    skillScores: { mc: 10, scramble: 9, fill: 10, vocab: 9.5, tf: 9.5, listen: 9 },
    evaluation: {
      text: 'Rất chăm chỉ! Câu cú dịch nghĩa mạch lạc.',
      emoji: '🚀',
      level: 'Giỏi',
      praise: 'Học sinh chăm chỉ tiêu biểu Lớp 6A1!'
    },
    teacherFeedback: 'Bảo Nam tiến bộ rất nhiều, con cố gắng giữ vững phong độ nhé!'
  },
  {
    id: 'sub_seed_5',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_3',
    studentName: 'Lê Phương Linh',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    score: 9.5,
    totalCorrect: 9,
    totalQuestions: 10,
    skillScores: { mc: 9.5, scramble: 9.5, fill: 9.5, vocab: 10, tf: 9, listen: 9.5 },
    evaluation: {
      text: 'Từ vựng rất phong phú, làm bài tỉ mỉ.',
      emoji: '🌸',
      level: 'Giỏi',
      praise: 'Top học sinh xuất sắc lớp 6A1!'
    },
    teacherFeedback: 'Rất đáng khen ngợi! Cô tin Linh sẽ đạt kết quả cao.'
  },
  {
    id: 'sub_seed_6',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_9',
    studentName: 'Nguyễn Hoàng Yến',
    studentClass: 'Lớp 6A2',
    submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    score: 9.3,
    totalCorrect: 9,
    totalQuestions: 10,
    skillScores: { mc: 9, scramble: 9, fill: 9.5, vocab: 10, tf: 9, listen: 9.5 },
    evaluation: {
      text: 'Rất tốt! Tiến bộ vượt bậc trong tuần này.',
      emoji: '🐱',
      level: 'Giỏi',
      praise: 'Dẫn đầu thành tích Lớp 6A2!'
    },
    teacherFeedback: 'Hoàng Yến học rất chăm chỉ, phát âm chuẩn.'
  },
  {
    id: 'sub_seed_7',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_5',
    studentName: 'Hoàng Mai Chi',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    score: 9.0,
    totalCorrect: 9,
    totalQuestions: 10,
    skillScores: { mc: 9, scramble: 9, fill: 9, vocab: 9, tf: 9, listen: 9 },
    evaluation: {
      text: 'Nghe rất tốt, bài làm đạt điểm giỏi.',
      emoji: '🦄',
      level: 'Giỏi',
      praise: 'Học sinh chăm chỉ đạt điểm giỏi!'
    },
    teacherFeedback: 'Mai Chi nghe rất nhạy, cô chúc mừng con!'
  },
  {
    id: 'sub_seed_8',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_4',
    studentName: 'Phạm Gia Huy',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    score: 8.8,
    totalCorrect: 9,
    totalQuestions: 10,
    skillScores: { mc: 9, scramble: 8.5, fill: 9, vocab: 9, tf: 8.5, listen: 9 },
    evaluation: {
      text: 'Phát âm và từ vựng tốt.',
      emoji: '⚡',
      level: 'Giỏi',
      praise: 'Nỗ lực xuất sắc!'
    },
    teacherFeedback: 'Cố gắng rèn thêm phần sắp xếp câu con nhé!'
  },
  {
    id: 'sub_seed_9',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_10',
    studentName: 'Đỗ Tiến Đạt',
    studentClass: 'Lớp 6A2',
    submittedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    score: 8.5,
    totalCorrect: 8,
    totalQuestions: 10,
    skillScores: { mc: 8.5, scramble: 8.5, fill: 8.5, vocab: 8.5, tf: 8.5, listen: 8.5 },
    evaluation: {
      text: 'Bài làm tốt, có tinh thần tự giác cao.',
      emoji: '⚽',
      level: 'Khá Giỏi',
      praise: 'Học sinh tiến bộ nhanh!'
    },
    teacherFeedback: 'Tiến Đạt đã có nhiều tiến bộ so với tuần trước.'
  },
  {
    id: 'sub_seed_10',
    assignmentId: 'assign_unit1_school',
    assignmentTitle: 'Unit 1: My New School (Từ vựng & Ngữ pháp)',
    topic: 'My New School',
    studentId: 'std_7',
    studentName: 'Đặng Thùy Dương',
    studentClass: 'Lớp 6A1',
    submittedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    score: 8.3,
    totalCorrect: 8,
    totalQuestions: 10,
    skillScores: { mc: 8.5, scramble: 8, fill: 8.5, vocab: 8.5, tf: 8, listen: 8.5 },
    evaluation: {
      text: 'Con làm bài cẩn thận, chăm chỉ.',
      emoji: '🌻',
      level: 'Khá Giỏi',
      praise: 'Tự giác hoàn thành bài tập sớm!'
    },
    teacherFeedback: 'Thùy Dương rất chăm ngoan!'
  }
];

// ==================== SUBMISSIONS MANAGEMENT ====================
export const getSubmissions = (assignmentId?: string): Submission[] => {
  if (typeof window === 'undefined') return DEFAULT_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    let all: Submission[] = [];
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        all = parsed;
      } else if (!isDataCleaned()) {
        all = DEFAULT_SUBMISSIONS;
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
      } else {
        all = [];
      }
    } else if (!isDataCleaned()) {
      all = DEFAULT_SUBMISSIONS;
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
    }
    const filtered = assignmentId ? all.filter(s => s.assignmentId === assignmentId) : all;
    return filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch {
    return [];
  }
};

export interface RealLearningStats {
  totalVisits: number;
  todayVisits: number;
  myVisits: number;
  activeStudentsCount: number;
  averageScore: number;
}

export const getRealLearningStats = (currentStudentName?: string): RealLearningStats => {
  const submissions = getSubmissions();
  const todayStr = getTodayString();

  // Also include lesson practice history
  let historyRecords: any[] = [];
  try {
    const rawHistory = localStorage.getItem('lesson_history');
    if (rawHistory) {
      historyRecords = JSON.parse(rawHistory) || [];
    }
  } catch {}

  const totalSubmissions = submissions.length;
  const totalHistory = historyRecords.length;
  const totalVisits = totalSubmissions + totalHistory;

  const todaySubmissions = submissions.filter(s => (s.submittedAt || '').startsWith(todayStr)).length;
  const todayHistory = historyRecords.filter((r: any) => (r.date || '').startsWith(todayStr)).length;
  const todayVisits = todaySubmissions + todayHistory;

  const uniqueStudents = new Set(submissions.map(s => s.studentName.trim().toLowerCase())).size;

  let myVisits = 0;
  if (currentStudentName && currentStudentName.trim()) {
    const cleanCurrent = currentStudentName.trim().toLowerCase();
    const mySubs = submissions.filter(s => s.studentName.trim().toLowerCase() === cleanCurrent).length;
    myVisits = mySubs;
  } else {
    myVisits = uniqueStudents;
  }

  const scores = submissions.map(s => s.score);
  const averageScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  return {
    totalVisits,
    todayVisits,
    myVisits,
    activeStudentsCount: uniqueStudents,
    averageScore
  };
};

export const getStudentSubmission = (assignmentId: string, studentName: string): Submission | undefined => {
  const submissions = getSubmissions(assignmentId);
  const cleanName = studentName.trim().toLowerCase();
  return submissions.find(s => s.studentName.trim().toLowerCase() === cleanName);
};

export const saveSubmission = (submission: Submission): void => {
  if (typeof window === 'undefined') return;
  const all = getSubmissions();
  // Filter out any prior submission by the same student for the same assignment (allow retake/latest submission)
  const other = all.filter(s => !(s.assignmentId === submission.assignmentId && s.studentName.trim().toLowerCase() === submission.studentName.trim().toLowerCase()));
  const updated = [submission, ...other];
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
  notifySync('submission_created', submission);
  syncToFirebaseIfConfigured('submissions', updated);
};

// ==================== DAILY SUMMARY & HIGH PERFORMERS ====================
export const getDailySubmissions = (dateStr?: string, classId?: string): Submission[] => {
  const all = getSubmissions();
  const targetDate = dateStr || getTodayString();

  return all.filter(s => {
    const subDate = (s.submittedAt || '').split('T')[0];
    const matchDate = !dateStr || subDate === targetDate;
    const matchClass = !classId || classId === 'ALL' || s.studentClass === classId;
    return matchDate && matchClass;
  });
};

export const getDailySummary = (dateStr?: string, classId?: string, assignmentId?: string): DailySummary => {
  const targetDate = dateStr || getTodayString();
  let subs = getSubmissions();

  if (assignmentId && assignmentId !== 'ALL') {
    subs = subs.filter(s => s.assignmentId === assignmentId);
  }

  if (dateStr && dateStr !== 'ALL') {
    subs = subs.filter(s => (s.submittedAt || '').split('T')[0] === targetDate);
  }

  if (classId && classId !== 'ALL') {
    subs = subs.filter(s => s.studentClass.toLowerCase().includes(classId.toLowerCase()) || s.studentClass === classId);
  }

  const totalSubmitted = subs.length;
  const scores = subs.map(s => s.score);
  const averageScore = totalSubmitted > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / totalSubmitted) * 10) / 10 : 0;
  const highestScore = totalSubmitted > 0 ? Math.max(...scores) : 0;
  const lowestScore = totalSubmitted > 0 ? Math.min(...scores) : 0;

  // Total students expected
  const students = getStudents(classId && classId !== 'ALL' ? classId : undefined);
  const totalAssigned = students.length || totalSubmitted;
  const submissionRate = totalAssigned > 0 ? Math.min(100, Math.round((totalSubmitted / totalAssigned) * 100)) : 0;

  return {
    date: targetDate,
    totalAssigned,
    totalSubmitted,
    averageScore,
    highestScore,
    lowestScore,
    submissionRate,
    submissions: subs
  };
};

/**
 * Filter & sort students with high performance (>= 8.0)
 * Returns top performers with rank badge
 */
export interface TopPerformer extends Submission {
  rank: number;
  rankBadge: string;
  isPerfect: boolean;
}

export const getTopPerformers = (submissions: Submission[], threshold = 8.0): TopPerformer[] => {
  // Sort descending by score, then by totalCorrect, then by earliest submittedAt
  const sorted = [...submissions]
    .filter(s => s.score >= threshold)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

  return sorted.map((s, index) => {
    const rank = index + 1;
    let rankBadge = '⭐';
    if (rank === 1) rankBadge = '🥇 Top 1';
    else if (rank === 2) rankBadge = '🥈 Top 2';
    else if (rank === 3) rankBadge = '🥉 Top 3';
    else rankBadge = `⭐ #${rank}`;

    return {
      ...s,
      rank,
      rankBadge,
      isPerfect: s.score >= 9.5
    };
  });
};

/**
 * Initialize cloud sync with Firebase:
 * 1. Seeds Firebase if the cloud database is empty.
 * 2. Pulls latest data from Firebase (classes, students, assignments, submissions).
 * 3. Starts background interval polling (every 30s) to keep multi-device data in sync.
 */
export const initCloudSync = (): (() => void) => {
  let isMounted = true;

  const doSync = async () => {
    try {
      // Seed if empty
      await seedFirebaseIfEmpty({
        classes: getClasses(),
        students: getStudents(),
        assignments: getAssignments(),
        submissions: getSubmissions()
      });

      // Pull latest
      const updated = await pullAllFromFirebase();
      if (updated && isMounted) {
        notifySync('cloud_sync_completed');
      }
    } catch (e) {
      console.warn('Initial cloud sync error:', e);
    }
  };

  // Run initial sync
  doSync();

  // Background polling every 30 seconds for live updates across devices
  const timer = setInterval(async () => {
    if (!isMounted) return;
    try {
      const updated = await pullAllFromFirebase();
      if (updated && isMounted) {
        notifySync('cloud_sync_completed');
      }
    } catch (e) {
      // Quiet catch
    }
  }, 30000);

  return () => {
    isMounted = false;
    clearInterval(timer);
  };
};

// ==================== MONTHLY REPORT MANAGEMENT ====================
export const getMonthlyReports = (classId?: string): MonthlyReport[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MONTHLY_REPORTS_KEY);
    if (!raw) return [];
    const all: MonthlyReport[] = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    if (classId && classId !== 'ALL') {
      return all.filter(r => r.classId === classId);
    }
    return all;
  } catch {
    return [];
  }
};

export const getMonthlyReport = (classId: string, month: number, year: number): MonthlyReport | undefined => {
  const all = getMonthlyReports();
  return all.find(r => r.classId === classId && r.month === month && r.year === year);
};

export const saveMonthlyReport = (report: MonthlyReport): void => {
  if (typeof window === 'undefined') return;
  const all = getMonthlyReports();
  const exists = all.some(r => r.id === report.id);
  const updated = exists ? all.map(r => r.id === report.id ? report : r) : [report, ...all];
  localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify(updated));
  notifySync('monthly_report_updated', report);
  syncToFirebaseIfConfigured('monthly_reports', updated);
};

export const deleteMonthlyReport = (id: string): void => {
  if (typeof window === 'undefined') return;
  const all = getMonthlyReports();
  const updated = all.filter(r => r.id !== id);
  localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify(updated));
  notifySync('monthly_report_deleted', { id });
  syncToFirebaseIfConfigured('monthly_reports', updated);
};

/**
 * Calculate arithmetic mean of valid scores (excluding 'x' and empty strings)
 * Rounded to 2 decimal places.
 */
export const calculateStudentMonthlyAverage = (
  scores: Record<string, Record<string, number | 'x' | ''>>
): number => {
  const numericScores: number[] = [];
  if (!scores) return 0;
  Object.values(scores).forEach(sessionCols => {
    if (!sessionCols) return;
    Object.values(sessionCols).forEach(val => {
      if (typeof val === 'number' && !isNaN(val)) {
        numericScores.push(val);
      }
    });
  });

  if (numericScores.length === 0) return 0;
  const sum = numericScores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / numericScores.length) * 100) / 100;
};

// ==================== WEEKLY REPORT AGGREGATOR ====================
export const getWeeklyReports = (classId?: string): WeeklyReportRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WEEKLY_REPORTS_KEY);
    if (!raw) return [];
    const all: WeeklyReportRecord[] = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    if (classId && classId !== 'ALL') {
      return all.filter(r => r.classId === classId);
    }
    return all;
  } catch {
    return [];
  }
};

export const getWeeklyReport = (
  classId: string,
  year: number,
  month: number,
  weekNumber: number
): WeeklyReportRecord | undefined => {
  const all = getWeeklyReports();
  return all.find(
    r => r.classId === classId && r.year === year && r.month === month && r.weekNumber === weekNumber
  );
};

export const saveWeeklyReport = (report: WeeklyReportRecord): void => {
  if (typeof window === 'undefined') return;
  const all = getWeeklyReports();
  const exists = all.some(r => r.id === report.id);
  const updated = exists ? all.map(r => (r.id === report.id ? report : r)) : [report, ...all];
  localStorage.setItem(WEEKLY_REPORTS_KEY, JSON.stringify(updated));
  notifySync('weekly_report_updated', report);
  syncToFirebaseIfConfigured('weekly_reports', updated);
};

export const deleteWeeklyReport = (id: string): void => {
  if (typeof window === 'undefined') return;
  const all = getWeeklyReports();
  const updated = all.filter(r => r.id !== id);
  localStorage.setItem(WEEKLY_REPORTS_KEY, JSON.stringify(updated));
  notifySync('weekly_report_deleted', { id });
  syncToFirebaseIfConfigured('weekly_reports', updated);
};

export const calculateStudentWeeklyAverage = (
  scores: Record<string, Record<string, number | 'x' | ''>>
): number => {
  return calculateStudentMonthlyAverage(scores);
};

// ==================== CLASS SCHEDULE MANAGEMENT ====================
export const getClassSchedules = (): ClassScheduleConfig[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLASS_SCHEDULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getClassSchedule = (classId: string): ClassScheduleConfig | null => {
  const all = getClassSchedules();
  return all.find(s => s.classId === classId) || null;
};

export const saveClassSchedule = (config: ClassScheduleConfig): void => {
  if (typeof window === 'undefined') return;
  const all = getClassSchedules();
  const exists = all.some(s => s.classId === config.classId);
  const updated = exists
    ? all.map(s => (s.classId === config.classId ? config : s))
    : [...all, config];
  localStorage.setItem(CLASS_SCHEDULES_KEY, JSON.stringify(updated));
  notifySync('class_schedule_updated', config);
  syncToFirebaseIfConfigured('class_schedules', updated);
};

export const deleteClassSchedule = (classId: string): void => {
  if (typeof window === 'undefined') return;
  const all = getClassSchedules();
  const updated = all.filter(s => s.classId !== classId);
  localStorage.setItem(CLASS_SCHEDULES_KEY, JSON.stringify(updated));
  notifySync('class_schedule_deleted', { classId });
  syncToFirebaseIfConfigured('class_schedules', updated);
};

// ==================== ATTENDANCE MANAGEMENT ====================
export const getAttendanceRecords = (classId?: string, date?: string): AttendanceRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
    if (!raw) return [];
    let list: AttendanceRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (classId && classId !== 'ALL') {
      list = list.filter(r => r.classId === classId);
    }
    if (date && date !== 'ALL') {
      list = list.filter(r => r.date === date);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
};

export const getAttendanceRecord = (classId: string, date: string): AttendanceRecord | null => {
  const records = getAttendanceRecords(classId);
  return records.find(r => r.date === date) || null;
};

export const saveAttendanceRecord = (record: AttendanceRecord): void => {
  if (typeof window === 'undefined') return;
  const all = getAttendanceRecords();
  const exists = all.some(r => r.id === record.id || (r.classId === record.classId && r.date === record.date));
  const updated = exists
    ? all.map(r => (r.id === record.id || (r.classId === record.classId && r.date === record.date) ? record : r))
    : [record, ...all];
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(updated));
  notifySync('attendance_record_updated', record);
  syncToFirebaseIfConfigured('attendance_records', updated);
};

export const deleteAttendanceRecord = (id: string): void => {
  if (typeof window === 'undefined') return;
  const all = getAttendanceRecords();
  const updated = all.filter(r => r.id !== id);
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(updated));
  notifySync('attendance_record_deleted', { id });
  syncToFirebaseIfConfigured('attendance_records', updated);
};



