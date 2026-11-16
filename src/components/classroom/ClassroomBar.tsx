import React, { useEffect, useState } from 'react';
import { LogOut, BookOpen, ArrowLeft, Users } from 'lucide-react';
import { Assignment, Session, listenAssignments } from '../../services/classroom';

interface Props {
  session: Session | null;
  onPickTopic: (topic: string, level: string) => void;
  onLogout: () => void;
  onBackToTeacher?: () => void;
  onJoinClass?: () => void;
}

/** Thanh lớp học hiển thị ngay dưới Header của phòng luyện nói. */
export const ClassroomBar: React.FC<Props> = ({ session, onPickTopic, onLogout, onBackToTeacher, onJoinClass }) => {
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const code = session?.role === 'student' ? session.code : null;

  useEffect(() => {
    if (!code) return;
    return listenAssignments(code, setAssignments);
  }, [code]);

  const wrap = 'relative z-30 bg-white/90 backdrop-blur border-b border-emerald-100 shadow-sm';
  const inner = 'max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-sm';

  if (!session) {
    return (
      <div className={wrap}>
        <div className={inner}>
          <span className="text-slate-500 font-semibold">Đang học tự do — kết quả chỉ lưu trên máy này.</span>
          <button onClick={onJoinClass} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green text-white font-black text-xs">
            <Users size={14} /> Vào lớp
          </button>
        </div>
      </div>
    );
  }

  if (session.role === 'teacher') {
    return (
      <div className={wrap}>
        <div className={inner}>
          <button onClick={onBackToTeacher} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green text-white font-black text-xs">
            <ArrowLeft size={14} /> Về bảng giáo viên
          </button>
          <span className="text-slate-500 font-semibold">Cô đang dùng thử phòng luyện nói — bài của cô không tính vào lớp.</span>
        </div>
      </div>
    );
  }

  const list = (Object.entries(assignments) as [string, Assignment][]).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  return (
    <div className={wrap}>
      <div className={inner}>
        <span className="flex items-center gap-2 font-black text-brand-green-dark min-w-0">
          🎒 <span className="truncate">{session.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] whitespace-nowrap">{session.className}</span>
        </span>
        <span className="hidden sm:inline text-[11px] font-bold text-emerald-600">● Kết quả tự gửi cho cô giáo</span>
        <button onClick={onLogout} className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">
          <LogOut size={14} /> Thoát lớp
        </button>
      </div>
      {list.length > 0 && (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-2.5 flex items-center gap-2 overflow-x-auto">
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-black text-amber-700 uppercase"><BookOpen size={13} /> Cô giao:</span>
          {list.map(([id, a]) => (
            <button key={id} onClick={() => onPickTopic(a.topic, a.level)} title={a.note || 'Bấm để học chủ đề này'}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100">
              {a.topic} · {a.level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
