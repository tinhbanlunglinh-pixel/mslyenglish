import { AuthUser, UserRole } from '../types';
import { INITIAL_ACCOUNTS, AccountCredential } from '../accounts/credentials';

const CURRENT_USER_KEY = 'mrs_dung_auth_current_user';
const CUSTOM_ACCOUNTS_KEY = 'mrs_dung_custom_accounts';

/**
 * Get all available accounts (combining file-based INITIAL_ACCOUNTS with any locally saved overrides)
 */
export const getAllAccounts = (): AccountCredential[] => {
  if (typeof window === 'undefined') return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
    if (!raw) return INITIAL_ACCOUNTS;
    const customList = JSON.parse(raw) as AccountCredential[];
    if (!Array.isArray(customList) || customList.length === 0) return INITIAL_ACCOUNTS;

    // Merge: custom overrides file-based by username
    const map = new Map<string, AccountCredential>();
    INITIAL_ACCOUNTS.forEach(a => map.set(a.username.toLowerCase(), a));
    customList.forEach(a => map.set(a.username.toLowerCase(), a));
    return Array.from(map.values());
  } catch {
    return INITIAL_ACCOUNTS;
  }
};

/**
 * Save custom/updated accounts list
 */
export const saveAccounts = (accounts: AccountCredential[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(accounts));
};

import { getStudents, getClasses } from './assignmentService';

/**
 * Login verification (supports both teacher/admin accounts and student lookup)
 */
export const login = (
  usernameInput: string,
  passwordInput: string,
  expectedRole?: UserRole,
  classIdFilter?: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanUser) {
    return { success: false, error: 'Vui lòng nhập tên đăng nhập hoặc họ tên học sinh!' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Vui lòng nhập mật khẩu!' };
  }

  // Dedicated check for Teacher Mrs. Dung
  const normalizedUser = cleanUser.replace(/[\.\s_-]/g, '');
  if (cleanUser === 'mrs. dung' || cleanUser === 'mrs dung' || cleanUser === 'mrsdung' || normalizedUser === 'mrsdung') {
    if (cleanPass !== '88889999') {
      return { success: false, error: 'Mật khẩu giáo viên không chính xác. Vui lòng kiểm tra lại!' };
    }
    const authUser: AuthUser = {
      id: 'teacher_dung',
      username: 'Mrs. Dung',
      role: 'teacher',
      name: 'Cô Dung (Mrs. Dung)',
      avatar: '👩‍🏫'
    };
    setCurrentUser(authUser);
    return { success: true, user: authUser };
  }

  // If logging in as student, first check student records created by teacher
  if (expectedRole === 'student') {
    const students = getStudents(classIdFilter && classIdFilter !== 'ALL' ? classIdFilter : undefined);
    const matchedStudent = students.find(s => 
      s.name.toLowerCase() === cleanUser ||
      (s.englishName && s.englishName.toLowerCase() === cleanUser) ||
      (s.username && s.username.toLowerCase() === cleanUser) ||
      s.id.toLowerCase() === cleanUser
    );

    if (matchedStudent) {
      const studentPass = (matchedStudent.password || '123').trim();
      if (cleanPass !== studentPass) {
        return { success: false, error: 'Mật khẩu không chính xác! Mật khẩu do giáo viên cấp (mặc định: 123).' };
      }

      const authUser: AuthUser = {
        id: matchedStudent.id,
        username: matchedStudent.username || matchedStudent.name,
        role: 'student',
        name: matchedStudent.name,
        avatar: matchedStudent.avatar || '🎒',
        classId: matchedStudent.classId,
        className: matchedStudent.className
      };
      setCurrentUser(authUser);
      return { success: true, user: authUser };
    }
  }

  // Check file/localStorage based accounts
  const accounts = getAllAccounts();
  const matched = accounts.find(a => a.username.toLowerCase() === cleanUser || a.username.toLowerCase() === usernameInput.trim().toLowerCase());

  if (!matched) {
    // If student role and not found in accounts or students
    if (expectedRole === 'student') {
      return { success: false, error: 'Không tìm thấy học sinh với tên này! Vui lòng kiểm tra lại lớp và họ tên.' };
    }
    return { success: false, error: 'Tên đăng nhập không tồn tại trong hệ thống!' };
  }

  if (matched.password !== cleanPass) {
    return { success: false, error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!' };
  }

  if (expectedRole && matched.role !== expectedRole) {
    const roleName = expectedRole === 'teacher' ? 'Giáo viên' : 'Học sinh';
    return {
      success: false,
      error: `Tài khoản này không thuộc vai trò ${roleName}!`
    };
  }

  const authUser: AuthUser = {
    id: matched.id,
    username: matched.username,
    role: matched.role,
    name: matched.name,
    avatar: matched.avatar || (matched.role === 'teacher' ? '👩‍🏫' : '🎒'),
    classId: matched.classId,
    className: matched.className
  };

  setCurrentUser(authUser);
  return { success: true, user: authUser };
};

/**
 * Simple student login by Name and Class (NO PASSWORD REQUIRED)
 */
export const loginStudentSimple = (
  studentName: string,
  classIdOrName: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanName = studentName.trim();
  const cleanClass = classIdOrName.trim();

  if (!cleanClass) {
    return { success: false, error: 'Con ơi, vui lòng chọn hoặc nhập lớp học nhé!' };
  }
  if (!cleanName) {
    return { success: false, error: 'Con ơi, vui lòng nhập họ và tên của mình nhé!' };
  }

  // Find class from existing classes
  const classes = getClasses();
  let matchedClass = classes.find(c => 
    c.id.toLowerCase() === cleanClass.toLowerCase() ||
    c.name.toLowerCase() === cleanClass.toLowerCase()
  );

  const targetClassId = matchedClass ? matchedClass.id : `class_${Date.now()}`;
  const targetClassName = matchedClass ? matchedClass.name : cleanClass;

  // Check if student already exists in this class
  const students = getStudents(matchedClass ? matchedClass.id : undefined);
  const matchedStudent = students.find(s =>
    s.name.toLowerCase() === cleanName.toLowerCase() ||
    (s.englishName && s.englishName.toLowerCase() === cleanName.toLowerCase())
  );

  const authUser: AuthUser = {
    id: matchedStudent ? matchedStudent.id : `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanName,
    role: 'student',
    name: cleanName,
    avatar: matchedStudent?.avatar || '🎒',
    classId: targetClassId,
    className: targetClassName
  };

  setCurrentUser(authUser);
  return { success: true, user: authUser };
};

/**
 * Direct student login by Class ID, Student Name, and Teacher-created Password
 */
export const loginStudentByClassAndName = (
  classId: string,
  studentNameOrId: string,
  passwordInput: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanNameOrId = studentNameOrId.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!classId) {
    return { success: false, error: 'Vui lòng chọn lớp học của con!' };
  }
  if (!cleanNameOrId) {
    return { success: false, error: 'Vui lòng chọn hoặc nhập tên học sinh!' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Vui lòng nhập mật khẩu do cô giáo cấp!' };
  }

  const students = getStudents(classId);
  const matchedStudent = students.find(s =>
    s.id.toLowerCase() === cleanNameOrId ||
    s.name.toLowerCase() === cleanNameOrId ||
    (s.englishName && s.englishName.toLowerCase() === cleanNameOrId)
  );

  if (!matchedStudent) {
    return { success: false, error: 'Không tìm thấy học sinh trong lớp này! Vui lòng chọn đúng lớp và tên.' };
  }

  const studentPass = (matchedStudent.password || '123').trim();
  if (cleanPass !== studentPass) {
    return { success: false, error: 'Mật khẩu không chính xác! Mật khẩu do cô giáo tạo (mặc định: 123).' };
  }

  const authUser: AuthUser = {
    id: matchedStudent.id,
    username: matchedStudent.username || matchedStudent.name,
    role: 'student',
    name: matchedStudent.name,
    avatar: matchedStudent.avatar || '🎒',
    classId: matchedStudent.classId,
    className: matchedStudent.className
  };

  setCurrentUser(authUser);
  return { success: true, user: authUser };
};

/**
 * Get current logged in user
 */
export const getCurrentUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

/**
 * Set current logged in user
 */
export const setCurrentUser = (user: AuthUser | null): void => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    // Also sync mrs_dung_user_role for compatibility
    localStorage.setItem('mrs_dung_user_role', user.role);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

/**
 * Logout
 */
export const logout = (): void => {
  setCurrentUser(null);
};

/**
 * Check if logged in
 */
export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};
