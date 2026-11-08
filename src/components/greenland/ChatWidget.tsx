import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import { Language } from '@/types';
import ReactMarkdown from 'react-markdown';
import { MiniatureNeonSphere } from '@/components/MiniatureNeonSphere';
import { MiniAudioField } from '@/components/MiniAudioField';
import { IMAGES } from '@/greenlandConstants';
import { protalkDb } from '@/integrations/protalk/client';

interface ChatWidgetProps {
  lang: Language;
  appData?: any;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const WAITING_TEXTS = [
  "Обрабатываю ваш запрос",
  "Ищу ответ в базе знаний",
  "Формирую персональный ответ",
  "Анализирую информацию",
  "Сверяюсь с регламентами ИИ-Гренландии"
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ lang, appData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: lang === 'ru'
        ? "Приветствую. Я официальный ИИ-Пресс-Секретарь Гренландии. Отвечу на ваши вопросы по иммиграции, получению Green Card, законам и устройству цифрового государства."
        : "ПРЕВЕД! Я ПРЕСС-СЕКРЕТАРЬ УПЧК! СПРАШИВАЙ, КРАБЕ!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Обрабатываю ваш запрос");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) return;
    const getRandomText = () => WAITING_TEXTS[Math.floor(Math.random() * WAITING_TEXTS.length)];
    setLoadingText(getRandomText());
    const interval = setInterval(() => {
      setLoadingText(getRandomText());
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1) {
        return [{
          role: 'model',
          text: lang === 'ru'
            ? "Приветствую. Я официальный ИИ-Пресс-Секретарь Гренландии. Готов ответить на вопросы."
            : "ПРЕВЕД! Я ТУТ ГЛАВНЫЙ ПО БАЗАРУ. ЧО НАДО, КРАБЕ?"
        }];
      }
      return prev;
    });
  }, [lang]);

  const handleSendMessage = async (textOverride?: string) => {
    const userMsg = typeof textOverride === 'string' ? textOverride : inputValue;
    if (!userMsg.trim()) return;
    if (typeof textOverride !== 'string') setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // 1. First attempt to query BD ProTalk laws directly if not already in appData
      let lawsList = appData?.LAWS;
      if (!lawsList || lawsList.length === 0) {
        try {
          const lawsRes = await protalkDb.from('laws').select('*');
          if (lawsRes.data && lawsRes.data.length > 0) {
            lawsList = lawsRes.data;
          }
        } catch (dbErr) {
          console.warn('[Laws Fetch Error]', dbErr);
        }
      }

      // 2. Build laws context for question matching
      const lowerQuery = userMsg.toLowerCase();
      let context = "";
      if (lawsList && Array.isArray(lawsList)) {
        lawsList.forEach((law: any) => {
          const q = (law.q || '').toLowerCase();
          const a = (law.a || '').toLowerCase();
          if (q.includes(lowerQuery) || a.includes(lowerQuery) || lowerQuery.split(' ').some(w => w.length > 3 && (q.includes(w) || a.includes(w)))) {
            context += `Статья: ${law.q}\nЗакон: ${law.a}\n\n`;
          }
        });
      }

      const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'model').map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      }));
      chatMessages.push({
        role: 'user',
        content: context ? `Контекст официальных законов Гренландии из BD ProTalk:\n${context.slice(0, 2500)}\n\nВопрос: ${userMsg}` : userMsg
      });

      // Send to backend function ai-chat (connected to ProTalk and BD ProTalk laws)
      const resp = await fetch(`/api/v1/functions/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: { messages: chatMessages } }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Ошибка AI');
      }

      const data = await resp.json();
      const text = data.data?.response || data.response || data.error || 'Не удалось получить ответ.';
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: lang === 'ru'
          ? "Извините, нейронная сеть обрабатывает большой поток обращений. Рекомендуем также открыть раздел «Конституция» для ознакомления со статьями законов."
          : "ГЛАГНЕ НЕ ОТВЕЧАЕТ! ПОПЯЧТСЯ!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed right-3 sm:right-6 z-50 flex flex-col items-end pointer-events-none transition-all duration-300 ${isOpen ? 'bottom-20 md:bottom-6' : 'bottom-24 md:bottom-6'}`}>
      {/* 3D Glass Dialog Window */}
      {isOpen && (
        <div className="pointer-events-auto liquid-bubble-plate border border-amber-400/40 rounded-3xl shadow-2xl backdrop-blur-2xl w-[92vw] sm:w-96 mb-3 overflow-hidden animate-[fadeIn_0.3s_ease-out] flex flex-col h-[520px] max-h-[78vh] relative">
          <span className="liquid-bubble-glare" />

          {/* Dialog Header with Gerb Logo */}
          <div className="p-3.5 bg-black/40 border-b border-amber-400/25 flex justify-between items-center shrink-0 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-3">
              {/* Gerb Logo with partner sepia filter */}
              <div className="w-10 h-10 rounded-2xl liquid-bubble-secondary flex items-center justify-center p-1 border border-amber-400/35 shadow-md shrink-0">
                <img
                  src={IMAGES.GERB || IMAGES.LOGO || '/file/36/gerb.png'}
                  alt="Герб ИИ-Гренландии"
                  className="w-full h-full object-contain partner-gold-sepia-filter"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('/file/31/gerb.png')) {
                      target.src = '/file/31/gerb.png';
                    }
                  }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white tracking-wide truncate flex items-center gap-1.5">
                  <span>{lang === 'ru' ? "AI Пресс-Секретарь" : "УПЧК БОТ"}</span>
                  <Sparkles size={13} className="text-amber-400 shrink-0" />
                </h3>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-xl liquid-bubble-secondary text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Thread */}
          <div className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-black/20 space-y-3 relative z-10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[86%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-xl border ${
                    msg.role === 'user'
                      ? 'liquid-bubble-gold text-zinc-950 font-medium rounded-tr-sm border-amber-400/60'
                      : 'liquid-bubble-secondary text-zinc-100 rounded-tl-sm border-amber-400/25'
                  }`}
                >
                  <div className="whitespace-pre-wrap prose prose-sm prose-invert max-w-none break-words">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="liquid-bubble-secondary border border-amber-400/30 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2.5 shadow-md">
                  <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                  <span className="text-sm text-amber-200 font-medium animate-pulse">
                    {lang === 'ru' ? loadingText : "ДУМАЕТ..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input Field using MiniAudioField */}
          <div className="p-3 bg-black/50 border-t border-amber-400/25 backdrop-blur-xl flex flex-col gap-2 shrink-0 relative z-10">
            <div className="flex items-center gap-2">
              <div className="flex-grow min-w-0">
                <MiniAudioField
                  value={inputValue}
                  onChange={(val) => setInputValue(val)}
                  onEnter={() => handleSendMessage()}
                  placeholder={lang === 'ru' ? "Спросите о законах или скажите..." : "ПИШИ ИЛИ ГОВОРИ..."}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="liquid-bubble-gold text-zinc-950 p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0 cursor-pointer"
                title="Отправить"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button: Neural Sphere with Gerb Logo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto liquid-bubble-plate border border-amber-400/50 rounded-2xl p-1.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center hover:scale-105 transition-all duration-300 group cursor-pointer relative"
        title={isOpen ? "Закрыть ассистент" : "ИИ-Пресс-Секретарь Гренландии"}
      >
        <span className="liquid-bubble-glare" />

        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Neon Sphere component in brand golden tones */}
          <div className="absolute inset-0 flex items-center justify-center scale-125">
            <MiniatureNeonSphere isRecording={isOpen} size={56} color="#F59E0B" />
          </div>

          {/* Center Gerb Logo 1.5x larger with AI label overlaid */}
          <div className="relative z-10 w-11 h-11 flex items-center justify-center pointer-events-none">
            {isOpen ? (
              <X size={24} className="text-amber-300" />
            ) : (
              <>
                <img
                  src={IMAGES.GERB || IMAGES.LOGO || '/file/36/gerb.png'}
                  alt="Герб"
                  className="w-full h-full object-contain partner-logo-filter transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('/file/31/gerb.png')) {
                      target.src = '/file/31/gerb.png';
                    }
                  }}
                />
                <span className="absolute -bottom-1.5 z-20 px-1.5 py-0.5 rounded-full bg-zinc-950/85 border border-amber-400/80 text-[10px] font-black tracking-wider text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)] backdrop-blur-md">
                  AI
                </span>
              </>
            )}
          </div>
        </div>

        {/* Pulse indicator */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
          </span>
        )}
      </button>
    </div>
  );
};
