
import React, { useState } from 'react';
import { generateMindMap, fileToBase64, generatePresentation, playGeminiTTS } from '../services/geminiService';
import { MindMapData, MindMapMode, PresentationScript } from '../types';
import { MindMap } from './MindMap';
import { PresentationScriptView } from './PresentationScript';

export const MindMapTab: React.FC = () => {
  const [mode, setMode] = useState<MindMapMode>(MindMapMode.TOPIC);
  const [inputContent, setInputContent] = useState('');
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [presentation, setPresentation] = useState<PresentationScript | null>(null);
  const [isGeneratingPres, setIsGeneratingPres] = useState(false);
  const [studentName, setStudentName] = useState('');

  const handleGenerate = async () => {
    if (mode === MindMapMode.IMAGE && selectedFiles.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ảnh nhé!");
      return;
    }
    if (mode !== MindMapMode.IMAGE && !inputContent.trim()) {
      setError("Vui lòng nhập nội dung con muốn tạo sơ đồ nhé!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    setPresentation(null); 

    try {
      let contentToProcess: any = inputContent;
      if (mode === MindMapMode.IMAGE) {
        contentToProcess = await Promise.all(selectedFiles.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type || 'image/jpeg'
        })));
      }
      const result = await generateMindMap(contentToProcess, mode);
      setMindMapData(result);
      // Auto scroll to mind map
      setTimeout(() => {
        window.scrollTo({ top: document.getElementById('mindmap-result')?.offsetTop || 0, behavior: 'smooth' });
      }, 500);
    } catch (err: any) {
      setError(err.message || "Bé ơi, có lỗi khi tạo sơ đồ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
      if (!mindMapData) return;
      setIsGeneratingPres(true);
      try {
          const script = await generatePresentation(mindMapData);
          setPresentation(script);
          // Auto scroll to presentation
          setTimeout(() => {
            window.scrollTo({ top: document.getElementById('presentation-result')?.offsetTop || 0, behavior: 'smooth' });
          }, 500);
          // Play audio intro after generating
          await playGeminiTTS(script.introduction.english);
      } catch (e) { 
          alert("Lỗi khi soạn bài thuyết trình cho con!"); 
      } finally { 
          setIsGeneratingPres(false); 
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setSelectedFiles(files);
      
      imagePreviews.forEach((url: string) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setImagePreviews(files.map((f: File) => URL.createObjectURL(f)));
    }
  };

  return (
    <div className="w-full pb-20">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black text-indigo-600 font-display mb-3 tracking-tighter">Mindmap Maker 🧠</h2>
        <p className="text-2xl text-slate-500 max-w-2xl mx-auto font-medium italic">"Biến mọi nội dung bài học thành sơ đồ tư duy 3D tuyệt đẹp và luyện thuyết trình!"</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        <div className="bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border-[15px] border-indigo-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-8xl opacity-5">🧠</div>
          <div className="flex bg-slate-100 p-2 rounded-[2rem] mb-10 gap-2 shadow-inner">
            {[
              { id: MindMapMode.TOPIC, label: 'Chủ đề', icon: '💡' },
              { id: MindMapMode.TEXT, label: 'Văn bản', icon: '📝' },
              { id: MindMapMode.IMAGE, label: 'Hình ảnh', icon: '📸' }
            ].map((m) => (
              <button 
                key={m.id} 
                onClick={() => { setMode(m.id); setError(null); }} 
                className={`flex-1 py-5 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-3 transition-all ${mode === m.id ? 'bg-indigo-500 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
              >
                <span>{m.icon}</span> <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {mode === MindMapMode.IMAGE ? (
               <div className="flex flex-col gap-6">
                 <div className="border-4 border-dashed border-indigo-200 bg-indigo-50/20 rounded-[2.5rem] p-12 text-center relative group cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    <div className="text-indigo-300 text-7xl mb-4 group-hover:scale-110 transition-transform">🖼️</div>
                    <p className="text-indigo-400 font-black text-2xl uppercase tracking-tighter">Nhấn để tải ảnh bài học lên</p>
                    <p className="text-slate-400 font-bold mt-2">(Tải tối đa 5 tấm ảnh sách hoặc vở bài tập)</p>
                 </div>
                 <div className="flex gap-4 overflow-x-auto pb-4 justify-center">
                    {imagePreviews.map((src, i) => (
                      <img key={i} src={src} className="w-28 h-28 object-cover rounded-2xl border-4 border-white shadow-xl transform rotate-2" />
                    ))}
                 </div>
               </div>
            ) : (
               <textarea 
                 value={inputContent} 
                 onChange={e => setInputContent(e.target.value)} 
                 placeholder={mode === MindMapMode.TOPIC ? "Nhập chủ đề ngắn gọn (VD: Animals, My school...)" : "Dán toàn bộ văn bản bài học hoặc đoạn văn của con vào đây..."} 
                 className="w-full p-8 text-2xl rounded-[2.5rem] border-4 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all font-bold text-slate-700 min-h-[250px] resize-none" 
               />
            )}
            
            <button 
              onClick={handleGenerate} 
              disabled={isLoading} 
              className="w-full py-8 bg-indigo-500 border-b-[15px] border-indigo-700 text-white rounded-[3rem] font-black text-4xl shadow-2xl hover:bg-indigo-400 transform active:scale-[0.98] active:translate-y-2 active:border-b-0 transition-all uppercase tracking-tighter"
            >
               {isLoading ? '🤖 ĐANG PHÂN TÍCH...' : '🚀 TẠO SƠ ĐỒ NGAY'}
            </button>
            {error && <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl text-red-600 text-center font-black text-xl animate-bounce">⚠️ {error}</div>}
          </div>
        </div>

        {mindMapData && (
          <div id="mindmap-result" className="animate-fade-in flex flex-col items-center space-y-16">
             <MindMap data={mindMapData} />
             
             <div className="w-full max-w-5xl pt-20 border-t-8 border-dashed border-indigo-100 flex flex-col items-center gap-12">
                <div className="text-center space-y-6 w-full max-w-2xl">
                   <div className="inline-block bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-sm">BƯỚC TIẾP THEO ✨</div>
                   <h3 className="text-4xl md:text-5xl font-black text-emerald-800 font-display tracking-tight">🎤 LUYỆN THUYẾT TRÌNH</h3>
                   <p className="text-xl text-slate-500 font-bold italic">"Mrs. Dung AI sẽ soạn bài mẫu và chấm điểm bài nói của con!"</p>
                   <input 
                     type="text" 
                     placeholder="Nhập tên của con để in giấy khen nhé..." 
                     value={studentName} 
                     onChange={e => setStudentName(e.target.value)} 
                     className="p-6 w-full rounded-[2.5rem] border-8 border-emerald-50 font-black text-3xl text-center outline-none bg-emerald-50/20 focus:bg-white focus:border-emerald-400 transition-all" 
                   />
                </div>
                
                <button 
                  onClick={handleGeneratePresentation} 
                  disabled={isGeneratingPres} 
                  className="w-full max-w-3xl py-8 bg-emerald-500 border-b-[15px] border-emerald-700 text-white font-black rounded-[3rem] shadow-2xl hover:bg-emerald-400 transition-all text-4xl uppercase tracking-tighter transform active:translate-y-4 active:border-b-0"
                >
                   {isGeneratingPres ? '🤖 ĐANG SOẠN BÀI NÓI...' : '📝 SOẠN BÀI THUYẾT TRÌNH'}
                </button>
                
                {presentation && (
                  <div id="presentation-result" className="w-full">
                    <PresentationScriptView script={presentation} studentName={studentName} />
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
