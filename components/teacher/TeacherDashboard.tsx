import React, { useState, useEffect } from 'react';
import { AssignmentCreator } from './AssignmentCreator';
import { LessonRepository } from './LessonRepository';
import { StudentManagement } from './StudentManagement';
import { DailyResultsAggregator } from './DailyResultsAggregator';
import { MonthlyReportAggregator } from './MonthlyReportAggregator';
import { ScheduleAndAttendance } from './ScheduleAndAttendance';
import { TopPerformersHonor } from './TopPerformersHonor';
import { getClasses, getStudents, getAssignments, getSubmissions, subscribeToSync } from '../../services/assignmentService';
import { Assignment } from '../../types';

interface TeacherDashboardProps {
  onOpenSettings: () => void;
  onSwitchToStudent: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onOpenSettings, onSwitchToStudent }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'repository' | 'students' | 'schedule' | 'summary' | 'monthly' | 'top'>('create');
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    assignmentsCount: 0,
    submissionsCount: 0
  });

  const refreshStats = () => {
    setStats({
      classesCount: getClasses().length,
      studentsCount: getStudents().length,
      assignmentsCount: getAssignments().length,
      submissionsCount: getSubmissions().length
    });
  };

  useEffect(() => {
    refreshStats();
    const unsubscribe = subscribeToSync(() => {
      refreshStats();
    });
    return () => unsubscribe();
  }, []);

  const allSubmissions = getSubmissions();

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner for Teacher */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span>👩‍🏫</span> KHÔNG GIAN DÀNH CHO GIÁO VIÊN
            </div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight font-display">
              BẢNG ĐIỀU KHIỂN CÔ DUNG
            </h1>
            <p className="text-brand-100 text-sm sm:text-base font-medium mt-1">
              Soạn bài theo ngày, quản lý học sinh theo lớp, tổng hợp và đánh giá kết quả học tập.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full md:w-auto">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black">{stats.classesCount}</p>
              <p className="text-[10px] sm:text-xs text-brand-100 uppercase font-bold">Lớp học</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black">{stats.studentsCount}</p>
              <p className="text-[10px] sm:text-xs text-brand-100 uppercase font-bold">Học sinh</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black">{stats.assignmentsCount}</p>
              <p className="text-[10px] sm:text-xs text-brand-100 uppercase font-bold">Bài đã giao</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black">{stats.submissionsCount}</p>
              <p className="text-[10px] sm:text-xs text-brand-100 uppercase font-bold">Bài đã nộp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-brand-100 gap-2 overflow-x-auto">
        <button
          onClick={() => {
            setEditingAssignment(null);
            setActiveTab('create');
          }}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-brand-500 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">📝</span> Soạn & Giao Bài
        </button>

        <button
          onClick={() => setActiveTab('repository')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'repository'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-102 ring-2 ring-purple-200'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <span className="text-lg">📚</span> Kho Lưu Tài Liệu ({stats.assignmentsCount})
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-brand-500 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">👥</span> Quản Lý Học Sinh Theo Lớp
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">🗓️</span> Lịch & Điểm Danh
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-brand-500 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">📊</span> Tổng Hợp Theo Ngày
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'monthly'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">📅</span> Báo Cáo Tháng
        </button>

        <button
          onClick={() => setActiveTab('top')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'top'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md scale-102'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">🏆</span> Bảng Vàng Điểm Cao
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'create' && (
        <AssignmentCreator
          onOpenSettings={onOpenSettings}
          onAssignmentCreated={() => setActiveTab('repository')}
          onNavigateToRepository={() => setActiveTab('repository')}
          initialAssignment={editingAssignment}
          onClearInitialAssignment={() => setEditingAssignment(null)}
        />
      )}

      {activeTab === 'repository' && (
        <LessonRepository
          onEditAssignment={(assign) => {
            setEditingAssignment(assign);
            setActiveTab('create');
          }}
          onNavigateToCreate={() => {
            setEditingAssignment(null);
            setActiveTab('create');
          }}
        />
      )}

      {activeTab === 'students' && (
        <StudentManagement />
      )}

      {activeTab === 'schedule' && (
        <ScheduleAndAttendance />
      )}

      {activeTab === 'summary' && (
        <DailyResultsAggregator />
      )}

      {activeTab === 'monthly' && (
        <MonthlyReportAggregator />
      )}

      {activeTab === 'top' && (
        <TopPerformersHonor submissions={allSubmissions} />
      )}
    </div>
  );
};
