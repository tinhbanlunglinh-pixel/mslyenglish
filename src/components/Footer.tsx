import React from 'react';
import { MapPin, Phone, Facebook, MessageCircle, Users, Sparkles, ExternalLink } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => (
  <footer className="bg-brand-green-dark text-white py-10 sm:py-16 border-t-4 border-brand-yellow">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
        {/* Brand & Slogan */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-2xl border-4 border-brand-yellow shadow-lg">
              <BrandLogo className="w-16 h-16" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-brand-yellow uppercase tracking-tight">Ms Lý English</h3>
            <p className="text-slate-300 font-serif italic text-base leading-relaxed">
              "English today, success tomorrow"
            </p>
            <div className="h-0.5 bg-brand-yellow/20 w-1/2 rounded" />
            <p className="text-xs font-black text-brand-green uppercase tracking-widest text-[11px]">
              TIẾNG ANH HÔM NAY - THÀNH CÔNG MAI SAU
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            LIÊN HỆ
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-brand-yellow/30" />
          </h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 group">
              <MapPin size={20} className="text-brand-yellow shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Xã Nhữ Khê, tỉnh Tuyên Quang.
              </span>
            </li>
            <li className="flex items-start gap-3 group">
              <Phone size={20} className="text-brand-yellow shrink-0 mt-0.5" />
              <a href="tel:0962859488" className="text-sm font-black text-slate-300 group-hover:text-brand-yellow transition-colors">
                Ms Lý: 0962 859 488
              </a>
            </li>
            <li className="flex items-start gap-3 group">
              <Facebook size={20} className="text-brand-yellow shrink-0 mt-0.5" />
              <a 
                href="https://www.facebook.com/nguyen.ly.254892/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-medium text-slate-300 group-hover:text-brand-yellow transition-colors flex items-center gap-1.5"
              >
                Kết nối với Ms Lý <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        {/* Communities */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            CỘNG ĐỒNG HỌC TẬP
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-brand-yellow/30" />
          </h4>
          <div className="space-y-3">
            <a 
              href="https://www.facebook.com/groups/622221026836074" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-yellow/30 transition-all group"
            >
              <Users size={20} className="text-brand-yellow" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-brand-yellow">Cộng đồng Tiếng Anh</p>
                <p className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">Học Tiếng Anh miễn phí (FB Group)</p>
              </div>
            </a>
            
            <a 
              href="https://www.facebook.com/groups/713992384405080" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-yellow/30 transition-all group"
            >
              <Sparkles size={20} className="text-brand-yellow" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-brand-yellow">Cộng đồng học AI</p>
                <p className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">Học AI miễn phí (FB Group)</p>
              </div>
            </a>

            <a 
              href="https://zalo.me/g/losnhe538" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-yellow/30 transition-all group"
            >
              <MessageCircle size={20} className="text-brand-yellow" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-brand-yellow">Học AI cùng Lý</p>
                <p className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">Tham gia nhóm Zalo hỗ trợ</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
