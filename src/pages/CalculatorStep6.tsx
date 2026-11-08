import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wrench, Check } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';

const CalculatorStep6: React.FC = () => {
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step6' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.maintenance) setMaintenance(parsed.maintenance);
      } catch {}
    }
  }, []);

  // Pre-fill from DB
  useEffect(() => {
    if (leadLoaded && existingLead?.service && !maintenance) {
      setMaintenance(existingLead.service);
    }
  }, [leadLoaded, existingLead]);

  const handleSelect = (value: string) => {
    setMaintenance(value);
    updateLead({ service: value });
  };

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    trackAction('next_step', { page: '/calculator/step6', value: maintenance });
    saveSessionData({ ...data, maintenance, step: 'step6' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ ...data, maintenance }));
    updateLead({ service: maintenance });
    navigate('/calculator/step7');
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
                  <span>Шаг 6 из 8</span>
                  <span>75%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  ИИ боты обновляются постоянно. Обслуживание — 10% от стоимости ежемесячно. 
                  Можете отказаться в любой момент или заказывать консультацию за 5000₽/час.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Нужно обслуживание? *</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSelect('Да')}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        maintenance === 'Да'
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-primary/20 bg-background/30 hover:border-primary/50'
                      }`}
                    >
                      <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      <div className="font-medium">Да</div>
                      <div className="text-xs text-muted-foreground">+10% в месяц</div>
                    </button>
                    
                    <button
                      onClick={() => handleSelect('Нет')}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        maintenance === 'Нет'
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-primary/20 bg-background/30 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-6 h-6 mx-auto mb-2 text-muted-foreground">✕</div>
                      <div className="font-medium">Нет</div>
                      <div className="text-xs text-muted-foreground">Самостоятельно</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step5')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!maintenance} className="gap-2">
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

export default CalculatorStep6;
