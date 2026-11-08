import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, UserCheck, User, Check, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { protalkDb } from '@/integrations/protalk/client';
import { Expert } from '@/components/ExpertCard';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';

const CalculatorStep7: React.FC = () => {
  const navigate = useNavigate();
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [expandedExpertId, setExpandedExpertId] = useState<string | null>(null);
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step7' }); }, []);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperts = async () => {
      setLoading(true);
      const { data, error } = await protalkDb
        .from('sav_experts')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setExperts(data as any);
      }
      setLoading(false);
    };
    fetchExperts();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedExpertId) setSelectedExpertId(parsed.selectedExpertId);
      } catch {}
    }
  }, []);

  // Pre-fill from DB - match by expert name
  useEffect(() => {
    if (leadLoaded && existingLead?.selected_expert && !selectedExpertId && experts.length > 0) {
      const match = experts.find(e => 
        `${e.greeting || ''}${e.pseudonym || ''}` === existingLead.selected_expert
      );
      if (match) setSelectedExpertId(match.id);
    }
  }, [leadLoaded, existingLead, experts]);

  const handleExpertClick = (expertId: string) => {
    if (selectedExpertId === expertId) {
      setExpandedExpertId(prev => prev === expertId ? null : expertId);
    } else {
      setSelectedExpertId(expertId);
      setExpandedExpertId(expertId);
      const expert = experts.find(e => e.id === expertId);
      if (expert) {
        const expertName = `${expert.greeting || ''}${expert.pseudonym || ''}`;
        updateLead({ selected_expert: expertName });
      }
    }
  };

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    const selectedExpert = experts.find(e => e.id === selectedExpertId);
    const expertName = selectedExpert 
      ? `${selectedExpert.greeting || ''}${selectedExpert.pseudonym || ''}`
      : '';
    trackAction('next_step', { page: '/calculator/step7', value: expertName });
    saveSessionData({ ...data, selectedExpertId, selectedExpert: expertName, step: 'step7' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ 
      ...data, 
      selectedExpertId,
      selectedExpert: expertName,
    }));
    updateLead({ selected_expert: expertName });
    navigate('/calculator/step8');
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
                  <span>Шаг 7 из 8</span>
                  <span>87%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '87.5%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Выберите эксперта, который проведёт бесплатный аудит и поможет с внедрением ИИ. Нажмите на карточку, чтобы узнать больше.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Выберите эксперта *</label>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {experts.map(expert => (
                        <div key={expert.id} className="space-y-0">
                          <button
                            onClick={() => handleExpertClick(expert.id)}
                            className={`w-full p-4 rounded-lg border text-left transition-all flex items-center gap-4 ${
                              selectedExpertId === expert.id
                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                : 'border-primary/20 bg-background/30 hover:border-primary/50'
                            }`}
                          >
                            {expert.photo_url ? (
                              <img 
                                src={expert.photo_url} 
                                alt={expert.pseudonym || 'Expert'}
                                className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-primary">
                                {expert.greeting}{expert.pseudonym}
                              </div>
                              {expert.spheres && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {expert.spheres}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {selectedExpertId === expert.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                                expandedExpertId === expert.id ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {expandedExpertId === expert.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 border border-t-0 border-primary/20 rounded-b-lg bg-background/50 space-y-3">
                                  {expert.spheres && (
                                    <div>
                                      <p className="text-primary text-xs uppercase mb-1 opacity-70">💰 Сферы</p>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {expert.spheres}
                                      </p>
                                    </div>
                                  )}
                                  {expert.tools && (
                                    <div>
                                      <p className="text-primary text-xs uppercase mb-1 opacity-70">⚒️ Инструменты</p>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {expert.tools}
                                      </p>
                                    </div>
                                  )}
                                  {expert.cases && (
                                    <div>
                                      <p className="text-primary text-xs uppercase mb-1 opacity-70">🤖 Кейсы</p>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {expert.cases}
                                      </p>
                                    </div>
                                  )}
                                  {expert.other_info && (
                                    <div>
                                      <p className="text-primary text-xs uppercase mb-1 opacity-70">📌 Другое</p>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {expert.other_info}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step6')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!selectedExpertId} className="gap-2">
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <footer className="mt-8 py-6 text-center opacity-60 text-sm tracking-wider font-sans text-amber-200">
        © 2026 SAV AI • Интеллектуальные нейросетевые системы и автоматизация бизнеса
      </footer>
    </div>
  );
};

export default CalculatorStep7;
