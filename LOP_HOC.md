# Lớp học Ms Lý English — kết nối Giáo viên ↔ Học sinh

Web: https://mslyenglish.vercel.app · Firebase: dự án `mslyenglish-app` (Realtime Database, Singapore)

## Luồng sử dụng
1. **Giáo viên** đăng nhập bằng mật khẩu → tạo lớp → nhận **mã lớp 6 ký tự** và link `/?lop=MÃ` gửi phụ huynh.
2. **Giao bài nói** (3 cách):
   - **📚 Kho bài** — không cần API key: 35 bài mẫu chuẩn (5 bài × 7 trình độ Starters, Movers, Flyers, A1, A2, B1, B2;
     file `src/data/sampleLessons.ts`) + mọi bài cô đã tạo trước đó.
   - **💡 AI tạo bài / 📝 Đoạn văn của cô** — cần API key Gemini (lưu trên máy cô). Bài tạo xong **tự lưu vào kho**
     (bấm "Tạo lại" thì ghi đè bản nháp đó, không sinh bài rác); khi giao, phần cô sửa cũng được lưu.
   - Sửa bài mẫu rồi giao → lưu thành bài mới của cô.
3. **Học sinh** nhập mã lớp + họ tên → *Bài cô giao* → nghe mẫu (giọng đọc của trình duyệt) → ghi âm → nộp. **Không cần API key.**
4. **Chấm & báo cáo**: khi cô mở Bảng giáo viên, bài mới nộp của lớp đang chọn được tự chấm trên máy cô bằng key của cô
   (hàm `evaluateSpeech`), lưu điểm + lời nhận xét theo mẫu. Cô xuất **ảnh báo cáo** (Tải ảnh / Chép ảnh / Chép chữ) gửi phụ huynh.
5. Học sinh thấy điểm và lời nhận xét ngay sau khi cô chấm.

Ngoài ra vẫn có *Phòng luyện nói tự do* (app gốc, cần API key riêng); khi HS đã vào lớp, điểm ở đây cũng gửi về cô.

## Mã nguồn chính
| File | Vai trò |
|---|---|
| `src/Root.tsx` | Điều hướng: đăng nhập → Bảng GV / Bài cô giao / Phòng luyện nói |
| `src/services/classroom.ts` | Firebase: lớp, học sinh, bài giao, bài nộp, file ghi âm, điểm, mẫu nhận xét `buildParentReport` |
| `src/services/grading.ts` | Chấm bài nộp trên máy GV bằng Gemini |
| `src/utils/reportImage.ts` | Vẽ ảnh báo cáo 1080px bằng Canvas |
| `src/components/classroom/LoginGate.tsx` | Màn hình chọn Học sinh / Giáo viên |
| `src/components/classroom/TeacherPanel.tsx` | Bảng GV: Kết quả · Giao bài nói · Chấm & báo cáo |
| `src/components/classroom/StudentHome.tsx` | Bài cô giao + làm bài, ghi âm, nộp |
| `src/components/classroom/ReportModal.tsx` | Sửa lời nhận xét, xuất ảnh |
| `src/components/classroom/ClassroomBar.tsx` | Thanh lớp học trong Phòng luyện nói |
| `src/hooks/useRecorder.ts` | Ghi âm; tham số `onCaptured` = chỉ thu âm, không chấm |
| `database.rules.json` | Luật bảo mật Realtime Database |

## Cấu trúc dữ liệu (Realtime Database)
```
teachers/msly/{passHash, callName, classes/{MÃ}: {name}}
teachers/msly/library/{lid}  {topic, level, readingText, translation, vocabulary[], createdAt, usedCount}  ← kho bài của cô
classes/{MÃ}/
  info          {name, teacher, createdAt}
  students/{sid}            {name, joinedAt, lastActive}
  assignments/{aid}         {topic, level, note, readingText, translation, vocabulary[]}
  submissions/{aid}/{sid}   {name, duration, submittedAt, status: pending|graded|error, result, report}
  audio/{aid}/{sid}         WAV 16kHz base64 (tải riêng khi cần, không kèm khi nghe cả lớp)
  results/{sid}/{lessonId}  {topic, level, speakingScore, exerciseScore, submitted}
```
`sid` = họ tên bỏ dấu, ví dụ "Nguyễn Minh Anh" → `nguyen-minh-anh`.

## Lệnh hay dùng
- Nạp luật bảo mật: `npx firebase-tools deploy --only database --project mslyenglish-app`
- Chạy thử: `npm run dev` (cổng 3000) · Build: `npm run build`
- Đẩy lên `main` trên GitHub → Vercel tự cập nhật web.

## Lưu ý
- Mật khẩu GV chỉ lưu dạng mã băm SHA-256 (`DEFAULT_TEACHER_HASH` + `teachers/msly/passHash`); đổi trong app bằng nút 🔑.
- Chưa có đăng nhập thật: ai biết mã lớp về lý thuyết sửa được dữ liệu lớp đó.
- Mỗi phút ghi âm ≈ 2 MB; xoá bài đã giao sẽ xoá luôn file ghi âm của bài đó.
- Thư mục gốc (`App.tsx`, `components/teacher`, `services/firebaseService.ts`…) là bản "Mrs. Dung" cũ, **không dùng**.
