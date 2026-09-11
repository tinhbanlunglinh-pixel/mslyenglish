import React from 'react';
import { CheckCircle2, Zap, Sparkles, KeyRound } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AiProvider } from '../types';

interface HeaderProps {
  apiKey: string;
  provider?: AiProvider;
  selectedModel?: string;
  onOpenApiKeyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  apiKey, 
  provider = 'gemini', 
  selectedModel = 'gemini-3.6-flash', 
  onOpenApiKeyModal 
}) => {
  // Format human-friendly model label
  const formatModelName = (modelId: string, prov?: string) => {
    if (prov === 'agent-platform') {
      return `Agent Platform: ${modelId.replace('gemini-', '').replace('-preview', ' (P)')}`;
    }
    if (modelId === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
    if (modelId === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
    if (modelId === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Lite';
    if (modelId === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Lite';
    if (modelId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
    return modelId;
  };

  return (
    <header className="bg-brand-green border-b border-brand-green-dark sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-brand-yellow uppercase truncate">
              Ms Lý English
            </h1>
            <p className="hidden sm:block text-[10px] text-emerald-100 font-bold tracking-wider uppercase">
              AI Powered Speaking Platform
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            onClick={onOpenApiKeyModal}
            className="flex flex-col items-end group focus:outline-none"
            title="Cài đặt API Key và Model"
          >
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all border shadow-sm ${
              !apiKey 
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 border-amber-300 animate-pulse font-black'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}>
              {!apiKey ? (
                <KeyRound size={14} className="text-slate-900 shrink-0" />
              ) : (
                <Zap size={14} className="text-brand-yellow shrink-0 sm:w-4 sm:h-4" />
              )}
              
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                  Cài đặt API Key
                </span>
                {apiKey ? (
                  <span className="text-[10px] text-brand-yellow font-bold truncate max-w-[120px] sm:max-w-[160px]">
                    {formatModelName(selectedModel, provider)}
                  </span>
                ) : (
                  <span className="text-[10px] text-red-700 font-extrabold whitespace-nowrap">
                    Nhập key để sử dụng
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-4 text-xs font-bold text-white/80">
            <span className="flex items-center gap-1.5 bg-brand-green-dark/40 px-3 py-1.5 rounded-full border border-white/10">
              <CheckCircle2 size={16} className="text-brand-yellow" /> Fly high with English
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
