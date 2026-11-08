import React from 'react';
import { ExternalLink, Send, Bot, ShieldCheck, Sparkles } from 'lucide-react';
import RealisticSmokeBackdrop from './RealisticSmokeBackdrop';

interface GlobalFooterProps {
  className?: string;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`w-full max-w-6xl mx-auto mt-12 mb-8 p-3 sm:p-5 rounded-3xl bg-transparent border border-white/10 backdrop-blur-sm relative flex flex-col gap-4 text-slate-100 z-10 ${className}`}>
      {/* Subtle Smoke Backdrop behind footer */}
      <RealisticSmokeBackdrop speed="slow" opacity={0.35} className="-inset-2" />

      {/* Requisites on Left, Action Buttons on Right */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Requisites Card */}
        <div className="liquid-bubble-secondary bg-black/40 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/10 flex-1 space-y-2 text-sm text-zinc-200 leading-relaxed shadow-lg">
          <span className="liquid-bubble-glare" />
          <p className="font-bold text-amber-300 text-sm sm:text-base">ООО «РентРоп»</p>
          <p className="text-zinc-200 break-words">
            Юридический адрес: 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2
          </p>
          <p className="text-zinc-300">
            ОГРН: 1217700234157 · ИНН: 7726477438
          </p>
          <p className="text-zinc-300">
            Электронная почта: <a href="mailto:info@arenda-ropa.com" className="text-amber-300 hover:text-amber-200 underline transition-colors">info@arenda-ropa.com</a>
          </p>
        </div>

        {/* Right: Action and Product Links */}
        <div className="liquid-bubble-secondary bg-black/40 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col items-start lg:items-end justify-center gap-3.5 shadow-lg shrink-0">
          <span className="liquid-bubble-glare" />
          
          {/* Top row of primary buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <a
              href="https://rent-rop.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-gold text-amber-950 font-bold px-4 py-2.5 rounded-xl border border-amber-300 shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <span className="liquid-bubble-glare" />
              <ExternalLink size={16} />
              <span className="relative z-10">Продукт компании РентРОП</span>
            </a>

            <a
              href="https://t.me/shishkarnem"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-secondary bg-black/50 text-zinc-100 hover:text-white font-medium px-4 py-2.5 rounded-xl border border-amber-400/35 shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <span className="liquid-bubble-glare" />
              <Send size={16} className="text-amber-300" />
              <span className="relative z-10">Связь с Dr.White</span>
            </a>
          </div>

          {/* Secondary row of specialized robots */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <a
              href="https://hr-rr.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-secondary bg-black/50 text-zinc-100 hover:text-white font-medium px-3.5 py-2 rounded-xl border border-amber-400/30 shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <span className="liquid-bubble-glare" />
              <Bot size={15} className="text-amber-300" />
              <span className="relative z-10">Робот Рекрутер</span>
            </a>

            <a
              href="https://ii-rr.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-secondary bg-black/50 text-zinc-100 hover:text-white font-medium px-3.5 py-2 rounded-xl border border-amber-400/30 shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <span className="liquid-bubble-glare" />
              <ShieldCheck size={15} className="text-amber-300" />
              <span className="relative z-10">Робот Ревизор</span>
            </a>

            <a
              href="https://iismm.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-secondary bg-black/50 text-zinc-100 hover:text-white font-medium px-3.5 py-2 rounded-xl border border-amber-400/30 shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <span className="liquid-bubble-glare" />
              <Sparkles size={15} className="text-amber-300" />
              <span className="relative z-10">ИИSMM</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
