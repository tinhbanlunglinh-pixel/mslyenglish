
import React, { useState } from 'react';
import { ReadingAdventure, MultipleChoiceQ } from '../types';
import { playGeminiTTS } from '../services/geminiService';

// Add missing interface definition for ReadingSection props
interface ReadingSectionProps {
  reading: ReadingAdventure;
}

export const ReadingSection: React.FC<ReadingSectionProps> = ({ reading }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const handleAnswer = (qId: string, optIdx: number) => {
    if (submitted[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
    setSubmitted(prev => ({ ...prev, [qId]: true }));
  };

  const playPassage = () => {
    playGeminiTTS(reading.passage);
  };

  if (!reading) return null;

  return (
    <div className="bg-white rounded-[4rem] shadow-2xl border-[10px] border-brand-50 overflow-hidden mb-12 animate-fade-in">
      <div className="bg-brand-600 p-8 md:p-14 text-white relative">
         <div className="absolute top-8 right-8 text-7xl opacity-20">📖</div>
         <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">Reading Adventure</h2>
         <h3 className="text-2xl md:text-3xl font-black text-highlight-300 drop-shadow-sm">{reading.title}</h3>
      </div>
      
      <div className="p-8 md:p-16 grid lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <div className="flex justify-between items-center border-b-4 border-slate-50 pb-6">
             <button onClick={playPassage} className="bg-brand-100 text-brand-700 px-8 py-3 rounded-full font-black text-xl flex items-center gap-3 hover:bg-brand-200 shadow-lg transform active:scale-95 transition-all">
                <span>🔊</span> Listen Story
             </button>
             <button onClick={() => setShowTranslation(!showTranslation)} className="text-lg font-black text-slate-400 hover:text-brand-500 underline uppercase tracking-widest">
                {showTranslation ? 'Hide Translation' : 'View Translation'}
             </button>
          </div>
          
          <div className="bg-slate-50 p-10 md:p-14 rounded-[4rem] border-4 border-slate-100 shadow-inner relative group">
             <p className="text-3xl md:text-4xl font-black leading-relaxed text-slate-800 italic font-display">
               "{reading.passage}"
             </p>
             {showTranslation && (
                <div className="mt-10 pt-10 border-t-4 border-slate-200 animate-fade-in">
                   <p className="text-2xl text-slate-500 font-black italic">{reading.translation}</p>
                </div>
             )}
          </div>
        </div>

        <div className="space-y-10">
           <h4 className="text-3xl font-black text-brand-800 uppercase tracking-widest flex items-center gap-4">
              <span>❓</span> Comprehension Check
           </h4>
           
           <div className="space-y-8">
             {(reading.comprehension || []).map((q, idx) => (
                <div key={q.id} className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl transition-all hover:border-brand-200 group">
                   <p className="font-black text-2xl text-slate-800 mb-6 flex gap-4 leading-tight">
                     <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-xl h-fit">Q{idx + 1}</span>
                     {q.question}
                   </p>
                   <div className="grid grid-cols-1 gap-4">
                      {(q.options || []).map((opt, i) => (
                         <button
                           key={i}
                           onClick={() => handleAnswer(q.id, i)}
                           disabled={submitted[q.id]}
                           className={`w-full text-left p-5 rounded-2xl border-4 transition-all font-black text-xl shadow-sm ${
                             submitted[q.id]
                               ? i === q.correctAnswer ? 'bg-green-100 border-green-500 text-green-700 scale-[1.02]' : answers[q.id] === i ? 'bg-red-100 border-red-500 text-red-700 opacity-80' : 'bg-slate-50 opacity-40'
                               : 'bg-white border-slate-100 hover:border-brand-300 hover:bg-brand-50 hover:-translate-y-1'
                           }`}
                         >
                            <span className="mr-4 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                            {opt}
                         </button>
                      ))}
                   </div>
                   {submitted[q.id] && (
                      <div className={`mt-6 p-6 rounded-2xl text-lg italic font-black flex items-start gap-3 ${answers[q.id] === q.correctAnswer ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                        <span>💡</span>
                        <span>{q.explanation}</span>
                      </div>
                   )}
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
