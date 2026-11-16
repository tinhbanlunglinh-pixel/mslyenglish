import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy, Check, RefreshCw, Save, Image as ImageIcon } from 'lucide-react';
import { GradeResult, saveReportText } from '../../services/classroom';
import { drawReportImage } from '../../utils/reportImage';

interface Props {
  code: string;
  aid: string;
  sid: string;
  studentName: string;
  className: string;
  lessonTopic: string;
  level: string;
  result: GradeResult;
  report: string;
  callName: string;
  gradedAt?: number;
  onClose: () => void;
}

/** Hộp báo cáo: sửa lời nhận xét, tải ảnh / chép ảnh / chép chữ để gửi phụ huynh */
export const ReportModal: React.FC<Props> = (p) => {
  const [text, setText] = useState(p.report);
  const [saved, setSaved] = useState(p.report);
  const [busy, setBusy] = useState<'' | 'copyimg' | 'save'>('');
  const [done, setDone] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dateStr = new Date(p.gradedAt || Date.now()).toLocaleDateString('vi-VN');
  const fileName = `Nhan-xet-${p.studentName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-')}-${dateStr.replace(/\//g, '-')}.png`;

  const flash = (m: string) => { setDone(m); setTimeout(() => setDone(null), 2200); };

  // Vẽ lại ảnh mỗi khi cô sửa chữ (trễ 300ms)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const c = await drawReportImage({
        studentName: p.studentName, className: p.className, lessonTopic: p.lessonTopic, level: p.level,
        dateStr, callName: p.callName, result: p.result, text,
      });
      if (!alive) return;
      canvasRef.current = c;
      setPreview(c.toDataURL('image/png'));
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [text]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = fileName;
    a.click();
    flash('Đã tải ảnh về máy');
  };

  const copyImage = async () => {
    if (!canvasRef.current) return;
    setBusy('copyimg');
    try {
      const blob: Blob = await new Promise((res, rej) => canvasRef.current!.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash('Đã chép ảnh — dán (Ctrl+V) vào Zalo/Messenger');
    } catch { flash('Trình duyệt không cho chép ảnh, cô dùng nút Tải ảnh nhé'); } finally { setBusy(''); }
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(text); flash('Đã chép lời nhận xét'); } catch { flash('Không chép được'); }
  };

  const save = async () => {
    setBusy('save');
    try { await saveReportText(p.code, p.aid, p.sid, text); setSaved(text); flash('Đã lưu — học sinh cũng thấy lời nhận xét mới'); }
    catch { flash('Chưa lưu được'); } finally { setBusy(''); }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 overflow-y-auto" onClick={p.onClose}>
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-emerald-100 bg-emerald-50">
            <h3 className="font-black text-brand-green-dark flex items-center gap-2"><ImageIcon size={18} /> Báo cáo gửi phụ huynh · {p.studentName}</h3>
            <button onClick={p.onClose} className="p-1.5 rounded-lg hover:bg-white"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-4 sm:p-6">
            <div className="space-y-3 min-w-0">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Lời nhận xét (cô sửa được)</p>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={20}
                className="w-full text-sm leading-relaxed p-3 border-2 border-emerald-100 rounded-2xl focus:outline-none focus:border-brand-green font-sans" />
              <div className="flex flex-wrap gap-2">
                <button onClick={download} disabled={!preview} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green text-white font-black text-sm disabled:opacity-60">
                  <Download size={16} /> Tải ảnh
                </button>
                <button onClick={copyImage} disabled={!preview || !!busy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-yellow text-slate-900 font-black text-sm disabled:opacity-60">
                  {busy === 'copyimg' ? <RefreshCw size={16} className="animate-spin" /> : <Copy size={16} />} Chép ảnh
                </button>
                <button onClick={copyText} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">
                  <Copy size={16} /> Chép chữ
                </button>
                <button onClick={save} disabled={!!busy || text === saved} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-sm disabled:opacity-40">
                  {busy === 'save' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu sửa đổi
                </button>
              </div>
              {done && <p className="text-sm font-bold text-emerald-700 flex items-center gap-1"><Check size={16} /> {done}</p>}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">Ảnh gửi phụ huynh</p>
              {preview ? (
                <img src={preview} alt="Ảnh báo cáo gửi phụ huynh" className="w-full rounded-2xl border border-emerald-100 shadow" />
              ) : (
                <p className="text-sm text-slate-400 flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Đang tạo ảnh...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
