export interface SavedCalculation {
  id: string;
  title: string;
  department: string;
  createdAt: number;
  lastStep: string;
  data: any;
}

const STORAGE_KEY = 'sav_saved_calculations';
const ACTIVE_ID_KEY = 'sav_active_calculation_id';
const CURRENT_DATA_KEY = 'sav-calculator-data';

export function getCleanDefaultCalculation(): any {
  return {
    fullName: localStorage.getItem('sav_user_name') || '',
    company: '',
    product: '',
    city: '',
    contactType: 'Telegram',
    contactValue: localStorage.getItem('sav_contact_value') || '',
    comment: '',
    avgSalary: null,
    employeeCount: '2',
    averageSalary: '65000',
    department: 'Отдел продаж',
    maintenance: 'Да',
    functionality: 'Автоматизация обработки входящих обращений, квалификация лидов и интеграция с CRM 24/7',
    uploadedDocUrl: '',
    uploadedDocName: '',
    promoCode: '',
    selectedExpert: 'Алексей Шишканов (Dr.White)',
    selectedExpertId: '1',
    tzText: '',
    tzFunctions: [],
    imageUrl: '',
    step: 'step1'
  };
}

export function loadSavedCalculations(): SavedCalculation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getActiveCalculationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ID_KEY) || null;
}

export function setActiveCalculationId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_ID_KEY, id);
}

export function generateCalcTitle(data: any, index: number): string {
  if (data?.company && data.company.trim()) {
    const dept = data.department ? ` • ${data.department}` : '';
    return `${data.company.trim()}${dept}`;
  }
  return `Расчет ${index + 1}`;
}

/**
 * Ensures current calculation in sessionStorage/localStorage is saved into the list
 */
export function persistCurrentCalculation(data: any, stepName: string = 'step1'): SavedCalculation {
  const calculations = loadSavedCalculations();
  let activeId = getActiveCalculationId();

  if (!activeId) {
    activeId = `calc_${Date.now()}`;
    setActiveCalculationId(activeId);
  }

  const existingIndex = calculations.findIndex(c => c.id === activeId);
  const title = generateCalcTitle(data, existingIndex >= 0 ? existingIndex : calculations.length);

  const calcRecord: SavedCalculation = {
    id: activeId,
    title,
    department: data.department || 'Отдел продаж',
    createdAt: existingIndex >= 0 ? calculations[existingIndex].createdAt : Date.now(),
    lastStep: stepName || data.step || 'step1',
    data: { ...data, step: stepName }
  };

  if (existingIndex >= 0) {
    calculations[existingIndex] = calcRecord;
  } else {
    calculations.push(calcRecord);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(calculations));
  window.dispatchEvent(new CustomEvent('sav_calculations_updated', { detail: { activeId, calculations } }));
  return calcRecord;
}

/**
 * Creates a brand new calculation, resets current state to defaults, and returns new calc ID
 */
export function startNewCalculation(currentData?: any, currentStep: string = 'step3'): { id: string; data: any } {
  // 1. Save current calculation if exists
  if (currentData) {
    persistCurrentCalculation(currentData, currentStep);
  } else {
    try {
      const rawCurrent = sessionStorage.getItem(CURRENT_DATA_KEY) || localStorage.getItem(CURRENT_DATA_KEY);
      if (rawCurrent) {
        persistCurrentCalculation(JSON.parse(rawCurrent), currentStep);
      }
    } catch (_) {}
  }

  // 2. Generate new calculation
  const calculations = loadSavedCalculations();
  const newId = `calc_${Date.now()}`;
  const defaultData = getCleanDefaultCalculation();
  const title = `Расчет ${calculations.length + 1}`;

  const newRecord: SavedCalculation = {
    id: newId,
    title,
    department: defaultData.department,
    createdAt: Date.now(),
    lastStep: 'step1',
    data: defaultData
  };

  calculations.push(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calculations));
  setActiveCalculationId(newId);

  // 3. Clear session storage to fresh default state
  sessionStorage.setItem(CURRENT_DATA_KEY, JSON.stringify(defaultData));
  localStorage.setItem('sav_calculator_data', JSON.stringify(defaultData));
  localStorage.setItem(CURRENT_DATA_KEY, JSON.stringify(defaultData));

  // Remove stale transient flags
  sessionStorage.removeItem('sav-calculator-tz');
  sessionStorage.removeItem('sav-calculator-dictation');
  sessionStorage.removeItem('sav-business-description');
  sessionStorage.removeItem('sav-company-name');
  sessionStorage.removeItem('sav-project-name');

  window.dispatchEvent(new CustomEvent('sav_calculations_updated', { detail: { activeId: newId, calculations } }));
  window.dispatchEvent(new CustomEvent('sav_calculator_switched', { detail: { id: newId, data: defaultData } }));

  return { id: newId, data: defaultData };
}

/**
 * Switch to an existing calculation
 */
export function switchToCalculation(targetId: string, currentDataToSave?: any, currentStep?: string): SavedCalculation | null {
  const calculations = loadSavedCalculations();
  if (currentDataToSave) {
    persistCurrentCalculation(currentDataToSave, currentStep || 'step1');
  }

  const target = calculations.find(c => c.id === targetId);
  if (!target) return null;

  setActiveCalculationId(targetId);
  sessionStorage.setItem(CURRENT_DATA_KEY, JSON.stringify(target.data));
  localStorage.setItem('sav_calculator_data', JSON.stringify(target.data));
  localStorage.setItem(CURRENT_DATA_KEY, JSON.stringify(target.data));

  window.dispatchEvent(new CustomEvent('sav_calculations_updated', { detail: { activeId: targetId, calculations } }));
  window.dispatchEvent(new CustomEvent('sav_calculator_switched', { detail: { id: targetId, data: target.data } }));

  return target;
}

/**
 * Remove calculation
 */
export function removeSavedCalculation(id: string): { activeId: string | null; remaining: SavedCalculation[] } {
  let calculations = loadSavedCalculations();
  const currentActiveId = getActiveCalculationId();
  calculations = calculations.filter(c => c.id !== id);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(calculations));

  let nextActiveId = currentActiveId;
  if (currentActiveId === id) {
    if (calculations.length > 0) {
      nextActiveId = calculations[calculations.length - 1].id;
      switchToCalculation(nextActiveId);
    } else {
      const { id: newId } = startNewCalculation();
      nextActiveId = newId;
    }
  }

  window.dispatchEvent(new CustomEvent('sav_calculations_updated', { detail: { activeId: nextActiveId, calculations } }));
  return { activeId: nextActiveId, remaining: calculations };
}
