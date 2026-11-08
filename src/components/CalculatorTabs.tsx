import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Calculator, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  loadSavedCalculations,
  getActiveCalculationId,
  startNewCalculation,
  switchToCalculation,
  removeSavedCalculation,
  persistCurrentCalculation,
  SavedCalculation
} from '@/utils/calculatorStorage';

interface CalculatorTabsProps {
  currentData?: any;
  currentStep?: 'step1' | 'step2' | 'step3';
  onDataLoaded?: (data: any) => void;
}

export const CalculatorTabs: React.FC<CalculatorTabsProps> = ({
  currentData,
  currentStep = 'step1',
  onDataLoaded
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync state on mount and on storage events
  const syncCalculations = () => {
    const list = loadSavedCalculations();
    let curActive = getActiveCalculationId();

    // If no calculations exist yet, initialize with current form data or a default
    if (list.length === 0) {
      const saved = persistCurrentCalculation(currentData || {}, currentStep);
      setCalculations([saved]);
      setActiveId(saved.id);
      return;
    }

    if (!curActive || !list.some(c => c.id === curActive)) {
      curActive = list[0]?.id || null;
    }

    // Also update current active calculation's data if currentData is provided
    if (curActive && currentData) {
      persistCurrentCalculation(currentData, currentStep);
      setCalculations(loadSavedCalculations());
    } else {
      setCalculations(list);
    }
    setActiveId(curActive);
  };

  useEffect(() => {
    syncCalculations();

    const handleUpdate = (e: any) => {
      if (e.detail?.calculations) {
        setCalculations(e.detail.calculations);
      } else {
        setCalculations(loadSavedCalculations());
      }
      if (e.detail?.activeId) {
        setActiveId(e.detail.activeId);
      }
    };

    const handleSwitch = (e: any) => {
      if (e.detail?.data && onDataLoaded) {
        onDataLoaded(e.detail.data);
      }
    };

    window.addEventListener('sav_calculations_updated', handleUpdate);
    window.addEventListener('sav_calculator_switched', handleSwitch);

    return () => {
      window.removeEventListener('sav_calculations_updated', handleUpdate);
      window.removeEventListener('sav_calculator_switched', handleSwitch);
    };
  }, []);

  // Handler for creating a fresh calculation
  const handleNewCalculation = () => {
    const { id, data } = startNewCalculation(currentData, currentStep);
    setActiveId(id);
    setCalculations(loadSavedCalculations());
    if (onDataLoaded) {
      onDataLoaded(data);
    }
    // Always route to step 1 for a new calculation
    navigate('/calculator/step1');
  };

  // Handler for switching to another calculation
  const handleSelectCalculation = (calc: SavedCalculation) => {
    if (calc.id === activeId) return;

    const target = switchToCalculation(calc.id, currentData, currentStep);
    if (target) {
      setActiveId(target.id);
      if (onDataLoaded) {
        onDataLoaded(target.data);
      }

      // Check where to route: either keep current step or go to target's step
      const targetStep = target.lastStep || (target.data?.step === 'submitted' ? 'step3' : 'step1');
      if (location.pathname.includes('/calculator/step3') && targetStep !== 'step3' && !target.data?.finalBotCost) {
        navigate(`/calculator/${targetStep}`);
      } else if (!location.pathname.includes(`/calculator/${targetStep}`)) {
        // If current step is compatible, reload data on current page or navigate
        navigate(`/calculator/${targetStep}`);
      }
    }
  };

  // Handler for closing/deleting a tab
  const handleDeleteCalculation = (e: React.MouseEvent, calcId: string) => {
    e.stopPropagation();
    const { activeId: nextActive, remaining } = removeSavedCalculation(calcId);
    setActiveId(nextActive);
    setCalculations(remaining);

    if (nextActive) {
      const activeCalc = remaining.find(c => c.id === nextActive);
      if (activeCalc && onDataLoaded) {
        onDataLoaded(activeCalc.data);
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-5">
      <div className="p-2 sm:p-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl flex flex-wrap items-center justify-between gap-2">
        {/* Scrollable list of calculation tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-amber-400/20 max-w-full">
          {calculations.map((calc, idx) => {
            const isActive = calc.id === activeId;
            const hasFinalEstimate = Boolean(calc.data?.finalBotCost || calc.data?.annualSavings);

            return (
              <div
                key={calc.id}
                onClick={() => handleSelectCalculation(calc)}
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap select-none backdrop-blur-md ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400/25 via-yellow-400/20 to-amber-500/15 border border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(231,199,104,0.3)]'
                    : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white hover:border-white/25 hover:bg-black/60'
                }`}
                title={`Перейти к расчету: ${calc.title}`}
              >
                {hasFinalEstimate ? (
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                ) : (
                  <Calculator className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                )}

                <span className="truncate max-w-[170px] sm:max-w-[240px]">
                  {calc.title || `Расчет ${idx + 1}`}
                </span>

                {calc.data?.employeeCount && (
                  <span className={`text-sm px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-zinc-500'
                  }`}>
                    {calc.data.employeeCount} сотр.
                  </span>
                )}

                {/* Delete tab button (only visible when more than 1 calculation exists) */}
                {calculations.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCalculation(e, calc.id)}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors ml-0.5 cursor-pointer"
                    title="Закрыть этот расчет"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action button: Новый расчет */}
        <button
          type="button"
          onClick={handleNewCalculation}
          className="px-3.5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-500/15 hover:from-amber-400/30 hover:to-amber-500/25 text-amber-200 border border-amber-400/40 hover:border-amber-400/70 shadow-[0_0_12px_rgba(231,199,104,0.2)] transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shrink-0 ml-auto"
          title="Сбросить текущие поля и начать новый расчет с сохранением текущего в табах"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Новый расчет</span>
        </button>
      </div>
    </div>
  );
};

export default CalculatorTabs;
