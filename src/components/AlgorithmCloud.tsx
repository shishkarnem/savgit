import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  X,
  Building2,
  Car,
  HeartPulse,
  GraduationCap,
  Factory,
  Cpu,
  Coffee,
  ShoppingBag,
  Megaphone,
  Briefcase,
  LayoutGrid,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { AlgorithmItem, READY_ALGORITHMS } from '@/data/algorithmsData';

interface AlgorithmCloudProps {
  onSelect: (algo: AlgorithmItem) => void;
  selectedId?: string | null;
  searchQuery?: string;
  viewMode?: 'cloud' | 'cards';
  onViewModeChange?: (mode: 'cloud' | 'cards') => void;
}

const SPHERE_ICONS: Record<string, React.ReactNode> = {
  'Строительство': <Building2 className="w-4 h-4 text-amber-300" />,
  'Транспорт': <Car className="w-4 h-4 text-amber-300" />,
  'Здоровье': <HeartPulse className="w-4 h-4 text-amber-300" />,
  'Образование': <GraduationCap className="w-4 h-4 text-amber-300" />,
  'Производство': <Factory className="w-4 h-4 text-amber-300" />,
  'Технологии': <Cpu className="w-4 h-4 text-amber-300" />,
  'Досуг': <Coffee className="w-4 h-4 text-amber-300" />,
  'Торговля': <ShoppingBag className="w-4 h-4 text-amber-300" />,
  'Реклама': <Megaphone className="w-4 h-4 text-amber-300" />,
  'Другое': <Briefcase className="w-4 h-4 text-amber-300" />
};

export const AlgorithmCloud: React.FC<AlgorithmCloudProps> = ({
  onSelect,
  selectedId,
  searchQuery = '',
  viewMode: controlledViewMode,
  onViewModeChange
}) => {
  const [algorithms, setAlgorithms] = useState<AlgorithmItem[]>(READY_ALGORITHMS);
  const [hoveredAlgo, setHoveredAlgo] = useState<AlgorithmItem | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<'cloud' | 'cards'>('cloud');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: 'cloud' | 'cards') => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  };

  // Fetch algorithms from server API
  useEffect(() => {
    const loadAlgorithms = async () => {
      try {
        const res = await fetch('/api/algorithms');
        const data = await res.json();
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setAlgorithms(data.items);
        }
      } catch (err) {
        console.warn('Using built-in algorithms data:', err);
      }
    };
    loadAlgorithms();
  }, []);

  // Filter algorithms live based on parent input field searchQuery
  const filteredAlgorithms = useMemo(() => {
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) return algorithms;

    return algorithms.filter(algo => {
      return (
        algo.name.toLowerCase().includes(query) ||
        algo.description.toLowerCase().includes(query) ||
        algo.sphere.toLowerCase().includes(query) ||
        algo.category.toLowerCase().includes(query)
      );
    });
  }, [algorithms, searchQuery]);

  const selectedAlgoObj = useMemo(() => {
    return algorithms.find(a => a.id === selectedId) || null;
  }, [algorithms, selectedId]);

  // If no algorithms matched, do NOT show any notification text or view switch
  if (filteredAlgorithms.length === 0 && !selectedAlgoObj) {
    return null;
  }

  return (
    <div className="w-full space-y-2.5 font-sans">
      {/* Selected Algorithm Banner */}
      {selectedAlgoObj && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-100 backdrop-blur-xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <Check className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-semibold text-sm truncate">
              Выбран алгоритм: {selectedAlgoObj.name} ({selectedAlgoObj.sphere})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelect({ id: '', name: '', sphere: '', category: '', segment: '', description: '' })}
            className="p-1 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition-all text-sm shrink-0 cursor-pointer"
            title="Сбросить выбор"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Accordion Trigger for "Шаблоны параметров" (hidden on desktop) */}
      {filteredAlgorithms.length > 0 && (
        <div className="md:hidden pt-0.5">
          <button
            type="button"
            id="templates-dropdown-trigger"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-black/70 hover:bg-black/85 border border-amber-400/35 hover:border-amber-300 text-left transition-all backdrop-blur-md cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="text-sm font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                Шаблоны параметров
              </span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 font-mono">
                {filteredAlgorithms.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-amber-200/90 font-medium">
              <span>{isMobileOpen ? 'Скрыть' : 'Выбрать'}</span>
              <ChevronDown
                className={`w-4 h-4 text-amber-300 transition-transform duration-300 ${
                  isMobileOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
        </div>
      )}

      {/* PC Header bar with counter and View Mode Toggle (hidden on mobile, unchanged for PC) */}
      {filteredAlgorithms.length > 0 && (
        <div className="hidden md:flex items-center justify-between gap-2 pt-1 pb-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
              Шаблоны параметров:
            </span>
            <span className="text-sm text-amber-200/80 font-mono">
              найдено {filteredAlgorithms.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'cloud' ? 'cards' : 'cloud')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-400/35 hover:border-amber-300 text-sm text-amber-100 hover:text-white transition-all cursor-pointer shadow-sm backdrop-blur-md active:scale-95"
            title="Переключить вид отображения"
          >
            {viewMode === 'cloud' ? (
              <>
                <LayoutGrid className="w-4 h-4 text-amber-300" />
                <span className="font-medium">Карточки</span>
              </>
            ) : (
              <>
                <Tag className="w-4 h-4 text-amber-300" />
                <span className="font-medium">Облако</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area: Collapsible on mobile, always visible on PC */}
      {filteredAlgorithms.length > 0 && (
        <div className={`${isMobileOpen ? 'block' : 'hidden'} md:block space-y-2.5 pt-1`}>
          {/* Mobile view switch (only shown when dropdown is open on mobile) */}
          <div className="md:hidden flex items-center justify-between gap-2 pb-1 border-b border-amber-400/20">
            <span className="text-sm text-amber-200/80 font-mono">
              Вид списка:
            </span>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'cloud' ? 'cards' : 'cloud')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-400/35 text-sm text-amber-100 transition-all cursor-pointer"
            >
              {viewMode === 'cloud' ? (
                <>
                  <LayoutGrid className="w-4 h-4 text-amber-300" />
                  <span>Карточки</span>
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 text-amber-300" />
                  <span>Облако</span>
                </>
              )}
            </button>
          </div>

          {viewMode === 'cloud' ? (
            /* Cloud Mode (Compact tags with hover details) */
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1 py-1 custom-scrollbar">
                {filteredAlgorithms.map((algo) => {
                  const isSelected = selectedId === algo.id;
                  const sphereIcon = SPHERE_ICONS[algo.sphere] || <Sparkles className="w-4 h-4 text-amber-300" />;

                  return (
                    <motion.button
                      key={algo.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        onSelect(algo);
                        setIsMobileOpen(false);
                      }}
                      onMouseEnter={() => setHoveredAlgo(algo)}
                      onMouseLeave={() => setHoveredAlgo(null)}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold shadow-lg border border-amber-300'
                          : 'bg-black/70 hover:bg-black/90 text-amber-100 hover:text-white border border-amber-400/30 hover:border-amber-300 shadow-md backdrop-blur-md'
                      }`}
                    >
                      <span className={isSelected ? 'text-black' : 'text-amber-300'}>
                        {sphereIcon}
                      </span>
                      <span className="font-medium truncate max-w-[220px]">
                        {algo.name}
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-amber-200/80'
                      }`}>
                        {algo.sphere}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Hover / Active Detail Tooltip Card */}
              {(hoveredAlgo || selectedAlgoObj) && (
                <motion.div
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-black/85 border border-amber-400/40 backdrop-blur-2xl text-amber-100 space-y-1.5 shadow-xl text-sm"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 text-sm font-semibold">
                    <div className="flex items-center gap-2 text-amber-300">
                      {SPHERE_ICONS[(hoveredAlgo || selectedAlgoObj)!.sphere]}
                      <span>{(hoveredAlgo || selectedAlgoObj)!.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        {(hoveredAlgo || selectedAlgoObj)!.sphere}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-amber-100 border border-white/20">
                        {(hoveredAlgo || selectedAlgoObj)!.segment} / {(hoveredAlgo || selectedAlgoObj)!.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-amber-100/90 leading-relaxed font-sans">
                    {(hoveredAlgo || selectedAlgoObj)!.description}
                  </p>
                </motion.div>
              )}
            </div>
          ) : (
            /* Cards Mode (2 columns grid with descriptions) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredAlgorithms.map((algo) => {
                const isSelected = selectedId === algo.id;
                const sphereIcon = SPHERE_ICONS[algo.sphere] || <Sparkles className="w-4 h-4 text-amber-300" />;

                return (
                  <div
                    key={algo.id}
                    onClick={() => {
                      onSelect(algo);
                      setIsMobileOpen(false);
                    }}
                    className={`group p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border text-sm ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-300 shadow-lg text-white'
                        : 'bg-black/70 hover:bg-black/90 border-amber-400/30 hover:border-amber-300 text-amber-100 shadow-md backdrop-blur-md'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-sm text-amber-200 group-hover:text-amber-100">
                          {sphereIcon}
                          <span className="truncate">{algo.name}</span>
                        </div>
                        <span className="text-sm px-2 py-0.5 rounded bg-white/10 text-amber-200/80 border border-white/10 shrink-0">
                          {algo.sphere}
                        </span>
                      </div>
                      <p className="text-sm text-amber-100/80 line-clamp-2 leading-relaxed font-sans">
                        {algo.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-amber-400/20 text-sm text-amber-200/70">
                      <span>{algo.segment} • {algo.category}</span>
                      <span className="font-semibold text-amber-300 group-hover:underline text-sm">
                        {isSelected ? 'Выбрано' : 'Применить'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlgorithmCloud;
