import {
  PracticeContent,
  MultipleChoiceQ,
  ScrambleQ,
  FillInputQ,
  VocabTranslationQ,
  TrueFalseQ,
  MatchingPair,
  ListeningQ,
  VocabularyItem,
  GrammarSection,
  ReadingAdventure
} from '../types';
import { expandContractions, contractToShort } from './smartGrading';

/**
 * Generate contraction variations for an answer
 * e.g., "don't" -> ["do not"], "I am" -> ["I'm"]
 */
export const getAnswerVariations = (ans: string): string[] => {
  if (!ans || typeof ans !== 'string') return [];
  const clean = ans.trim();
  const variations = new Set<string>();

  const expanded = expandContractions(clean);
  if (expanded.toLowerCase() !== clean.toLowerCase()) {
    variations.add(expanded);
  }

  const contracted = contractToShort(clean);
  if (contracted.toLowerCase() !== clean.toLowerCase()) {
    variations.add(contracted);
  }

  // Common single-word equivalents
  const lower = clean.toLowerCase();
  if (lower === "'s") variations.add("is");
  if (lower === "is") variations.add("'s");
  if (lower === "'re") variations.add("are");
  if (lower === "are") variations.add("'re");
  if (lower === "'m") variations.add("am");
  if (lower === "am") variations.add("'m");
  if (lower === "cannot") variations.add("can't");
  if (lower === "can't") variations.add("cannot");

  return Array.from(variations).filter(v => v.toLowerCase() !== clean.toLowerCase());
};

// Fallback Vietnamese distractors for vocabulary translation
const FALLBACK_DISTRACTORS = [
  'học sinh', 'giáo viên', 'trường học', 'lớp học', 'bạn bè',
  'sách vở', 'bút mực', 'thước kẻ', 'gia đình', 'ngôi nhà',
  'màu sắc', 'thời gian', 'bữa ăn', 'thể thao', 'trò chơi',
  'xe đạp', 'cửa sổ', 'bàn học', 'thời tiết', 'âm nhạc'
];

/**
 * Ensures that PracticeContent has complete, robust, non-empty questions
 * for every single exercise category.
 * If Gemini returned partial data or empty arrays, synthesizes high-quality
 * questions using the core lesson (vocabulary, grammar, reading).
 */
export const ensureCompletePracticeContent = (
  rawPractice: any,
  core: {
    topic?: string;
    vocabulary?: VocabularyItem[];
    grammar?: GrammarSection;
    reading?: ReadingAdventure;
    teacherTips?: string;
  }
): PracticeContent => {
  const vocabList: VocabularyItem[] = (core.vocabulary && core.vocabulary.length > 0)
    ? core.vocabulary
    : [
        { word: 'school', emoji: '🏫', ipa: '/skuːl/', meaning: 'trường học', example: 'I go to school every day.', sentenceMeaning: 'tôi đi học mỗi ngày.', type: 'noun' },
        { word: 'teacher', emoji: '👩‍🏫', ipa: '/ˈtiːtʃə/', meaning: 'giáo viên', example: 'Mrs. Dung is my English teacher.', sentenceMeaning: 'cô dung là giáo viên tiếng anh của tôi.', type: 'noun' },
        { word: 'book', emoji: '📚', ipa: '/bʊk/', meaning: 'quyển sách', example: 'I read an interesting book.', sentenceMeaning: 'tôi đọc một quyển sách thú vị.', type: 'noun' },
        { word: 'friend', emoji: '🤝', ipa: '/frend/', meaning: 'bạn bè', example: 'Nam is my best friend.', sentenceMeaning: 'nam là người bạn thân nhất của tôi.', type: 'noun' },
        { word: 'happy', emoji: '😊', ipa: '/ˈhæpi/', meaning: 'vui vẻ, hạnh phúc', example: 'We are very happy today.', sentenceMeaning: 'chúng tôi rất vui vẻ hôm nay.', type: 'adjective' },
      ];

  const rawMega = rawPractice?.megaTest || rawPractice || {};

  // ==================== 1. LISTENING ====================
  let listening: ListeningQ[] = Array.isArray(rawPractice?.listening)
    ? rawPractice.listening
    : (Array.isArray(rawMega?.listening) ? rawMega.listening : []);

  if (listening.length < 5) {
    const existingIds = new Set(listening.map(q => q.id));
    vocabList.forEach((v, idx) => {
      const qId = `lis_gen_${idx + 1}`;
      if (existingIds.has(qId) || listening.length >= 5) return;

      const fullSentence = v.example || `This is a ${v.word}.`;
      const regex = new RegExp(`\\b${v.word}\\b`, 'i');
      const sentenceWithBlank = fullSentence.replace(regex, '______');

      // Create 3 distractor sentences
      const otherVocab = vocabList.filter(o => o.word !== v.word);
      const distractors = [
        `I like my ${v.word}.`,
        `She has a ${otherVocab[0]?.word || 'book'}.`,
        `We see the ${otherVocab[1]?.word || 'school'}.`
      ].filter(d => d.toLowerCase() !== fullSentence.toLowerCase());

      const options = [fullSentence, ...distractors.slice(0, 3)];
      // Shuffle options
      const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
      const correctIdx = shuffledOptions.indexOf(fullSentence);

      listening.push({
        id: qId,
        audioText: fullSentence,
        sentenceWithBlank: sentenceWithBlank !== fullSentence ? sentenceWithBlank : `I have a ______ (${v.meaning}).`,
        missingWord: v.word,
        alternativeAnswers: [v.word, ...getAnswerVariations(v.word)],
        options: shuffledOptions,
        correctAnswer: correctIdx >= 0 ? correctIdx : 0,
        explanation: `Câu đọc hoàn chỉnh: "${fullSentence}" (Nghĩa: ${v.sentenceMeaning || v.meaning})`
      });
      existingIds.add(qId);
    });
  }

  // Ensure every listening question has alternativeAnswers with contractions/variations
  listening = listening.map(q => ({
    ...q,
    alternativeAnswers: Array.from(new Set([
      ...(q.alternativeAnswers || []),
      ...(q.missingWord ? [q.missingWord, ...getAnswerVariations(q.missingWord)] : [])
    ]))
  }));

  // ==================== 2. MULTIPLE CHOICE ====================
  let multipleChoice: MultipleChoiceQ[] = Array.isArray(rawMega?.multipleChoice)
    ? rawMega.multipleChoice
    : (Array.isArray(rawPractice?.multipleChoice) ? rawPractice.multipleChoice : []);

  if (multipleChoice.length < 10) {
    const existingIds = new Set(multipleChoice.map(q => q.id));

    // First use comprehension questions from reading if available
    if (core.reading?.comprehension && Array.isArray(core.reading.comprehension)) {
      core.reading.comprehension.forEach((cQ, i) => {
        const qId = `mc_comp_${i + 1}`;
        if (!existingIds.has(qId) && multipleChoice.length < 10) {
          multipleChoice.push({
            id: qId,
            question: cQ.question,
            options: cQ.options,
            correctAnswer: cQ.correctAnswer,
            explanation: cQ.explanation || 'Dựa vào thông tin trong bài đọc.'
          });
          existingIds.add(qId);
        }
      });
    }

    // Next generate from vocabulary
    vocabList.forEach((v, idx) => {
      const qId = `mc_gen_${idx + 1}`;
      if (existingIds.has(qId) || multipleChoice.length >= 10) return;

      const sentence = v.example || `This is a ${v.word}.`;
      const regex = new RegExp(`\\b${v.word}\\b`, 'i');
      const questionText = sentence.replace(regex, '____');

      const otherWords = vocabList.filter(o => o.word !== v.word).map(o => o.word);
      const distractors = [...otherWords, 'happy', 'pencil', 'friend', 'house'].filter(w => w !== v.word).slice(0, 3);
      const allOpts = [v.word, ...distractors].sort(() => Math.random() - 0.5);
      const correctIdx = allOpts.indexOf(v.word);

      multipleChoice.push({
        id: qId,
        question: questionText !== sentence ? questionText : `What is the word for "${v.meaning}"?`,
        options: allOpts,
        correctAnswer: correctIdx >= 0 ? correctIdx : 0,
        explanation: `${v.word} (${v.ipa || ''}): ${v.meaning}. Ví dụ: "${sentence}"`
      });
      existingIds.add(qId);
    });

    // If still < 10, generate grammar questions
    if (core.grammar?.examples && core.grammar.examples.length > 0) {
      core.grammar.examples.forEach((ex, idx) => {
        const qId = `mc_gram_${idx + 1}`;
        if (existingIds.has(qId) || multipleChoice.length >= 10) return;

        const cleanEx = ex.split('→')[0].trim();
        multipleChoice.push({
          id: qId,
          question: `Choose the correct sentence for ${core.grammar?.topic || 'grammar'}:`,
          options: [
            cleanEx,
            cleanEx.replace(/\b(is|are|am|goes|plays|has)\b/i, 'going'),
            cleanEx.replace(/\b(is|are|am|goes|plays|has)\b/i, 'was not'),
            `They not ${cleanEx.toLowerCase()}`
          ].sort(() => Math.random() - 0.5),
          correctAnswer: 0,
          explanation: `Ngữ pháp: ${core.grammar?.topic}. Ví dụ chuẩn: "${cleanEx}"`
        });
        existingIds.add(qId);
      });
    }

    // If still < 10, generate from standard English curriculum
    const standardMC = [
      { q: "She ____ an English book.", opts: ["reads", "reading", "readed", "reades"], ans: 0, exp: "Thì hiện tại đơn với She thêm 's'." },
      { q: "We ____ students in Mrs. Dung's class.", opts: ["are", "is", "am", "be"], ans: 0, exp: "Chủ ngữ 'We' đi với động từ to be 'are'." },
      { q: "I ____ like noisy places.", opts: ["don't", "doesn't", "not", "isn't"], ans: 0, exp: "Chủ ngữ 'I' dùng trợ động từ phủ định 'don't'." },
      { q: "____ your school big?", opts: ["Is", "Are", "Do", "Does"], ans: 0, exp: "'Your school' số ít nên dùng 'Is'." },
      { q: "They ____ football in the afternoon.", opts: ["play", "plays", "playing", "played"], ans: 0, exp: "'They' số nhiều nên động từ 'play' giữ nguyên mẫu." }
    ];
    standardMC.forEach((m, idx) => {
      const qId = `mc_std_${idx + 1}`;
      if (!existingIds.has(qId) && multipleChoice.length < 10) {
        multipleChoice.push({
          id: qId,
          question: m.q,
          options: m.opts,
          correctAnswer: m.ans,
          explanation: m.exp
        });
        existingIds.add(qId);
      }
    });
  }

  // ==================== 3. SCRAMBLE ====================
  let scramble: ScrambleQ[] = Array.isArray(rawMega?.scramble)
    ? rawMega.scramble
    : (Array.isArray(rawPractice?.scramble) ? rawPractice.scramble : []);

  if (scramble.length < 10) {
    const existingIds = new Set(scramble.map(q => q.id));

    const sentencesToScramble: Array<{ text: string; vi?: string }> = [];
    vocabList.forEach(v => {
      if (v.example) sentencesToScramble.push({ text: v.example, vi: v.sentenceMeaning });
    });
    if (core.grammar?.examples) {
      core.grammar.examples.forEach(ex => {
        const parts = ex.split('→');
        sentencesToScramble.push({ text: parts[0].trim(), vi: parts[1]?.trim() });
      });
    }

    sentencesToScramble.forEach((item, idx) => {
      const qId = `sc_gen_${idx + 1}`;
      if (existingIds.has(qId) || scramble.length >= 10) return;

      const cleanSentence = item.text.replace(/\s+/g, ' ').trim();
      const words = cleanSentence.split(' ').filter(Boolean);
      if (words.length < 3) return;

      // Shuffle words ensuring it's not identical to original
      let shuffled = [...words].sort(() => Math.random() - 0.5);
      if (shuffled.join(' ') === cleanSentence && words.length > 2) {
        shuffled = [words[words.length - 1], ...words.slice(0, words.length - 1)];
      }

      scramble.push({
        id: qId,
        scrambled: shuffled,
        correctSentence: cleanSentence,
        translation: item.vi || 'Sắp xếp các từ để hoàn thành câu tiếng Anh đúng ngữ pháp.'
      });
      existingIds.add(qId);
    });

    // Standard scramble if still < 10
    const standardScramble = [
      { s: "English is my favourite subject.", t: "Tiếng Anh là môn học yêu thích của tôi." },
      { s: "I love learning with Mrs. Dung.", t: "Tôi yêu thích học tiếng Anh cùng cô Dung." },
      { s: "We do our homework every day.", t: "Chúng tôi làm bài tập mỗi ngày." },
      { s: "They are friendly classmates.", t: "Họ là những người bạn cùng lớp thân thiện." },
      { s: "My school has a big playground.", t: "Trường tôi có một sân chơi lớn." }
    ];
    standardScramble.forEach((item, idx) => {
      const qId = `sc_std_${idx + 1}`;
      if (!existingIds.has(qId) && scramble.length < 10) {
        const words = item.s.split(' ');
        scramble.push({
          id: qId,
          scrambled: [...words].sort(() => Math.random() - 0.5),
          correctSentence: item.s,
          translation: item.t
        });
        existingIds.add(qId);
      }
    });
  }

  // ==================== 4. FILL IN THE BLANK ====================
  let fillBlank: FillInputQ[] = Array.isArray(rawMega?.fillBlank)
    ? rawMega.fillBlank
    : (Array.isArray(rawPractice?.fillBlank) ? rawPractice.fillBlank : []);

  if (fillBlank.length < 10) {
    const existingIds = new Set(fillBlank.map(q => q.id));

    vocabList.forEach((v, idx) => {
      const qId = `fb_gen_${idx + 1}`;
      if (existingIds.has(qId) || fillBlank.length >= 10) return;

      const sentence = v.example || `I have a new ${v.word}.`;
      const regex = new RegExp(`\\b${v.word}\\b`, 'i');
      const questionText = sentence.replace(regex, '____');

      fillBlank.push({
        id: qId,
        question: questionText !== sentence ? questionText : `Điền từ thích hợp: I like my ____ (${v.meaning}).`,
        correctAnswer: v.word,
        alternativeAnswers: [v.word, ...getAnswerVariations(v.word)],
        clueEmoji: v.emoji || '📝',
        explanation: `${v.word}: ${v.meaning}. Câu hoàn chỉnh: "${sentence}"`
      });
      existingIds.add(qId);
    });

    // Fill remaining up to 10 with grammar blanks if needed
    if (fillBlank.length < 10 && core.grammar?.examples) {
      core.grammar.examples.forEach((ex, idx) => {
        const qId = `fb_gram_${idx + 1}`;
        if (existingIds.has(qId) || fillBlank.length >= 10) return;

        const cleanSentence = ex.split('→')[0].trim();
        const match = cleanSentence.match(/\b(is|am|are|goes|play|plays|wears|have|has|do|does)\b/i);
        if (match) {
          const targetWord = match[0];
          const qText = cleanSentence.replace(match[0], '____');
          fillBlank.push({
            id: qId,
            question: qText,
            correctAnswer: targetWord,
            alternativeAnswers: [targetWord, ...getAnswerVariations(targetWord)],
            clueEmoji: '✨',
            explanation: `Ngữ pháp: ${core.grammar?.topic}. Đáp án đúng là "${targetWord}".`
          });
          existingIds.add(qId);
        }
      });
    }

    // Standard fill blank if still < 10
    const standardFB = [
      { q: "I ____ a student.", a: "am", em: "🎒", exp: "I am (hoặc I'm) a student." },
      { q: "She ____ to school every day.", a: "goes", em: "🏫", exp: "Chủ ngữ She đi với 'goes'." },
      { q: "We ____ happy today.", a: "are", em: "😊", exp: "We are (hoặc We're) happy." },
      { q: "This is my English ____.", a: "book", em: "📚", exp: "This is my English book (quyển sách)." },
      { q: "I ____ my homework every evening.", a: "do", em: "✏️", exp: "I do my homework (làm bài tập về nhà)." }
    ];
    standardFB.forEach((item, idx) => {
      const qId = `fb_std_${idx + 1}`;
      if (!existingIds.has(qId) && fillBlank.length < 10) {
        fillBlank.push({
          id: qId,
          question: item.q,
          correctAnswer: item.a,
          alternativeAnswers: [item.a, ...getAnswerVariations(item.a)],
          clueEmoji: item.em,
          explanation: item.exp
        });
        existingIds.add(qId);
      }
    });
  }

  // Ensure all fillBlank items have answer variations with contractions
  fillBlank = fillBlank.map(q => ({
    ...q,
    alternativeAnswers: Array.from(new Set([
      ...(q.alternativeAnswers || []),
      q.correctAnswer,
      ...getAnswerVariations(q.correctAnswer)
    ]))
  }));

  // ==================== 5. VOCAB TRANSLATION ====================
  let vocabTranslation: VocabTranslationQ[] = Array.isArray(rawMega?.vocabTranslation)
    ? rawMega.vocabTranslation
    : (Array.isArray(rawPractice?.vocabTranslation) ? rawPractice.vocabTranslation : []);

  if (vocabTranslation.length < 10) {
    const existingIds = new Set(vocabTranslation.map(q => q.id));

    vocabList.forEach((v, idx) => {
      const qId = `vt_gen_${idx + 1}`;
      if (existingIds.has(qId) || vocabTranslation.length >= 10) return;

      const otherMeanings = vocabList
        .filter(o => o.word !== v.word && o.meaning)
        .map(o => o.meaning);

      const combinedDistractors = [
        ...otherMeanings,
        ...FALLBACK_DISTRACTORS.filter(d => d !== v.meaning)
      ];

      const chosenDistractors = combinedDistractors.slice(0, 3);
      const options = [v.meaning, ...chosenDistractors].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(v.meaning);

      vocabTranslation.push({
        id: qId,
        word: v.word,
        options,
        correctAnswer: correctIdx >= 0 ? correctIdx : 0,
        explanation: `${v.word} (${v.ipa || ''}) có nghĩa là: "${v.meaning}".`
      });
      existingIds.add(qId);
    });

    // If vocabList has fewer than 10, add more general educational vocab
    const additionalWords = [
      { word: 'listen', meaning: 'lắng nghe', ipa: '/ˈlɪsn/' },
      { word: 'read', meaning: 'đọc', ipa: '/riːd/' },
      { word: 'write', meaning: 'viết', ipa: '/raɪt/' },
      { word: 'speak', meaning: 'nói', ipa: '/spiːk/' },
      { word: 'practice', meaning: 'luyện tập', ipa: '/ˈpræktɪs/' },
    ];

    additionalWords.forEach((aw, idx) => {
      const qId = `vt_extra_${idx + 1}`;
      if (existingIds.has(qId) || vocabTranslation.length >= 10) return;

      const distractors = FALLBACK_DISTRACTORS.filter(d => d !== aw.meaning).slice(0, 3);
      const options = [aw.meaning, ...distractors].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(aw.meaning);

      vocabTranslation.push({
        id: qId,
        word: aw.word,
        options,
        correctAnswer: correctIdx >= 0 ? correctIdx : 0,
        explanation: `${aw.word} (${aw.ipa}) có nghĩa là: "${aw.meaning}".`
      });
      existingIds.add(qId);
    });
  }

  // ==================== 6. TRUE / FALSE ====================
  const passage = rawMega?.trueFalsePassage ||
    core.reading?.passage ||
    (core.reading?.title ? `${core.reading.title}. We learn English every day at school with Mrs. Dung. English is fun and exciting.` : 'We learn English every day at school.');

  let trueFalse: TrueFalseQ[] = Array.isArray(rawMega?.trueFalse)
    ? rawMega.trueFalse
    : (Array.isArray(rawPractice?.trueFalse) ? rawPractice.trueFalse : []);

  if (trueFalse.length < 5) {
    const existingIds = new Set(trueFalse.map(q => q.id));

    // Generate from reading passage sentences or vocabulary
    if (vocabList.length >= 3) {
      const v0 = vocabList[0];
      const v1 = vocabList[1];
      const v2 = vocabList[2];

      const tfTemplates = [
        {
          id: 'tf_gen_1',
          statement: v0.example || `A ${v0.word} is used in school.`,
          isTrue: true,
          explanation: `Đúng theo bài học: "${v0.example || v0.word}"`
        },
        {
          id: 'tf_gen_2',
          statement: `The English word "${v1.word}" means "con cá mập".`,
          isTrue: false,
          explanation: `Sai. Từ "${v1.word}" có nghĩa là "${v1.meaning}".`
        },
        {
          id: 'tf_gen_3',
          statement: `Students can learn ${core.topic || 'English'} on the Mrs. Dung app.`,
          isTrue: true,
          explanation: 'Đúng. Học sinh đang học bài tập trên ứng dụng English Mrs. Dung.'
        },
        {
          id: 'tf_gen_4',
          statement: `The word "${v2.word}" is an English word.`,
          isTrue: true,
          explanation: `Đúng. "${v2.word}" là một từ vựng tiếng Anh trong bài.`
        },
        {
          id: 'tf_gen_5',
          statement: `Students never need to do homework or practice.`,
          isTrue: false,
          explanation: 'Sai. Học sinh cần chăm chỉ làm bài tập để ghi nhớ kiến thức lâu hơn.'
        }
      ];

      tfTemplates.forEach(item => {
        if (!existingIds.has(item.id) && trueFalse.length < 5) {
          trueFalse.push(item);
          existingIds.add(item.id);
        }
      });
    }
  }

  // ==================== 7. MATCHING ====================
  let matching: MatchingPair[] = Array.isArray(rawMega?.matching)
    ? rawMega.matching
    : (Array.isArray(rawPractice?.matching) ? rawPractice.matching : []);

  if (matching.length < 5) {
    matching = vocabList.map((v, i) => ({
      id: `m_gen_${i + 1}`,
      left: v.word,
      right: v.meaning
    }));
  }

  return {
    listening,
    megaTest: {
      multipleChoice,
      scramble,
      fillBlank,
      errorId: rawMega?.errorId || [],
      vocabTranslation,
      trueFalsePassage: passage,
      trueFalse,
      matching
    }
  };
};
