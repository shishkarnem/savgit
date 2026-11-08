import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';

const CalculatorStep4: React.FC = () => {
  const navigate = useNavigate();
  const [averageSalary, setAverageSalary] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step4' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.averageSalary) {
          setAverageSalary(parsed.averageSalary);
        } else if (parsed.avgSalary) {
          setAverageSalary(String(parsed.avgSalary));
        }
      } catch {}
    }
  }, []);

  // Pre-fill from DB
  useEffect(() => {
    if (leadLoaded && existingLead?.avg_salary && !averageSalary) {
      setAverageSalary(existingLead.avg_salary);
    }
  }, [leadLoaded, existingLead]);

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    trackAction('next_step', { page: '/calculator/step4', value: averageSalary });
    saveSessionData({ ...data, averageSalary, step: 'step4' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ ...data, averageSalary }));
    updateLead({ avg_salary: averageSalary });
    navigate('/calculator/step5');
  };

  const isValid = averageSalary && parseInt(averageSalary) > 0;

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
                  <span>Шаг 4 из 8</span>
                  <span>50%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Укажите среднюю зарплату на ОДНОГО сотрудника в рублях. 
                  Если укажете меньше рыночной по вашему городу, расчёт будет по рыночной.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Средняя зарплата (₽) *</label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Например: 80000"
                    value={averageSalary}
                    onChange={(e) => setAverageSalary(e.target.value)}
                    onBlur={() => {
                      if (averageSalary && parseInt(averageSalary) > 0) {
                        updateLead({ avg_salary: averageSalary });
                      }
                    }}
                    className="bg-background/50 border-primary/30"
                  />
                </div>
                
                <a 
                  href="https://docs.google.com/spreadsheets/d/1ZLx0ohpR2TzuDxYeJITJP8GJ2BmzDC-_bR_bNEDlfzE/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs hover:opacity-80"
                >
                  📊 Таблица средних зарплат по городам
                </a>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step3')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!isValid} className="gap-2">
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

export default CalculatorStep4;
