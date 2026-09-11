import React, { useState, useEffect } from 'react';
import { Zap, ExternalLink, Check, ShieldCheck, Cpu, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiProvider } from '../types';
import { 
  GEMINI_MODEL_OPTIONS, 
  AGENT_PLATFORM_MODEL_OPTIONS, 
  STORAGE_KEYS, 
  isValidGoogleAiApiKey,
  getAiProvider,
  getApiKeyForProvider,
  getSelectedModel
} from '../services/geminiService';

interface ApiKeyModalProps {
  show: boolean;
  currentApiKey: string;
  onSave: (key: string, provider: AiProvider, model: string) => void;
  onClose: () => void;
  initialProvider?: AiProvider;
  initialModel?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  show, 
  currentApiKey, 
  onSave, 
  onClose,
  initialProvider,
  initialModel
}) => {
  // Provider selection: 'gemini' or 'agent-platform'
  const [provider, setProvider] = useState<AiProvider>(() => initialProvider || getAiProvider());
  
  // Independent key state per provider
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return getApiKeyForProvider('gemini') || currentApiKey || '';
  });
  const [agentPlatformKey, setAgentPlatformKey] = useState<string>(() => {
    return getApiKeyForProvider('agent-platform') || '';
  });

  // Selected model
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return initialModel || getSelectedModel();
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when modal is opened
  useEffect(() => {
    if (show) {
      const activeProvider = initialProvider || getAiProvider();
      setProvider(activeProvider);
      
      const gKey = getApiKeyForProvider('gemini') || currentApiKey || '';
      const apKey = getApiKeyForProvider('agent-platform') || '';
      setGeminiKey(gKey);
      setAgentPlatformKey(apKey);

      const curModel = initialModel || getSelectedModel();
      // Ensure model aligns with active provider
      if (activeProvider === 'agent-platform') {
        const isValidApModel = AGENT_PLATFORM_MODEL_OPTIONS.some(m => m.id === curModel);
        setSelectedModel(isValidApModel ? curModel : 'gemini-2.5-flash');
      } else {
        const isValidGeminiModel = GEMINI_MODEL_OPTIONS.some(m => m.id === curModel);
        setSelectedModel(isValidGeminiModel ? curModel : 'gemini-3.6-flash');
      }
      setValidationError(null);
    }
  }, [show, currentApiKey, initialProvider, initialModel]);

  const activeKey = provider === 'gemini' ? geminiKey : agentPlatformKey;
  const currentModelOptions = provider === 'gemini' ? GEMINI_MODEL_OPTIONS : AGENT_PLATFORM_MODEL_OPTIONS;

  // Handle tab switch
  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setValidationError(null);
    // Auto-normalize model if current model isn't in new provider's list
    if (newProvider === 'agent-platform') {
      const isValid = AGENT_PLATFORM_MODEL_OPTIONS.some(m => m.id === selectedModel);
      if (!isValid) setSelectedModel('gemini-2.5-flash');
    } else {
      const isValid = GEMINI_MODEL_OPTIONS.some(m => m.id === selectedModel);
      if (!isValid) setSelectedModel('gemini-3.6-flash');
    }
  };

  const handleKeyChange = (val: string) => {
    if (provider === 'gemini') {
      setGeminiKey(val);
    } else {
      setAgentPlatformKey(val);
    }
    if (validationError) setValidationError(null);
  };

  const handleSave = () => {
    const trimmedKey = activeKey.trim();
    if (!trimmedKey) {
      setValidationError('Vui lòng nhập API Key.');
      return;
    }

    if (!isValidGoogleAiApiKey(trimmedKey)) {
      setValidationError('Định dạng API Key không hợp lệ. Khóa API phải bắt đầu bằng "AIzaSy..." hoặc "AQ...".');
      return;
    }

    // Persist to localStorage according to api.md Section III
    localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
    localStorage.setItem(STORAGE_KEYS.PROVIDER_SOURCE, 'manual');
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, selectedModel);

    if (provider === 'gemini') {
      localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, trimmedKey);
      localStorage.setItem(STORAGE_KEYS.LEGACY_GEMINI_KEY, trimmedKey); // Backward compatibility
    } else {
      localStorage.setItem(STORAGE_KEYS.AGENT_PLATFORM_KEY, trimmedKey);
    }

    onSave(trimmedKey, provider, selectedModel);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-7 border-4 border-emerald-100 my-auto max-h-[92vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-2 pb-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-brand-green shadow-inner border border-emerald-100">
                <Zap size={32} className="animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark uppercase tracking-tight">
                Cài đặt Google AI API Key
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-sm">
                Chọn nhà cung cấp dịch vụ và nhập API Key để kích hoạt tính năng thông minh.
              </p>
            </div>

            {/* Content Scrollable */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
              {/* Provider Selection Tabs */}
              <div>
                <label className="text-[11px] font-black text-brand-green uppercase tracking-wider block mb-2 px-1">
                  1. Chọn Nhà cung cấp AI
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('gemini')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                      provider === 'gemini'
                        ? 'bg-brand-green text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Sparkles size={16} />
                    <span>Gemini API</span>
                    {provider === 'gemini' && <Check size={14} className="ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('agent-platform')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                      provider === 'agent-platform'
                        ? 'bg-brand-green text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Cpu size={16} />
                    <span>Agent Platform</span>
                    {provider === 'agent-platform' && <Check size={14} className="ml-1" />}
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              <div className="text-left">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="text-[11px] font-black text-brand-green uppercase tracking-wider">
                    2. Nhập API Key {provider === 'gemini' ? '(Google AI Studio)' : '(Agent Platform)'}
                  </label>
                  <a
                    href={
                      provider === 'gemini'
                        ? 'https://aistudio.google.com/apikey'
                        : 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                  >
                    Lấy API key <ExternalLink size={12} />
                  </a>
                </div>

                <div className="relative">
                  <input 
                    type="password"
                    placeholder="AIzaSy... hoặc AQ..."
                    value={activeKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all font-mono text-xs sm:text-sm"
                  />
                  {activeKey && isValidGoogleAiApiKey(activeKey) && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <ShieldCheck size={14} /> Hợp lệ
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 px-1">
                  Chấp nhận mã khóa bắt đầu bằng <span className="font-mono font-semibold text-slate-600">AIzaSy...</span> hoặc <span className="font-mono font-semibold text-slate-600">AQ...</span>
                </p>

                {validationError && (
                  <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div>
                <label className="text-[11px] font-black text-brand-green uppercase tracking-wider block mb-2 px-1">
                  3. Chọn Model mặc định
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentModelOptions.map((opt) => {
                    const isSelected = selectedModel === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedModel(opt.id)}
                        className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50/70 border-brand-green shadow-sm'
                            : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {opt.name}
                            </span>
                            {opt.badge && (
                              <span className="px-1.5 py-0.5 bg-brand-green text-white text-[9px] font-black rounded-md uppercase">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-brand-green bg-brand-green text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 px-1 italic">
                  💡 Cơ chế tự động fallback sẽ tự chuyển qua các model dự phòng nếu model này tạm thời quá tải (503).
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2 mt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!activeKey.trim()}
                className="w-full py-3.5 bg-brand-green hover:bg-brand-green-dark text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] uppercase tracking-wider text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap size={16} /> Lưu cấu hình & Bắt đầu
              </button>
              
              {currentApiKey && (
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest py-1"
                >
                  Đóng
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
