// Vẽ ảnh báo cáo gửi phụ huynh bằng Canvas 2D (không phụ thuộc CSS → ảnh luôn đúng).
import type { GradeResult } from '../services/classroom';

export interface ReportImageInput {
  studentName: string;
  className: string;
  lessonTopic: string;
  level: string;
  dateStr: string;
  callName: string;
  result: GradeResult;
  text: string;
}

const LOGO_URL = 'https://i.postimg.cc/KjfCRQ6Y/e15cb4f9-b2de-4779-8838-aafe20bc074f.png';
const FONT = `Inter, "Segoe UI", Roboto, Arial, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
const W = 1080;
const PAD = 64;

let logoPromise: Promise<HTMLImageElement | null> | null = null;
const loadLogo = () => {
  if (!logoPromise) {
    logoPromise = new Promise(res => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = LOGO_URL;
      setTimeout(() => res(null), 6000);
    });
  }
  return logoPromise;
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  // Từ quá dài (không có khoảng trắng) → cắt theo ký tự
  return lines.flatMap(l => {
    if (ctx.measureText(l).width <= maxW) return [l];
    const out: string[] = []; let s = '';
    for (const ch of Array.from(l)) { if (ctx.measureText(s + ch).width > maxW && s) { out.push(s); s = ch; } else s += ch; }
    if (s) out.push(s);
    return out;
  });
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const drawReportImage = async (p: ReportImageInput): Promise<HTMLCanvasElement> => {
  try { await (document as any).fonts?.ready; } catch { /* bỏ qua */ }
  const logo = await loadLogo();

  // ---- Đo chiều cao phần chữ ----
  const measure = document.createElement('canvas').getContext('2d')!;
  const BODY = 30, LH = 46;
  const bodyLines: { t: string; head: boolean; blank: boolean }[] = [];
  p.text.split('\n').forEach(raw => {
    const head = /^(🌟|📝|📊|📚)/.test(raw);
    measure.font = `${head ? 800 : 400} ${BODY}px ${FONT}`;
    if (!raw.trim()) { bodyLines.push({ t: '', head: false, blank: true }); return; }
    wrap(measure, raw, W - PAD * 2).forEach(t => bodyLines.push({ t, head, blank: false }));
  });

  const HEADER_H = 300;
  const showScores = !p.result.isSilent;
  const SCORE_H = showScores ? 260 : 0;
  const bodyH = bodyLines.reduce((h, l) => h + (l.blank ? LH * 0.55 : LH), 0);
  const FOOTER_H = 90;
  const H = Math.ceil(HEADER_H + SCORE_H + 40 + bodyH + 40 + FOOTER_H);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // ---- Đầu trang ----
  const g = ctx.createLinearGradient(0, 0, W, HEADER_H);
  g.addColorStop(0, '#00a84d'); g.addColorStop(1, '#059669');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, PAD, 44, 112, 112, 26); ctx.fill();
  if (logo) ctx.drawImage(logo, PAD + 10, 54, 92, 92);

  ctx.fillStyle = '#fec20a';
  ctx.font = `900 54px ${FONT}`;
  ctx.fillText('MS LÝ ENGLISH', PAD + 140, 104);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText('NHẬN XÉT BÀI LUYỆN ĐỌC', PAD + 142, 142);

  const info = (label: string, value: string, x: number, y: number, maxW: number) => {
    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(label, x, y);
    const lw = ctx.measureText(label).width;
    ctx.font = `800 28px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    let v = value;
    while (ctx.measureText(v).width > maxW - lw && v.length > 3) v = v.slice(0, -2);
    if (v !== value) v = v.slice(0, -1) + '…';
    ctx.fillText(v, x + lw, y);
  };
  info('Học sinh: ', p.studentName, PAD, 212, 520);
  info('Lớp: ', p.className, PAD + 540, 212, W - PAD * 2 - 540);
  info('Bài: ', `${p.lessonTopic} · ${p.level} · ${p.dateStr}`, PAD, 260, W - PAD * 2);

  let y = HEADER_H;

  // ---- Điểm ----
  if (showScores) {
    const r = p.result; const cr = r.criteriaScores;
    const cx = PAD + 105, cy = y + 130;
    ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#fff7d6'; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#fec20a'; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0d4023'; ctx.font = `900 64px ${FONT}`;
    ctx.fillText(r.score.toFixed(1), cx, cy + 14);
    ctx.fillStyle = '#64748b'; ctx.font = `700 22px ${FONT}`;
    ctx.fillText('/ 10 điểm', cx, cy + 50);
    ctx.textAlign = 'left';

    const items: [string, number][] = [
      ['🗣️ Phát âm', cr?.pronunciation ?? r.score],
      ['🌊 Trôi chảy', cr?.fluency ?? r.score],
      ['🎵 Ngữ điệu', cr?.intonation ?? r.score],
      ['📖 Ngữ pháp', cr?.grammar ?? r.score],
    ];
    const gx = PAD + 240, gw = (W - PAD - gx - 20) / 2, gh = 92;
    items.forEach(([label, v], i) => {
      const x = gx + (i % 2) * (gw + 20);
      const yy = y + 34 + Math.floor(i / 2) * (gh + 20);
      ctx.fillStyle = '#ecfdf5';
      roundRect(ctx, x, yy, gw, gh, 20); ctx.fill();
      ctx.fillStyle = '#64748b'; ctx.font = `700 22px ${FONT}`;
      ctx.fillText(label, x + 22, yy + 36);
      ctx.fillStyle = '#047857'; ctx.font = `900 32px ${FONT}`;
      ctx.fillText(`${Number(v).toFixed(1)}/10`, x + 22, yy + 76);
    });
    y += SCORE_H;
  }

  // ---- Lời nhận xét ----
  y += 40;
  bodyLines.forEach(l => {
    if (l.blank) { y += LH * 0.55; return; }
    y += LH;
    ctx.font = `${l.head ? 800 : 400} ${BODY}px ${FONT}`;
    ctx.fillStyle = l.head ? '#047857' : '#1e293b';
    ctx.fillText(l.t, PAD, y - 12);
  });

  // ---- Chân trang ----
  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
  ctx.fillStyle = '#0d4023';
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${p.callName} · Ms Lý English ❤️`, W - PAD, H - FOOTER_H / 2 + 9);
  ctx.textAlign = 'left';

  return c;
};
