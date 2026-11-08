import React, { useState } from 'react';
import { FAQ_DATA } from '@/greenlandConstants';
import { Plus, Minus, MessageCircle } from 'lucide-react';

export const Library: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-display font-bold text-white mb-8 text-center">Королевская Библиотека</h2>

        <div className="space-y-4">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className="bg-black/75 border border-amber-500/25 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl transition-all duration-300"
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left hover:bg-amber-500/5 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-bold text-lg text-white font-display">{item.q}</span>
                {openIndex === index ? (
                  <Minus className="text-amber-400" />
                ) : (
                  <Plus className="text-amber-400" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 text-slate-300 border-t border-amber-500/15 mt-2">
                  {item.a}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-br from-amber-950/40 via-black/80 to-amber-900/20 border border-amber-500/30 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Остались вопросы?</h3>
            <p className="text-slate-300 text-sm">
              Бот Савва готов ответить на технические вопросы, а Dr.White решает государственные дела.
            </p>
          </div>
          <div className="flex gap-4">
            <a
              href="https://t.me/SAV_AIbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all shrink-0"
            >
              <MessageCircle size={18} /> Спросить Савву
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
