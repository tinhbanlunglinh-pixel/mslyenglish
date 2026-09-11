import { Assignment } from '../types';

/**
 * Clean string for filenames
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Bai_Tap_Tieng_Anh_Mrs_Dung';
};

/**
 * Format date display dd/mm/yyyy
 */
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

/**
 * Generate complete, beautifully styled HTML document for Word and PDF Print
 */
export const generateAssignmentHtml = (
  assignment: Assignment,
  includeAnswerKey: boolean = true,
  isForPrint: boolean = false
): string => {
  const lesson = assignment.lessonPlan;
  const p = lesson?.practice;
  const mega = p?.megaTest;

  const title = assignment.title || 'BÀI TẬP TIẾNG ANH';
  const topic = assignment.topic || lesson?.topic || '';
  const className = assignment.targetClassName || 'Tất cả các lớp';
  const assignedDate = formatDate(assignment.assignedDate);
  const dueDate = assignment.dueDate ? assignment.dueDate.replace('T', ' ') : 'Theo quy định';

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: A4 portrait;
    margin: 1.5cm 2.0cm 2.0cm 2.0cm;
    mso-header-margin: 1.0cm;
    mso-footer-margin: 1.0cm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.4;
    color: #111;
    background-color: #fff;
    margin: 0;
    padding: ${isForPrint ? '0' : '20px'};
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }
  .header-table td {
    vertical-align: top;
    font-size: 11pt;
  }
  .school-title {
    font-weight: bold;
    text-transform: uppercase;
    color: #166534;
  }
  .sub-title {
    font-size: 10pt;
    color: #444;
  }
  .student-box {
    border: 1.5pt solid #166534;
    border-radius: 6px;
    padding: 10px 14px;
    margin: 12px 0 18px 0;
    background-color: #f8fafc;
  }
  .student-row {
    margin: 4px 0;
    font-size: 12pt;
  }
  .dotted-line {
    border-bottom: 1pt dotted #333;
    display: inline-block;
    min-width: 180px;
  }
  .main-title {
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #15803d;
    margin: 10px 0 4px 0;
  }
  .topic-name {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    font-style: italic;
    color: #374151;
    margin-bottom: 15px;
  }
  .teacher-note {
    background-color: #f0fdf4;
    border-left: 4pt solid #16a34a;
    padding: 8px 12px;
    font-style: italic;
    font-size: 11pt;
    margin: 10px 0 16px 0;
  }
  .section-header {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #166534;
    border-bottom: 1.5pt solid #16a34a;
    padding-bottom: 3px;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  .part-header {
    font-size: 13pt;
    font-weight: bold;
    color: #1e3a8a;
    margin: 14px 0 8px 0;
    page-break-after: avoid;
  }
  table.vocab-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px 0;
  }
  table.vocab-table th, table.vocab-table td {
    border: 1pt solid #cbd5e1;
    padding: 6px 10px;
    font-size: 11.5pt;
  }
  table.vocab-table th {
    background-color: #f1f5f9;
    font-weight: bold;
    text-align: left;
    color: #1e293b;
  }
  .question-item {
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .question-text {
    font-weight: bold;
    color: #0f172a;
  }
  .options-grid {
    display: flex;
    flex-wrap: wrap;
    margin-left: 20px;
    margin-top: 4px;
  }
  .option-col {
    display: inline-block;
    width: 48%;
    margin: 3px 0;
    font-size: 12pt;
  }
  .passage-box {
    background-color: #f8fafc;
    border: 1pt solid #cbd5e1;
    padding: 12px 16px;
    font-style: italic;
    line-height: 1.6;
    margin: 8px 0 14px 0;
    border-radius: 4px;
  }
  .page-break {
    page-break-before: always;
    mso-special-character: line-break;
  }
  .answer-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }
  .answer-table th, .answer-table td {
    border: 1pt solid #475569;
    padding: 6px 8px;
    text-align: center;
    font-size: 11pt;
  }
  .answer-table th {
    background-color: #f1f5f9;
  }
  @media print {
    body {
      padding: 0;
    }
    .no-print {
      display: none !important;
    }
  }
</style>
</head>
<body>

  <!-- HEADER TRƯỜNG / TRUNG TÂM -->
  <table class="header-table">
    <tr>
      <td style="width: 55%;">
        <div class="school-title">TRUNG TÂM TIẾNG ANH MRS. DUNG</div>
        <div class="sub-title">Lớp: <strong>${className}</strong> | Năm học 2025 - 2026</div>
        <div class="sub-title">Ngày giao: ${assignedDate} - Hạn nộp: ${dueDate}</div>
      </td>
      <td style="width: 45%; text-align: right;">
        <div style="font-weight: bold; text-transform: uppercase;">BÀI TẬP ÔN TẬP ĐỊNH KỲ</div>
        <div style="font-style: italic; font-size: 10pt;">Môn: Tiếng Anh (English)</div>
        <div style="font-size: 10pt;">Thời gian làm bài: 45 - 60 phút</div>
      </td>
    </tr>
  </table>

  <!-- KHUNG ĐIỀN THÔNG TIN HỌC SINH -->
  <div class="student-box">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 65%;">
          <div class="student-row">Họ và tên học sinh: <span class="dotted-line" style="min-width: 260px;"></span></div>
          <div class="student-row">Lớp: <span class="dotted-line" style="min-width: 100px;"></span> Số báo danh: <span class="dotted-line" style="min-width: 90px;"></span></div>
        </td>
        <td style="width: 35%; border-left: 1.5pt solid #cbd5e1; padding-left: 16px;">
          <div class="student-row"><strong>Điểm số:</strong> <span class="dotted-line" style="min-width: 60px;"></span> / 10</div>
          <div class="student-row"><strong>Lời phê của cô:</strong> .................................</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- TIÊU ĐỀ BÀI TẬP -->
  <div class="main-title">${title}</div>
  ${topic && topic !== title ? `<div class="topic-name">Topic: ${topic}</div>` : ''}

  <!-- LỜI NHẮN DẶN CỦA CÔ -->
  ${assignment.teacherNote ? `
  <div class="teacher-note">
    <strong>💬 Lời dặn dò của Cô Dung:</strong> "${assignment.teacherNote}"
  </div>
  ` : ''}

  <!-- ==================== PHẦN 1: TỪ VỰNG ==================== -->
  ${lesson?.vocabulary && lesson.vocabulary.length > 0 ? `
  <div class="section-header">I. VOCABULARY (TỪ VỰNG TRỌNG TÂM)</div>
  <table class="vocab-table">
    <thead>
      <tr>
        <th style="width: 6%; text-align: center;">STT</th>
        <th style="width: 25%;">Từ vựng (Word)</th>
        <th style="width: 22%;">Phiên âm (IPA)</th>
        <th style="width: 22%;">Nghĩa tiếng Việt</th>
        <th style="width: 25%;">Ví dụ (Example)</th>
      </tr>
    </thead>
    <tbody>
      ${lesson.vocabulary.map((v, i) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${i + 1}</td>
        <td><strong>${v.word}</strong> <span style="font-size: 10pt; color: #64748b;">(${v.type || 'n'})</span></td>
        <td style="font-family: 'Lucida Sans', Arial, sans-serif; color: #0369a1;">${v.ipa || ''}</td>
        <td>${v.meaning}</td>
        <td style="font-style: italic; color: #334155;">"${v.example || ''}"</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- ==================== PHẦN 2: NGỮ PHÁP ==================== -->
  ${lesson?.grammar ? `
  <div class="section-header">II. GRAMMAR FOCUS (NGỮ PHÁP CẦN NHỚ)</div>
  <div style="margin-bottom: 14px;">
    <div style="font-weight: bold; font-size: 13pt; color: #166534; margin-bottom: 4px;">
      👉 ${lesson.grammar.topic}
    </div>
    <div style="text-align: justify; line-height: 1.5; margin-bottom: 8px;">
      ${lesson.grammar.explanation}
    </div>
    ${lesson.grammar.examples && lesson.grammar.examples.length > 0 ? `
    <div style="background-color: #f8fafc; border-left: 3pt solid #0284c7; padding: 6px 12px; margin-top: 6px;">
      <strong>Ví dụ minh họa:</strong>
      <ul style="margin: 4px 0 4px 18px; padding: 0;">
        ${lesson.grammar.examples.map(ex => `<li style="font-style: italic; margin-bottom: 3px;">${ex}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- ==================== PHẦN 3: BÀI ĐỌC HIỂU ==================== -->
  ${lesson?.reading?.passage ? `
  <div class="section-header">III. READING COMPREHENSION (BÀI ĐỌC HIỂU)</div>
  <p style="font-weight: bold; margin-bottom: 6px;">
    Read the following passage and answer the questions below:
  </p>
  <div class="passage-box">
    <div style="font-weight: bold; text-align: center; margin-bottom: 6px; font-size: 13pt; font-style: normal; color: #0f172a;">
      ${lesson.reading.title || 'Reading Adventure'}
    </div>
    ${lesson.reading.passage}
  </div>

  ${lesson.reading.comprehension && lesson.reading.comprehension.length > 0 ? `
  <div style="margin-top: 10px;">
    ${lesson.reading.comprehension.map((q, i) => `
    <div class="question-item">
      <div class="question-text">Question ${i + 1}: ${q.question}</div>
      <table style="width: 100%; margin-left: 12px; margin-top: 3px;">
        <tr>
          ${q.options.map((opt, idx) => `
          <td style="width: 50%; padding: 2px 0;">
            <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
          </td>
          ${idx === 1 ? '</tr><tr>' : ''}
          `).join('')}
        </tr>
      </table>
    </div>
    `).join('')}
  </div>
  ` : ''}
  ` : ''}

  <!-- ==================== PHẦN 4: LUYỆN TẬP MEGA CHALLENGE ==================== -->
  <div class="section-header">IV. PRACTICE EXERCISES (BÀI TẬP VẬN DỤNG)</div>

  <!-- PART 1: MULTIPLE CHOICE -->
  ${mega?.multipleChoice && mega.multipleChoice.length > 0 ? `
  <div class="part-header">Part 1: Multiple Choice Questions (Chọn đáp án đúng nhất A, B, C hoặc D)</div>
  ${mega.multipleChoice.map((q, i) => `
  <div class="question-item">
    <div class="question-text">Câu ${i + 1}: ${q.question}</div>
    <table style="width: 100%; margin-left: 12px; margin-top: 3px;">
      <tr>
        ${q.options.map((opt, idx) => `
        <td style="width: 50%; padding: 2px 0;">
          <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
        </td>
        ${idx === 1 ? '</tr><tr>' : ''}
        `).join('')}
      </tr>
    </table>
  </div>
  `).join('')}
  ` : ''}

  <!-- PART 2: SENTENCE SCRAMBLE -->
  ${mega?.scramble && mega.scramble.length > 0 ? `
  <div class="part-header" style="margin-top: 18px;">Part 2: Sentence Scramble (Sắp xếp các từ xáo trộn thành câu hoàn chỉnh)</div>
  ${mega.scramble.map((q, i) => `
  <div class="question-item" style="margin-bottom: 14px;">
    <div class="question-text">Câu ${i + 1}: [ ${q.scrambled.join(' / ')} ]</div>
    ${q.translation ? `<div style="font-size: 11pt; color: #475569; font-style: italic; margin-left: 16px;">(Gợi ý: ${q.translation})</div>` : ''}
    <div style="margin-top: 4px; margin-left: 16px;">
      👉 Đáp án: ......................................................................................................................................................
    </div>
  </div>
  `).join('')}
  ` : ''}

  <!-- PART 3: FILL IN THE BLANK -->
  ${mega?.fillBlank && mega.fillBlank.length > 0 ? `
  <div class="part-header" style="margin-top: 18px;">Part 3: Fill in the Blanks (Điền từ thích hợp vào ô trống)</div>
  ${mega.fillBlank.map((q, i) => `
  <div class="question-item" style="margin-bottom: 12px;">
    <div class="question-text">Câu ${i + 1}: ${q.question}</div>
    <div style="margin-top: 4px; margin-left: 16px;">
      👉 Đáp án: ......................................................................................................................................................
    </div>
  </div>
  `).join('')}
  ` : ''}

  <!-- PART 4: VOCABULARY TRANSLATION -->
  ${mega?.vocabTranslation && mega.vocabTranslation.length > 0 ? `
  <div class="part-header" style="margin-top: 18px;">Part 4: Vocabulary Meaning (Chọn nghĩa tiếng Việt đúng của từ vựng)</div>
  ${mega.vocabTranslation.map((q, i) => `
  <div class="question-item">
    <div class="question-text">Câu ${i + 1}: Từ "<strong>${q.word}</strong>" có nghĩa là gì?</div>
    <table style="width: 100%; margin-left: 12px; margin-top: 3px;">
      <tr>
        ${q.options.map((opt, idx) => `
        <td style="width: 50%; padding: 2px 0;">
          <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
        </td>
        ${idx === 1 ? '</tr><tr>' : ''}
        `).join('')}
      </tr>
    </table>
  </div>
  `).join('')}
  ` : ''}

  <!-- PART 5: TRUE OR FALSE -->
  ${mega?.trueFalse && mega.trueFalse.length > 0 ? `
  <div class="part-header" style="margin-top: 18px;">Part 5: True or False (Đọc và xác định câu Đúng [True] hay Sai [False])</div>
  ${mega.trueFalsePassage ? `<div class="passage-box" style="margin-bottom: 8px;">${mega.trueFalsePassage}</div>` : ''}
  ${mega.trueFalse.map((q, i) => `
  <div class="question-item">
    <table style="width: 100%;">
      <tr>
        <td style="width: 75%; font-weight: bold;">Câu ${i + 1}: ${q.statement}</td>
        <td style="width: 25%; text-align: right;">
          [ &nbsp; ] TRUE &nbsp;&nbsp;&nbsp; [ &nbsp; ] FALSE
        </td>
      </tr>
    </table>
  </div>
  `).join('')}
  ` : ''}

  <!-- PART 6: LISTENING TRANSCRIPT & QUESTIONS -->
  ${p?.listening && p.listening.length > 0 ? `
  <div class="part-header" style="margin-top: 18px;">Part 6: Listening Practice (Luyện nghe và chọn đáp án chính xác)</div>
  ${p.listening.map((q, i) => `
  <div class="question-item">
    <div class="question-text">Câu ${i + 1}: ${q.sentenceWithBlank || 'Nghe và chọn câu nói chính xác:'}</div>
    ${q.options && q.options.length > 0 ? `
    <table style="width: 100%; margin-left: 12px; margin-top: 3px;">
      <tr>
        ${q.options.map((opt, idx) => `
        <td style="width: 50%; padding: 2px 0;">
          <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}
        </td>
        ${idx === 1 ? '</tr><tr>' : ''}
        `).join('')}
      </tr>
    </table>
    ` : `
    <div style="margin-top: 4px; margin-left: 16px;">
      👉 Từ cần điền: ..........................................................................................................................................
    </div>
    `}
  </div>
  `).join('')}
  ` : ''}

  <!-- ==================== PHẦN 5: ĐÁP ÁN & LỜI GIẢI CHI TIẾT (NGẮT TRANG) ==================== -->
  ${includeAnswerKey ? `
  <div class="page-break"></div>

  <div style="text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #b91c1c; margin-top: 20px;">
    ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT (ANSWER KEY & EXPLANATIONS)
  </div>
  <div style="text-align: center; font-style: italic; color: #64748b; margin-bottom: 20px;">
    (Dành riêng cho Giáo viên & Phụ huynh chấm bài hoặc học sinh đối chiếu sau khi làm)
  </div>

  <!-- BẢNG ĐÁP ÁN NHANH TRẮC NGHIỆM -->
  ${mega?.multipleChoice && mega.multipleChoice.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 6px;">1. Bảng Đáp Án Trắc Nghiệm (Part 1):</div>
  <table class="answer-table">
    <tr>
      ${mega.multipleChoice.map((_, i) => `<th>C${i + 1}</th>`).join('')}
    </tr>
    <tr>
      ${mega.multipleChoice.map(q => `<td style="font-weight: bold; color: #b91c1c;">${String.fromCharCode(65 + (q.correctAnswer || 0))}</td>`).join('')}
    </tr>
  </table>
  ` : ''}

  <!-- ĐÁP ÁN SẮP XẾP CÂU -->
  ${mega?.scramble && mega.scramble.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0;">2. Đáp Án Sắp Xếp Câu (Part 2):</div>
  <ol style="margin-left: 20px; padding: 0;">
    ${mega.scramble.map(q => `
    <li style="margin-bottom: 5px;">
      <strong>${q.correctSentence}</strong>
      ${q.translation ? `<div style="font-size: 10.5pt; color: #64748b; font-style: italic;">Dịch: ${q.translation}</div>` : ''}
    </li>
    `).join('')}
  </ol>
  ` : ''}

  <!-- ĐÁP ÁN ĐIỀN TỪ -->
  ${mega?.fillBlank && mega.fillBlank.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0;">3. Đáp Án Điền Từ (Part 3):</div>
  <table class="vocab-table">
    <thead>
      <tr>
        <th style="width: 10%; text-align: center;">Câu</th>
        <th style="width: 40%;">Đáp án chính xác</th>
        <th style="width: 50%;">Giải thích</th>
      </tr>
    </thead>
    <tbody>
      ${mega.fillBlank.map((q, i) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${i + 1}</td>
        <td style="font-weight: bold; color: #15803d;">
          ${q.correctAnswer}
          ${q.alternativeAnswers && q.alternativeAnswers.length > 0 ? ` <span style="font-weight: normal; color: #64748b;">(hoặc: ${q.alternativeAnswers.join(', ')})</span>` : ''}
        </td>
        <td style="font-size: 11pt; color: #475569;">${q.explanation || ''}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- ĐÁP ÁN DỊCH TỪ VỰNG -->
  ${mega?.vocabTranslation && mega.vocabTranslation.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0;">4. Đáp Án Dịch Nghĩa Từ Vựng (Part 4):</div>
  <table class="answer-table">
    <tr>
      ${mega.vocabTranslation.map((_, i) => `<th>C${i + 1}</th>`).join('')}
    </tr>
    <tr>
      ${mega.vocabTranslation.map(q => `<td style="font-weight: bold; color: #b91c1c;">${String.fromCharCode(65 + (q.correctAnswer || 0))}</td>`).join('')}
    </tr>
  </table>
  ` : ''}

  <!-- ĐÁP ÁN TRUE / FALSE -->
  ${mega?.trueFalse && mega.trueFalse.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0;">5. Đáp Án True / False (Part 5):</div>
  <table class="vocab-table">
    <thead>
      <tr>
        <th style="width: 10%; text-align: center;">Câu</th>
        <th style="width: 20%; text-align: center;">Đáp án</th>
        <th style="width: 70%;">Giải thích chi tiết</th>
      </tr>
    </thead>
    <tbody>
      ${mega.trueFalse.map((q, i) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${i + 1}</td>
        <td style="text-align: center; font-weight: bold; color: ${q.isTrue ? '#16a34a' : '#dc2626'};">
          ${q.isTrue ? 'TRUE (Đúng)' : 'FALSE (Sai)'}
        </td>
        <td style="font-size: 11pt; color: #475569;">${q.explanation || ''}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- NỘI DUNG VÀ ĐÁP ÁN BÀI NGHE (LISTENING SCRIPT) -->
  ${p?.listening && p.listening.length > 0 ? `
  <div style="font-weight: bold; color: #1e3a8a; margin: 14px 0 6px 0;">6. Lời Đọc Bài Nghe & Đáp Án (Part 6 - Listening Script):</div>
  <table class="vocab-table">
    <thead>
      <tr>
        <th style="width: 10%; text-align: center;">Câu</th>
        <th style="width: 50%;">Lời đọc băng (Audio Script)</th>
        <th style="width: 40%;">Đáp án chính xác</th>
      </tr>
    </thead>
    <tbody>
      ${p.listening.map((q, i) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${i + 1}</td>
        <td style="font-style: italic; color: #1e293b;">"${q.audioText}"</td>
        <td style="font-weight: bold; color: #15803d;">
          ${q.missingWord || (q.options ? `${String.fromCharCode(65 + (q.correctAnswer || 0))}. ${q.options[q.correctAnswer || 0]}` : '')}
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}
  ` : ''}

</body>
</html>`;
};

/**
 * TẢI XUỐNG FILE WORD (.doc)
 * Mở được hoàn hảo trên Microsoft Word, Google Docs, WPS Office với đầy đủ định dạng
 */
export const exportAssignmentToWord = (
  assignment: Assignment,
  includeAnswerKey: boolean = true
): void => {
  try {
    const htmlContent = generateAssignmentHtml(assignment, includeAnswerKey, false);
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = sanitizeFilename(assignment.title || 'Bai_Tap_Tieng_Anh');
    a.download = `${cleanName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Word:', error);
    alert('Có lỗi xảy ra khi tạo file Word. Vui lòng thử lại!');
  }
};

/**
 * XUẤT FILE PDF / IN RA GIẤY A4
 * Mở hộp thoại in của trình duyệt được căn chỉnh lề A4 chuẩn, cho phép:
 * - Bấm "Lưu dưới dạng PDF" (Save as PDF) để tải file PDF về máy
 * - Hoặc in trực tiếp ra máy in giấy A4
 */
export const exportAssignmentToPdf = (
  assignment: Assignment,
  includeAnswerKey: boolean = true
): void => {
  try {
    const htmlContent = generateAssignmentHtml(assignment, includeAnswerKey, true);

    // Create a hidden printable iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert('Không thể mở trình in. Vui lòng thử lại!');
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Wait for content to render, then trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      } finally {
        // Clean up iframe after printing dialog closes
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 500);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Có lỗi xảy ra khi tạo bản in PDF. Vui lòng thử lại!');
  }
};
