import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileText, Sparkles, Bot, Send, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import ReactMarkdown from 'react-markdown';

// Local BD ProTalk & AI Endpoints

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CalculatorStep5: React.FC = () => {
  const navigate = useNavigate();
  const [functionality, setFunctionality] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();
  const { profile, telegramUser } = useTelegramAuth();

  const userInfo = {
    telegram_id: profile?.telegram_id || telegramUser?.id,
    first_name: profile?.first_name || telegramUser?.first_name,
    last_name: profile?.last_name || telegramUser?.last_name,
    username: profile?.username || telegramUser?.username,
  };

  // AI TZ Enhancement state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step5' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.functionality) setFunctionality(parsed.functionality);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (leadLoaded && existingLead?.functionality && !functionality) {
      setFunctionality(existingLead.functionality);
    }
  }, [leadLoaded, existingLead]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    trackAction('next_step', { page: '/calculator/step5', value: functionality.substring(0, 50) });
    saveSessionData({ ...data, functionality, step: 'step5' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ ...data, functionality }));
    updateLead({ functionality });
    navigate('/calculator/step6');
  };

  const openAiDialog = () => {
    setAiDialogOpen(true);
    if (aiMessages.length === 0) {
      // Send initial context
      const initialContext = functionality
        ? `Текущее ТЗ пользователя:\n"${functionality}"\n\nПомоги улучшить это ТЗ.`
        : 'Помоги пользователю составить техническое задание для ИИ-бота.';
      sendAiMessage(initialContext, []);
    }
  };

  const sendAiMessage = async (text: string, currentMessages: AiMessage[]) => {
    if (!text.trim() || aiLoading) return;
    const userMsg: AiMessage = { role: 'user', content: text };
    const newMessages = [...currentMessages, userMsg];
    setAiMessages(newMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const resp = await fetch('/api/v1/ai/enhance-tz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages, userInfo }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error('AI error:', resp.status, errText);
        throw new Error(`AI error: ${resp.status}`);
      }

      const resJson = await resp.json();
      const assistantContent = resJson.text || resJson.enhancedTz || 'Техническое задание сформировано.';
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);

      // Check if result TZ was produced
      if (assistantContent) {
        const match = assistantContent.match(/##RESULT_TZ:([\s\S]+?)##/);
        const resultTz = match ? match[1].trim() : assistantContent;
        setFunctionality(resultTz);
        updateLead({ functionality: resultTz });
      }
    } catch (err) {
      console.error('AI TZ Enhancement error:', err);
      setAiMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Ошибка AI. Попробуйте ещё раз. (${err instanceof Error ? err.message : 'Unknown'})` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const applyTzFromAi = async () => {
    // Find the best text to summarize
    let sourceText = '';
    
    // First try to find ##RESULT_TZ## in messages
    for (let i = aiMessages.length - 1; i >= 0; i--) {
      if (aiMessages[i].role !== 'assistant') continue;
      const match = aiMessages[i].content.match(/##RESULT_TZ:([\s\S]+?)##/);
      if (match) {
        sourceText = match[1].trim();
        break;
      }
    }
    
    // Fallback: use last assistant message
    if (!sourceText) {
      for (let i = aiMessages.length - 1; i >= 0; i--) {
        if (aiMessages[i].role !== 'assistant') continue;
        const text = aiMessages[i].content.trim();
        if (text.length > 10) {
          sourceText = text;
          break;
        }
      }
    }

    if (!sourceText) {
      setAiDialogOpen(false);
      return;
    }

    // Now run AI summarizer to compose a clean TZ under 1600 chars
    setIsSummarizing(true);
    try {
      const summarizeMessages: AiMessage[] = [
        {
          role: 'user',
          content: `Вот текст технического задания из диалога. Скомпонуй его в итоговое ТЗ для ИИ-бота СТРОГО до 1600 символов. 
Требования:
- Сохрани все ключевые пункты и тезисы
- НЕ обрезай текст, а сделай краткую и полную версию
- Убери лишние слова, воду и повторы
- Структурируй с нумерацией пунктов
- Пиши только текст ТЗ без пояснений и комментариев
- Результат оберни тегом ##RESULT_TZ:текст##

Исходный текст:
${sourceText}`
        }
      ];

      const resp = await fetch('/api/v1/ai/enhance-tz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: summarizeMessages, userInfo }),
      });

      if (!resp.ok) {
        throw new Error('Summarizer error');
      }

      const resJson = await resp.json();
      const content = resJson.text || resJson.enhancedTz || sourceText;

      // Extract summarized TZ
      let finalTz = '';
      const resultMatch = content.match(/##RESULT_TZ:([\s\S]+?)##/);
      if (resultMatch) {
        finalTz = resultMatch[1].trim();
      } else {
        finalTz = content.trim()
          .replace(/^#+\s*/gm, '')
          .replace(/\*\*/g, '')
          .replace(/^\s*[-•]\s*/gm, '- ')
          .trim();
      }

      if (finalTz.length > 1600) {
        finalTz = finalTz.substring(0, 1600);
      }

      if (finalTz.length > 10) {
        setFunctionality(finalTz);
        updateLead({ functionality: finalTz });
      }
    } catch (err) {
      console.error('Summarizer error:', err);
      // Fallback: just clean and truncate the source text
      let text = sourceText
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        .trim();
      if (text.length > 1600) text = text.substring(0, 1600);
      setFunctionality(text);
      updateLead({ functionality: text });
    } finally {
      setIsSummarizing(false);
      setAiDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <Header onLogoClick={() => navigate('/')} />
      <main className="w-full max-w-4xl flex-grow">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <div className="steam-fade space-y-5 w-full">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
              <h2 className="text-xl md:text-4xl text-primary">Калькулятор Замены</h2>
              <button onClick={() => navigate('/')} className="text-primary underline text-xs md:text-base opacity-70 hover:opacity-100 transition-opacity">
                Вернуться
              </button>
            </div>

            <div className="steampunk-border p-4 md:p-6 relative" style={{ minHeight: '500px' }}>
              <Rivets />
              
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Шаг 5 из 8</span>
                  <span>62%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '62.5%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Опишите функционал ИИ-бота — что он должен делать, какие процессы автоматизировать.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <label className="text-sm font-medium">Техническое задание *</label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAiDialog}
                      className="gap-1.5 text-xs border-primary/30 hover:bg-primary/10 hover:border-primary"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      ИИ-Улучшение ТЗ
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Например: Обрабатывает лиды, продаёт услугу, считает стоимость по калькулятору и прайсу. Регистрирует клиентов в CRM, назначает встречи по календарю..."
                    value={functionality}
                    onChange={(e) => setFunctionality(e.target.value)}
                    onBlur={() => {
                      if (functionality.trim()) {
                        updateLead({ functionality });
                      }
                    }}
                    className="bg-background/50 border-primary/30"
                    style={{ minHeight: '150px', height: 'auto', overflow: 'hidden' }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = Math.max(150, el.scrollHeight) + 'px';
                      }
                    }}
                    maxLength={1600}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {functionality.length}/1600
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step4')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!functionality} className="gap-2">
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* AI TZ Enhancement Dialog */}
      <AnimatePresence>
        {aiDialogOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isSummarizing && setAiDialogOpen(false)} />
            <motion.div
              className="relative z-10 w-full max-w-4xl flex flex-col glass-panel overflow-hidden mx-2"
              style={{ height: 'calc(100vh - 120px)', maxHeight: 'calc(100dvh - 120px)' }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <Rivets />
              {/* Header */}
              <div className="p-4 border-b border-primary/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">ИИ-Улучшение ТЗ</h3>
                    <p className="text-[10px] text-foreground/50">Помощь в составлении технического задания</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={applyTzFromAi} 
                    disabled={isSummarizing || aiLoading}
                    className="text-xs gap-1"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Компоную...
                      </>
                    ) : (
                      'Применить'
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => !isSummarizing && setAiDialogOpen(false)} disabled={isSummarizing}>
                    <X size={16} />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary/30 text-foreground rounded-tr-sm'
                        : 'bg-card/80 border border-primary/10 text-foreground rounded-tl-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                          <ReactMarkdown>{msg.content.replace(/##RESULT_TZ:[\s\S]+?##/g, '').trim()}</ReactMarkdown>
                          {msg.content.includes('##RESULT_TZ:') && (
                            <div className="mt-2 p-2 border border-green-500/30 rounded-lg bg-green-500/10">
                              <p className="text-[10px] text-green-400 font-bold mb-1">📋 Готовое ТЗ (нажмите "Применить")</p>
                              <p className="text-xs text-foreground/80">{msg.content.match(/##RESULT_TZ:([\s\S]+?)##/)?.[1]?.trim().substring(0, 100)}...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {(aiLoading || isSummarizing) && (
                  <div className="flex justify-start">
                    <div className="bg-card/80 border border-primary/10 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span className="text-xs text-foreground/60">{isSummarizing ? 'Компоную ТЗ до 2000 символов...' : 'Думаю...'}</span>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-primary/20 flex gap-2 items-end shrink-0">
                <input
                  className="flex-grow bg-card/50 border border-primary/20 rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground/30"
                  placeholder="Опишите требования или задайте вопрос..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAiMessage(aiInput, aiMessages);
                    }
                  }}
                  disabled={isSummarizing}
                />
                <button
                  onClick={() => sendAiMessage(aiInput, aiMessages)}
                  disabled={!aiInput.trim() || aiLoading || isSummarizing}
                  className="bg-primary/70 text-primary-foreground p-2.5 rounded-xl disabled:opacity-50 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-8 py-6 text-center opacity-60 text-sm tracking-wider font-sans text-amber-200">
        © 2026 SAV AI • Интеллектуальные нейросетевые системы и автоматизация бизнеса
      </footer>
    </div>
  );
};

export default CalculatorStep5;
