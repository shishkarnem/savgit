import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ShoppingBag,
  Check,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Zap,
  RefreshCw,
  Layers2,
  Store,
  Briefcase,
  X,
  Bot,
  Loader2
} from 'lucide-react';
import Header from '../components/Header';
import DevModeToggle from '../components/DevModeToggle';
import { RealisticSmokeBackdrop } from '../components/RealisticSmokeBackdrop';
import { BusinessAuditModal } from '../components/BusinessAuditModal';
import GlobalFooter from '../components/GlobalFooter';
import { MarketplaceItem, ProductVariant } from '@/types';
import { INITIAL_MARKETPLACE_ITEMS, MARKETPLACE_CATEGORIES, extractCategoriesFromItems } from '@/data/marketplaceData';
import { generateProductSlug } from '@/utils/slugUtils';

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize empty and wait for database fetch to complete without flashing defaults
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Multi-select dropdown filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]); // 'Товары' | 'Услуги'
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]); // 'B2C' | 'B2B'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc'>('default');

  // Active open dropdown
  const [openDropdown, setOpenDropdown] = useState<'category' | 'type' | 'segment' | 'sort' | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(15);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Business Audit / Connect modal state
  const [orderModalItem, setOrderModalItem] = useState<MarketplaceItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load products and categories from backend BD ProTalk database on mount
  useEffect(() => {
    async function loadDatabaseProducts() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/v1/marketplace/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            setItems(data.products);
            const extracted = extractCategoriesFromItems(data.products);
            setCategories(extracted);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend products not loaded from server, checking fallback:', err);
      }

      // Check localStorage fallback
      try {
        const saved = localStorage.getItem('sav_marketplace_items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
            setCategories(extractCategoriesFromItems(parsed));
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Fallback only if database is completely empty or unavailable
      setItems(INITIAL_MARKETPLACE_ITEMS);
      setCategories(MARKETPLACE_CATEGORIES);
      setIsLoading(false);
    }

    loadDatabaseProducts();
  }, []);

  // Reset pagination on filter or search change
  useEffect(() => {
    setVisibleCount(15);
  }, [selectedCategories, selectedTypes, selectedSegments, searchQuery, sortBy]);

  // Category search filter inside dropdown
  const filteredCategoryList = useMemo(() => {
    const withoutAll = categories.filter(c => c !== 'Все');
    if (!categorySearchQuery.trim()) return withoutAll;
    const q = categorySearchQuery.toLowerCase().trim();
    return withoutAll.filter(c => c.toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  // Helper counters for categories
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(it => {
      counts[it.category] = (counts[it.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Toggle category in multi-select
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Toggle business type in multi-select
  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  // Toggle business segment in multi-select
  const toggleSegment = (seg: string) => {
    setSelectedSegments(prev =>
      prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
    );
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // 1. Categories multi-select filter
        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(item.category) ||
          (selectedCategories.includes('Загруженные из файла') && (item.tildaUid || item.sku));

        // 2. Direction: Товары и услуги
        const matchesType =
          selectedTypes.length === 0 ||
          selectedTypes.some((t) => {
            const str = `${item.name} ${item.category} ${item.niche || ''} ${item.shortDescription}`.toLowerCase();
            if (t === 'Товары') {
              return (
                str.includes('торговл') ||
                str.includes('товар') ||
                str.includes('ритейл') ||
                str.includes('магазин') ||
                str.includes('обув') ||
                str.includes('одежд') ||
                str.includes('продаж') ||
                str.includes('доставк')
              );
            }
            if (t === 'Услуги') {
              return (
                str.includes('услуг') ||
                str.includes('сервис') ||
                str.includes('клиник') ||
                str.includes('медицин') ||
                str.includes('салон') ||
                str.includes('автобизнес') ||
                str.includes('недвижим') ||
                str.includes('ресторан') ||
                str.includes('отель') ||
                str.includes('юрист') ||
                str.includes('консалтинг')
              );
            }
            return false;
          });

        // 3. Segment: B2C / B2B
        const matchesSegment =
          selectedSegments.length === 0 ||
          selectedSegments.some((seg) => {
            if (seg === 'B2C') {
              return (
                item.name.includes('B2C') ||
                item.shortDescription.includes('B2C') ||
                item.niche?.includes('B2C') ||
                (item.variants && item.variants.some((v) => v.subtitle?.includes('B2C') || v.segmentOption === 'B2C'))
              );
            }
            if (seg === 'B2B') {
              return (
                item.name.includes('B2B') ||
                item.shortDescription.includes('B2B') ||
                item.niche?.includes('B2B') ||
                (item.variants && item.variants.some((v) => v.subtitle?.includes('B2B') || v.segmentOption === 'B2B'))
              );
            }
            return false;
          });

        // 4. Search query
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.niche && item.niche.toLowerCase().includes(query)) ||
          item.shortDescription.toLowerCase().includes(query);

        return matchesCategory && matchesType && matchesSegment && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        // По умолчанию и по выбору: сортировка по названию (А — Я)
        return a.name.localeCompare(b.name, 'ru');
      });
  }, [items, selectedCategories, selectedTypes, selectedSegments, searchQuery, sortBy]);

  // Sliced items for 15 items per page / infinite scroll
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const hasMore = visibleCount < filteredItems.length;

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 15, filteredItems.length));
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, hasMore, filteredItems.length]);

  // Infinite scroll observer
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, handleLoadMore]);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedTypes.length > 0 ||
    selectedSegments.length > 0 ||
    searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedSegments([]);
    setSearchQuery('');
    setCategorySearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8 relative">
      <DevModeToggle />
      <Header onLogoClick={() => navigate('/')} />

      <main className="w-full max-w-7xl flex-grow space-y-6 mt-2">
        {/* Top Title & Highlights in Liquid Glass Apple style */}
        <div className="liquid-bubble-plate border border-amber-400/35 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-2xl">
          <span className="liquid-bubble-glare" />
          <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="absolute inset-0 pointer-events-none z-0" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-bubble-secondary border border-amber-400/40 text-amber-300 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Готовые ИИ-ассистенты и цифровые сотрудники
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-md">
                Маркетплейс готовых ИИ-решений
              </h1>
              <p className="text-zinc-300 text-sm md:text-base max-w-2xl leading-relaxed">
                Выберите отраслевого ИИ-консультанта под вашу нишу с готовой базой знаний, калькулятором цен и быстрой интеграцией в Telegram, WhatsApp и CRM.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl liquid-bubble-secondary border border-white/15 text-center">
                <span className="text-sm text-zinc-400 block font-medium">В каталоге</span>
                <span className="text-lg font-bold text-amber-300 font-mono">{isLoading ? '...' : items.length}</span>
                <span className="text-sm text-zinc-400 ml-1">решений</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl liquid-bubble-secondary border border-white/15 text-center">
                <span className="text-sm text-zinc-400 block font-medium">Тарифов в каждом</span>
                <span className="text-lg font-bold text-white font-mono">5 пакетов</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Multi-Select Filter Panel & Search Controls */}
        <div ref={dropdownRef} className="liquid-bubble-plate border border-amber-400/35 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl relative z-30 overflow-visible backdrop-blur-2xl">
          <span className="liquid-bubble-glare" />
          {/* Top Row: Search input + Sorting selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center relative z-20">
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Поиск по названию, нише, технологиям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-2xl liquid-bubble-secondary border border-white/20 text-white placeholder-white/50 text-sm md:text-base focus:outline-none focus:border-amber-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Selector with Liquid Glass blurred dropdown */}
            <div className="md:col-span-4 relative z-30">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className={`w-full py-3 px-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 backdrop-blur-2xl cursor-pointer ${
                  sortBy !== 'default' || openDropdown === 'sort'
                    ? 'border-amber-400 liquid-bubble-secondary text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-white/20 liquid-bubble-secondary text-zinc-200 hover:border-amber-400/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">
                    {sortBy === 'default' && 'Сортировка: По названию (по умолчанию)'}
                    {sortBy === 'price-asc' && 'Сначала доступные по цене'}
                    {sortBy === 'price-desc' && 'Сначала премиальные по цене'}
                    {sortBy === 'name-asc' && 'По названию (А — Я)'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-300 shrink-0 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === 'sort' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 p-2.5 rounded-2xl backdrop-blur-3xl bg-[#090d16]/95 border border-amber-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-1"
                  >
                    {[
                      { id: 'default', label: 'По названию (по умолчанию)' },
                      { id: 'price-asc', label: 'Сначала доступные по цене' },
                      { id: 'price-desc', label: 'Сначала премиальные по цене' },
                      { id: 'name-asc', label: 'По названию (А — Я)' }
                    ].map((sOpt) => {
                      const isSelected = sortBy === sOpt.id;
                      return (
                        <button
                          key={sOpt.id}
                          type="button"
                          onClick={() => {
                            setSortBy(sOpt.id as any);
                            setOpenDropdown(null);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/20 border border-amber-400/50 text-white font-semibold'
                              : 'hover:bg-white/5 border border-transparent text-white/85'
                          }`}
                        >
                          <span>{sOpt.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-300 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Row: 3 Vertical Multi-Select Dropdown Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-30">
            {/* Dropdown 1: Categories / Industries */}
            <div className={`relative ${openDropdown === 'category' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                className={`w-full py-3 px-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 backdrop-blur-2xl cursor-pointer ${
                  selectedCategories.length > 0 || openDropdown === 'category'
                    ? 'border-amber-400 liquid-bubble-secondary text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-white/20 liquid-bubble-secondary text-zinc-200 hover:border-amber-400/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? 'Категории (Все)'
                      : `Категории (${selectedCategories.length})`}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-300 shrink-0 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown 1 Content Menu */}
              <AnimatePresence>
                {openDropdown === 'category' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 p-3.5 rounded-2xl backdrop-blur-3xl bg-[#0a0a10]/95 border border-amber-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-3 max-h-80 overflow-y-auto"
                  >
                    {/* Search inside categories */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        placeholder="Поиск категории..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Actions: Select all / Clear */}
                    <div className="flex items-center justify-between text-sm px-1 text-white/70">
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="hover:text-amber-300 transition-colors font-medium"
                      >
                        Сбросить выбор
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(categories.filter(c => c !== 'Все'))}
                        className="hover:text-amber-300 transition-colors font-medium"
                      >
                        Выбрать все
                      </button>
                    </div>

                    {/* Category Checkboxes List */}
                    <div className="space-y-1 pt-1">
                      {filteredCategoryList.map((cat) => {
                        const isChecked = selectedCategories.includes(cat);
                        const count = categoryCounts[cat] || 0;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`w-full p-2.5 rounded-xl text-left text-sm transition-all flex items-center justify-between gap-2 ${
                              isChecked
                                ? 'bg-amber-400/20 border border-amber-400/50 text-white font-semibold'
                                : 'hover:bg-white/5 border border-transparent text-white/90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isChecked ? 'border-amber-400 bg-amber-400 text-black font-bold' : 'border-white/30 bg-black/40'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{cat}</span>
                            </div>
                            <span className="text-sm text-amber-300 font-mono shrink-0 font-semibold">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 2: Products & Services (Товары / Услуги) */}
            <div className={`relative ${openDropdown === 'type' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                className={`w-full py-3 px-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 backdrop-blur-2xl cursor-pointer ${
                  selectedTypes.length > 0 || openDropdown === 'type'
                    ? 'border-amber-400 liquid-bubble-secondary text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-white/20 liquid-bubble-secondary text-zinc-200 hover:border-amber-400/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Store className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {selectedTypes.length === 0
                      ? 'Направление (Товары / Услуги)'
                      : `Направление (${selectedTypes.join(', ')})`}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-300 shrink-0 transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown 2 Content Menu */}
              <AnimatePresence>
                {openDropdown === 'type' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 p-3.5 rounded-2xl backdrop-blur-3xl bg-[#090d16]/95 border border-amber-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-2"
                  >
                    <div className="text-sm text-white/70 px-1 pb-1 border-b border-white/10 flex items-center justify-between">
                      <span>Выберите направления бизнеса:</span>
                      {selectedTypes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTypes([])}
                          className="hover:text-amber-300 font-medium"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>

                    {[
                      { id: 'Товары', label: 'Товары', desc: 'Ритейл, интернет-магазины, бренды, маркетплейсы' },
                      { id: 'Услуги', label: 'Услуги', desc: 'Сервис, клиники, салоны, автобизнес, консалтинг' }
                    ].map((typeItem) => {
                      const isChecked = selectedTypes.includes(typeItem.id);
                      return (
                        <button
                          key={typeItem.id}
                          type="button"
                          onClick={() => toggleType(typeItem.id)}
                          className={`w-full p-2.5 rounded-xl text-left text-sm transition-all flex items-start justify-between gap-2 ${
                            isChecked
                              ? 'bg-amber-400/20 border border-amber-400/50 text-white font-semibold'
                              : 'hover:bg-white/5 border border-transparent text-white/90'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                              isChecked ? 'border-amber-400 bg-amber-400 text-black font-bold' : 'border-white/30 bg-black/40'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{typeItem.label}</div>
                              <div className="text-sm text-white/70 leading-snug">{typeItem.desc}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 3: B2C & B2B Segments */}
            <div className={`relative ${openDropdown === 'segment' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'segment' ? null : 'segment')}
                className={`w-full py-3 px-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 backdrop-blur-2xl cursor-pointer ${
                  selectedSegments.length > 0 || openDropdown === 'segment'
                    ? 'border-amber-400 liquid-bubble-secondary text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-white/20 liquid-bubble-secondary text-zinc-200 hover:border-amber-400/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Briefcase className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {selectedSegments.length === 0
                      ? 'Сегмент (B2C / B2B)'
                      : `Сегмент (${selectedSegments.join(', ')})`}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-300 shrink-0 transition-transform ${openDropdown === 'segment' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown 3 Content Menu */}
              <AnimatePresence>
                {openDropdown === 'segment' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 p-3.5 rounded-2xl backdrop-blur-3xl bg-[#090d16]/95 border border-amber-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-2"
                  >
                    <div className="text-sm text-white/70 px-1 pb-1 border-b border-white/10 flex items-center justify-between">
                      <span>Выберите целевой сегмент:</span>
                      {selectedSegments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSegments([])}
                          className="hover:text-amber-300 font-medium"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>

                    {[
                      { id: 'B2C', label: 'B2C', desc: 'Работа с розничными клиентами и физлицами' },
                      { id: 'B2B', label: 'B2B', desc: 'Корпоративные продажи, дилеры и партнерства' }
                    ].map((segItem) => {
                      const isChecked = selectedSegments.includes(segItem.id);
                      return (
                        <button
                          key={segItem.id}
                          type="button"
                          onClick={() => toggleSegment(segItem.id)}
                          className={`w-full p-2.5 rounded-xl text-left text-sm transition-all flex items-start justify-between gap-2 ${
                            isChecked
                              ? 'bg-amber-400/20 border border-amber-400/50 text-white font-semibold'
                              : 'hover:bg-white/5 border border-transparent text-white/90'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                              isChecked ? 'border-amber-400 bg-amber-400 text-black font-bold' : 'border-white/30 bg-black/40'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{segItem.label}</div>
                              <div className="text-sm text-white/70 leading-snug">{segItem.desc}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Filter Badges Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-sm text-white/70 font-medium">Активные фильтры:</span>

              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 rounded-xl backdrop-blur-md bg-amber-400/15 border border-amber-400/40 text-amber-300 text-sm font-semibold flex items-center gap-1.5"
                >
                  {cat}
                  <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}

              {selectedTypes.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-xl backdrop-blur-md bg-amber-400/15 border border-amber-400/40 text-amber-300 text-sm font-semibold flex items-center gap-1.5"
                >
                  Направление: {t}
                  <button type="button" onClick={() => toggleType(t)} className="hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}

              {selectedSegments.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-xl backdrop-blur-md bg-amber-400/15 border border-amber-400/40 text-amber-300 text-sm font-semibold flex items-center gap-1.5"
                >
                  Сегмент: {s}
                  <button type="button" onClick={() => toggleSegment(s)} className="hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}

              {searchQuery && (
                <span className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white text-sm font-semibold flex items-center gap-1.5">
                  Поиск: «{searchQuery}»
                  <button type="button" onClick={() => setSearchQuery('')} className="hover:text-amber-300">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1 font-medium"
              >
                Сбросить все
              </button>
            </div>
          )}
        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between px-2 text-sm text-white/70">
          <div>
            Найдено решений: <span className="font-semibold text-white">{filteredItems.length}</span>
            {filteredItems.length > 0 && (
              <span className="text-white/50 ml-2">
                (показано {displayedItems.length} из {filteredItems.length})
              </span>
            )}
          </div>
        </div>

        {/* Clean Product Grid (No rating stars, no generic feature bullets) */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl backdrop-blur-xl bg-black/30 border border-white/20 p-12 text-center space-y-4">
            <ShoppingBag className="w-16 h-16 text-white/40 mx-auto" />
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
              Товары не найдены
            </h3>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Попробуйте изменить параметры фильтрации или поисковый запрос.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-5 py-2.5 rounded-xl border border-amber-400 text-white text-sm font-semibold hover:border-amber-300 transition-all"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedItems.map((item) => {
              const productUrl = `/marketplace/${generateProductSlug(item.name || item.id)}`;
              const lowestPrice = item.price || 3600;
              const devCost = item.variants && item.variants[0]?.oldPrice
                ? item.variants[0].oldPrice
                : (lowestPrice * 5);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-3xl backdrop-blur-2xl bg-black/30 hover:bg-black/45 border border-white/20 hover:border-amber-400/50 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl group"
                >
                  <div className="space-y-4">
                    {/* Item Image and Category Badge (No rating stars, no top sales badge) */}
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/20 bg-black/40">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40">
                          <Bot className="w-16 h-16" />
                        </div>
                      )}

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
                        <span className="px-2.5 py-1 rounded-lg backdrop-blur-md bg-black/80 border border-amber-400/40 text-amber-300 text-sm font-semibold truncate">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <Link to={productUrl} className="hover:opacity-90 transition-opacity">
                        <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
                          {item.name}
                        </h3>
                      </Link>
                    </div>

                    {/* Short Description */}
                    <p className="text-sm text-white/85 leading-relaxed line-clamp-3">
                      {item.shortDescription}
                    </p>
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-5 mt-5 border-t border-white/10 space-y-3">
                    {/* Double Price: Monthly + Development */}
                    <div className="p-3 rounded-xl backdrop-blur-md bg-black/40 border border-white/15 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-white/70 font-medium">Абонентская плата:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base md:text-lg font-bold text-white font-mono">
                            от {lowestPrice.toLocaleString('ru-RU')} ₽
                          </span>
                          <span className="text-sm text-amber-300">/ мес</span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-white/10 pt-1.5">
                        <span className="text-sm text-white/70 font-medium">Разработка под ключ:</span>
                        <span className="text-sm font-semibold text-white/95 font-mono">
                          от {devCost.toLocaleString('ru-RU')} ₽ разово
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={productUrl}
                        className="w-full py-2.5 px-3 rounded-xl backdrop-blur-md bg-black/30 hover:bg-black/50 border border-white/20 text-white hover:border-amber-400/40 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        Подробнее
                        <ChevronRight className="w-4 h-4 text-amber-300" />
                      </Link>

                      <button
                        onClick={() => {
                          setOrderModalItem(item);
                          if (item.variants && item.variants.length > 0) {
                            setSelectedVariant(item.variants[0]);
                          } else {
                            setSelectedVariant(null);
                          }
                          setIsAuditModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl border border-amber-400 text-white hover:border-amber-300 text-sm font-bold transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-amber-500/20 to-transparent hover:from-amber-500/30"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        Подключить
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Load More Trigger & Indicator */}
        <div ref={loadMoreTriggerRef} className="py-6 flex flex-col items-center justify-center gap-3">
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-3 rounded-2xl border border-amber-400/50 backdrop-blur-xl bg-black/40 hover:bg-black/60 text-white font-semibold text-sm transition-all shadow-lg flex items-center gap-2 hover:border-amber-300 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Загрузка следующих 15 решений...</span>
                </>
              ) : (
                <>
                  <Layers2 className="w-4 h-4 text-amber-300" />
                  <span>Показать еще 15 решений</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Global Footer */}
      <GlobalFooter />

      {/* Business Audit Modal */}
      {orderModalItem && (
        <BusinessAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => {
            setIsAuditModalOpen(false);
            setOrderModalItem(null);
          }}
          initialData={{
            source: 'marketplace_catalog',
            tariffName: orderModalItem.name,
            tariffPackage: selectedVariant?.name || 'Лайт',
            price: selectedVariant ? selectedVariant.price : orderModalItem.price,
            paymentType: 'monthly',
            imageUrl: orderModalItem.imageUrl,
            businessInfo: {
              sphere: orderModalItem.category,
              category: orderModalItem.category,
              companyName: '',
              description: orderModalItem.shortDescription,
              imageUrl: orderModalItem.imageUrl
            },
            customNotes: `Решение: ${orderModalItem.name}\nТариф: ${selectedVariant?.name || 'Лайт'}\nКатегория: ${orderModalItem.category}`
          }}
        />
      )}
    </div>
  );
};

export default MarketplacePage;
