import { FirebaseConfig } from '../types';

const FIREBASE_CONFIG_KEY = 'mrs_dung_firebase_config';

/**
 * Default Firebase Configuration provided for English Mrs Dung
 */
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAwl9RWxJATZbh_OD7cfOVN_ikC4InK_4k",
  authDomain: "english-mrs-dung.firebaseapp.com",
  databaseURL: "https://english-mrs-dung-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "english-mrs-dung",
  storageBucket: "english-mrs-dung.firebasestorage.app",
  messagingSenderId: "797526955233",
  appId: "1:797526955233:web:75cef3a23e85e8f002d3a0"
};

export const getFirebaseConfig = (): FirebaseConfig => {
  if (typeof window === 'undefined') return DEFAULT_FIREBASE_CONFIG;
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (!raw) return DEFAULT_FIREBASE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<FirebaseConfig>;
    return {
      ...DEFAULT_FIREBASE_CONFIG,
      ...parsed,
      databaseURL: parsed.databaseURL || DEFAULT_FIREBASE_CONFIG.databaseURL
    };
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
};

export const saveFirebaseConfig = (config: FirebaseConfig): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
};

export const clearFirebaseConfig = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
};

export const isFirebaseConfigured = (): boolean => {
  const cfg = getFirebaseConfig();
  return !!(cfg && cfg.databaseURL && cfg.databaseURL.startsWith('https://'));
};

/**
 * Format Realtime Database REST URL
 */
const getDatabaseEndpoint = (databaseURL: string, path: string): string => {
  const cleanBase = databaseURL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '').replace(/\.json$/, '');
  return `${cleanBase}/${cleanPath}.json`;
};

/**
 * Push/Sync data to Firebase Realtime Database using REST API
 * (Safe, lightweight, works seamlessly in browser without extra npm SDK)
 */
export const syncToFirebaseIfConfigured = async (path: string, data: any): Promise<boolean> => {
  const cfg = getFirebaseConfig();
  if (!cfg || !cfg.databaseURL) return false;

  try {
    const url = getDatabaseEndpoint(cfg.databaseURL, path);
    const authParam = cfg.apiKey ? `?auth=${cfg.apiKey}` : '';
    const res = await fetch(`${url}${authParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (error) {
    console.warn(`Firebase sync for ${path} failed (app continues in offline/local mode):`, error);
    return false;
  }
};

/**
 * Fetch data from Firebase Realtime Database if configured
 */
export const fetchFromFirebaseIfConfigured = async <T>(path: string): Promise<T | null> => {
  const cfg = getFirebaseConfig();
  if (!cfg || !cfg.databaseURL) return null;

  try {
    const url = getDatabaseEndpoint(cfg.databaseURL, path);
    const authParam = cfg.apiKey ? `?auth=${cfg.apiKey}` : '';
    const res = await fetch(`${url}${authParam}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`Firebase fetch for ${path} failed:`, error);
    return null;
  }
};

/**
 * Test Firebase Realtime Database connection
 */
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  const cfg = getFirebaseConfig();
  if (!cfg.databaseURL) {
    return { success: false, message: 'Chưa cấu hình Realtime Database URL' };
  }
  try {
    const testEndpoint = getDatabaseEndpoint(cfg.databaseURL, '_ping');
    const authParam = cfg.apiKey ? `?auth=${cfg.apiKey}` : '';
    const res = await fetch(`${testEndpoint}${authParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now(), client: 'Mrs Dung App' })
    });
    if (res.ok) {
      return { success: true, message: 'Kết nối Firebase Realtime Database thành công! 🟢' };
    } else {
      const errText = await res.text();
      return { success: false, message: `Lỗi kết nối Firebase (HTTP ${res.status}): ${errText}` };
    }
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến Firebase: ${err?.message || err}` };
  }
};

/**
 * Pull initial data from Firebase Realtime Database and synchronize with LocalStorage
 */
export const pullAllFromFirebase = async (): Promise<boolean> => {
  try {
    const [cloudClasses, cloudStudents, cloudAssignments, cloudSubmissions] = await Promise.all([
      fetchFromFirebaseIfConfigured<any[]>('classes'),
      fetchFromFirebaseIfConfigured<any[]>('students'),
      fetchFromFirebaseIfConfigured<any[]>('assignments'),
      fetchFromFirebaseIfConfigured<any[]>('submissions')
    ]);

    let hasNewData = false;

    if (Array.isArray(cloudClasses) && cloudClasses.length > 0) {
      localStorage.setItem('mrs_dung_classes', JSON.stringify(cloudClasses));
      hasNewData = true;
    }
    if (Array.isArray(cloudStudents) && cloudStudents.length > 0) {
      localStorage.setItem('mrs_dung_students', JSON.stringify(cloudStudents));
      hasNewData = true;
    }
    if (Array.isArray(cloudAssignments) && cloudAssignments.length > 0) {
      localStorage.setItem('mrs_dung_assignments', JSON.stringify(cloudAssignments));
      hasNewData = true;
    }
    if (Array.isArray(cloudSubmissions) && cloudSubmissions.length > 0) {
      localStorage.setItem('mrs_dung_submissions', JSON.stringify(cloudSubmissions));
      hasNewData = true;
    }

    return hasNewData;
  } catch (e) {
    console.warn('Pull from Firebase error:', e);
    return false;
  }
};

/**
 * Seed initial data to Firebase if cloud database is empty
 */
export const seedFirebaseIfEmpty = async (defaultData: {
  classes: any[];
  students: any[];
  assignments: any[];
  submissions: any[];
}) => {
  try {
    const existingAssignments = await fetchFromFirebaseIfConfigured<any[]>('assignments');
    if (!existingAssignments || !Array.isArray(existingAssignments) || existingAssignments.length === 0) {
      await Promise.all([
        syncToFirebaseIfConfigured('classes', defaultData.classes),
        syncToFirebaseIfConfigured('students', defaultData.students),
        syncToFirebaseIfConfigured('assignments', defaultData.assignments),
        syncToFirebaseIfConfigured('submissions', defaultData.submissions)
      ]);
      console.log('Firebase initialized with seed data.');
    }
  } catch (e) {
    console.warn('Seed Firebase skipped or failed:', e);
  }
};

