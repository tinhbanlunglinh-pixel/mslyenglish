
export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface VocabularyItem {
  word: string;
  emoji: string;
  ipa: string;
  meaning: string;
  example: string;
  sentenceMeaning: string;
  type: string;
}

export interface GrammarSection {
  topic: string;
  explanation: string;
  examples: string[];
}

export interface ListeningQ {
  id: string;
  audioText: string;
  sentenceWithBlank?: string;            // Câu hoặc đoạn có ô trống, ví dụ "I have a new ______."
  missingWord?: string;                  // Từ cần điền vào ô trống, ví dụ "school bag"
  alternativeAnswers?: string[];         // Các từ đồng nghĩa hoặc cách viết khác hợp lệ
  options?: string[];                    // Tương thích ngược với bài tập cũ
  correctAnswer?: number;                // Tương thích ngược với bài tập cũ
  alternativeCorrectAnswers?: number[];  // Other correct option indices (grammar equivalents)
  explanation: string;
}

export interface MultipleChoiceQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  alternativeCorrectAnswers?: number[];  // Other correct option indices (grammar equivalents)
  explanation: string;
}

export interface SpeakingQ {
  id: string;
  question: string;
  suggestedAnswer: string;
}

export interface ScrambleQ {
  id: string;
  scrambled: string[];
  correctSentence: string;
  translation: string;
}

export interface FillInputQ {
  id: string;
  question: string;
  correctAnswer: string;
  alternativeAnswers?: string[];  // Alternative correct answers (e.g., ["though"] when correctAnswer is "although")
  clueEmoji: string;
  explanation?: string;
}

export interface ErrorIdQ {
  id: string;
  sentence: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface VocabTranslationQ {
  id: string;
  word: string;           // English word
  options: string[];      // 4 Vietnamese meaning options
  correctAnswer: number;  // Index of correct option (0-3)
  alternativeCorrectAnswers?: number[];  // Other correct option indices
  explanation?: string;
}

export interface TrueFalseQ {
  id: string;
  statement: string;      // Statement about the passage
  isTrue: boolean;        // True or False
  explanation: string;    // Vietnamese explanation
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface ReadingAdventure {
  title: string;
  passage: string;
  translation: string;
  comprehension: MultipleChoiceQ[];
}

export interface HomeworkTask {
  title: string;
  description: string;
  instructions: string;
}

export interface PracticeContent {
  listening: ListeningQ[];
  megaTest: {
    multipleChoice: MultipleChoiceQ[];
    scramble: ScrambleQ[];
    fillBlank: FillInputQ[];
    errorId: ErrorIdQ[];             // deprecated, kept for backward compat
    vocabTranslation: VocabTranslationQ[]; // NEW: 10 vocab questions
    trueFalse: TrueFalseQ[];               // NEW: 10 true/false questions
    trueFalsePassage?: string;             // Fixed reading passage for True/False questions
    matching: MatchingPair[];
  };
}

export interface LessonPlan {
  topic: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarSection;
  reading: ReadingAdventure;
  homework: HomeworkTask;
  practice: PracticeContent;
  teacherTips: string;
}

export enum AppMode {
  ANALYSIS = 'analysis',
  CREATIVE = 'creative'
}

export interface MindMapData {
  center: {
    title_en: string;
    title_vi: string;
    emoji?: string;
  };
  nodes: Array<{
    text_en: string;
    text_vi: string;
    emoji?: string;
    color?: string;
  }>;
}

export enum MindMapMode {
  TOPIC = 'TOPIC',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface FillBlankQuestion {
  sentence: string;
  answer: string;
  options: string[];
  explanation?: string;
}

export interface ContentResult {
  storyEnglish: string;
  translatedText: string;
  writingPromptEn: string;
  writingPromptVi: string;
  vocabulary: VocabularyItem[];
  imagePrompt: string;
  comprehensionQuestions: MultipleChoiceQ[];
  speakingQuestions: SpeakingQ[];
}

export interface PresentationScript {
  introduction: { english: string; vietnamese: string; };
  body: Array<{ keyword: string; script: string; }>;
  conclusion: { english: string; vietnamese: string; };
}

export interface SpeechEvaluation {
  scores: {
    pronunciation: number;
  };
  overallScore: number;
  feedback: string;
}

export enum LoadingStep {
  IDLE = 'Idle',
  ANALYZING = 'Analyzing content...',
  GENERATING_IMAGE = 'Generating magic image...',
  GENERATING_AUDIO = 'Creating Mrs. Dung\'s voice...',
  COMPLETED = 'Completed!'
}

export interface CharacterProfile {
  id: string;
  name: string;
  emoji: string;
  promptContext: string;
  stylePrompt: string;
  colorClass: string;
}

export type ImageRatio = '1:1' | '16:9' | '9:16';

export interface AppState {
  selectedCharacter: CharacterProfile;
  selectedMode: AppMode;
  selectedRatio: ImageRatio;
  customPrompt: string;
  originalImages: string[];
  generatedImage: string | null;
  audioUrl: string | null;
  contentResult: ContentResult | null;
  isLoading: boolean;
  loadingStep: LoadingStep;
  error: string | null;
}

// ─── Learning History ───────────────────────────────────────
export interface LessonRecord {
  id: string;
  date: string;           // ISO string
  topic: string;
  score: number;           // 0-10
  totalCorrect: number;
  totalQuestions: number;
  skillScores: {
    mc: number;
    scramble: number;
    fill: number;
    vocab: number;
    tf: number;
    listen: number;
  };
  studentName: string;
}

export interface WeeklyReport {
  weekLabel: string;       // e.g. "10/02 - 16/02"
  weekStart: string;       // ISO
  weekEnd: string;         // ISO
  lessonCount: number;
  averageScore: number;
  topics: string[];
  progress: 'up' | 'down' | 'same' | 'none'; // compared to previous week
  prevAverage: number | null;
}

// ─── AI Provider & Roles ───────────────────────────────────
export type AiProvider = 'gemini' | 'agent-platform';

export type UserRole = 'teacher' | 'student';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  avatar?: string;
  classId?: string;
  className?: string;
}

export interface ClassRoom {
  id: string;
  name: string;             // VD: "6A1", "7B2", "8A3"
  grade: number;            // 6, 7, 8, 9, 10...
  description?: string;
  studentCount?: number;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;             // Họ và tên
  englishName?: string;     // Tên tiếng Anh (E.NAME: Kelvin, Elsa, Harry...)
  phone?: string;           // Số điện thoại phụ huynh
  classId: string;
  className: string;
  avatar?: string;
  rollNumber?: string;
  notes?: string;
  password?: string;        // Mật khẩu tài khoản do giáo viên tạo (mặc định: '123')
  username?: string;        // Tên đăng nhập (mặc định sinh từ tên hoặc mã học sinh)
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  topic: string;
  assignedDate: string;     // YYYY-MM-DD
  dueDate: string;          // ISO string or YYYY-MM-DDTHH:mm
  targetClassId: string;    // ID of ClassRoom, 'ALL', or 'MULTI'
  targetClassName: string;  // e.g. "Lớp 6A1" or "Tất cả các lớp" or "Lớp 6A1, Lớp 6A2"
  targetClassIds?: string[]; // Array of selected class IDs
  targetClassNames?: string[]; // Array of selected class names
  teacherNote?: string;     // Lời dặn dò của cô Dung
  lessonPlan: LessonPlan;   // Nội dung chi tiết bài soạn (Từ vựng, Ngữ pháp, Bài đọc, Bài tập)
  createdAt: string;
}

export type DeadlineStatus = 'active' | 'due_soon' | 'expired' | 'submitted';

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  topic: string;
  studentId?: string;
  studentName: string;
  studentClass: string;
  submittedAt: string;      // ISO string
  score: number;            // 0 - 10
  totalCorrect: number;
  totalQuestions: number;
  skillScores: {
    mc: number;
    scramble: number;
    fill: number;
    vocab: number;
    tf: number;
    listen: number;
  };
  evaluation: {
    text: string;
    emoji: string;
    level: string;
    praise: string;
  };
  answers?: Record<string, any>;
  teacherFeedback?: string;
}

export interface DailySummary {
  date: string;
  totalAssigned: number;
  totalSubmitted: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  submissionRate: number;    // %
  submissions: Submission[];
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// ─── Monthly Summary Report Types ─────────────────────────
export interface MonthlySessionColumn {
  key: string;               // e.g. "videoBtvn", "btvn", "oldLesson", "onlineTest"
  label: string;             // e.g. "Video BTVN", "BTVN", "Kiểm tra bài cũ"
  maxScore?: number;         // default 10
}

export interface MonthlySessionConfig {
  id: string;                // e.g. "session_1"
  name: string;              // e.g. "Buổi học 1"
  date: string;              // e.g. "05/08/2026"
  colorTheme?: string;       // Pastel color name/class
  columns: MonthlySessionColumn[];
}

export interface StudentMonthlyScore {
  studentId: string;
  studentName: string;
  englishName?: string;
  scores: Record<string, Record<string, number | 'x' | ''>>; // sessionId -> columnKey -> score
  averageScore: number;      // Calculated 2 decimal places
  rank?: number;
}

export interface MonthlyReport {
  id: string;
  classId: string;
  className: string;
  month: number;             // 1 - 12
  year: number;              // e.g. 2026
  centerName: string;        // e.g. "ENGLISH MRS. DUNG"
  sessions: MonthlySessionConfig[];
  studentScores: StudentMonthlyScore[];
  updatedAt: string;
}

// ─── Weekly Summary Report Types ──────────────────────────
export interface WeeklySessionConfig {
  id: string;                // e.g. "w_sess_1"
  name: string;              // e.g. "Buổi 1 (Thứ 2)"
  date: string;              // e.g. "04/08/2026"
  colorTheme?: string;
  columns: MonthlySessionColumn[];
}

export interface StudentWeeklyScore {
  studentId: string;
  studentName: string;
  englishName?: string;
  scores: Record<string, Record<string, number | 'x' | ''>>; // sessionId -> columnKey -> score
  averageScore: number;      // Calculated 2 decimal places
  rank?: number;
}

export interface WeeklyReportRecord {
  id: string;
  classId: string;
  className: string;
  year: number;              // e.g. 2026
  month: number;             // 1 - 12
  weekNumber: number;        // 1 - 5
  weekLabel: string;         // e.g. "Tuần 1 (01/08 - 07/08)"
  centerName: string;        // e.g. "ENGLISH MRS. DUNG"
  sessions: WeeklySessionConfig[];
  studentScores: StudentWeeklyScore[];
  updatedAt: string;
}

// ─── Class Schedule & Attendance Types ───────────────────
export interface WeeklyTimeSlot {
  id: string;
  dayOfWeek: number;         // 2: Thứ Hai, 3: Thứ Ba, ..., 7: Thứ Bảy, 1: Chủ Nhật
  dayLabel: string;          // e.g. "Thứ Hai"
  startTime: string;         // e.g. "17:30"
  endTime: string;           // e.g. "19:00"
  room?: string;             // e.g. "Phòng A1", "Phòng Zoom 1"
  notes?: string;
}

export interface ClassScheduleConfig {
  id: string;
  classId: string;
  className: string;
  sessionsPerWeek: number;   // e.g. 2, 3
  slots: WeeklyTimeSlot[];
  roomDefault?: string;
  notes?: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent_excused' | 'absent_unexcused' | 'late';

export interface AttendanceStudentItem {
  studentId: string;
  studentName: string;
  englishName?: string;
  avatar?: string;
  rollNumber?: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  className: string;
  date: string;              // YYYY-MM-DD
  dayOfWeek?: number;        // 1 - 7
  dayLabel?: string;         // e.g. "Thứ Hai"
  timeSlot?: string;         // e.g. "17:30 - 19:00"
  lessonTopic?: string;      // Nội dung / chủ đề buổi học
  records: AttendanceStudentItem[];
  summary: {
    total: number;
    present: number;
    absentExcused: number;
    absentUnexcused: number;
    late: number;
    rate: number;            // % đi học
  };
  updatedAt: string;
}


