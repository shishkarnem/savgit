import React, { useEffect, useState, useRef } from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { MarketplaceItem } from '@/types';
import { INITIAL_MARKETPLACE_ITEMS, parseCsvContent } from '@/data/marketplaceData';
import { exportProductsToCsv, generateSampleCsvTemplate, downloadCsvBlob } from '@/utils/marketplaceCsv';
import {
  ShoppingBag,
  Layers,
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  Tag,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  FileText,
  Filter,
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface BatchProgressState {
  active: boolean;
  currentBatch: number;
  totalBatches: number;
  percent: number;
  processedItems: number;
  totalItems: number;
  statusText: string;
}

export const AdminMarketPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'leads' | 'import'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selection state for bulk operations
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // CSV Import state
  const [csvText, setCsvText] = useState<string>('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1NNM_MP-XYABl8sbApFyp2loqbuasERaFDnO1bop6J24/edit?usp=sharing');
  const [isSheetImporting, setIsSheetImporting] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<MarketplaceItem[] | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progressive batch progress state
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    active: false,
    currentBatch: 0,
    totalBatches: 0,
    percent: 0,
    processedItems: 0,
    totalItems: 0,
    statusText: ''
  });

  // Edit / Add Product State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState<any>({});

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Подтвердить',
    onConfirm: () => {}
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch products
      const pRes = await fetch('/api/admin/table/marketplace_products');
      const pData = await pRes.json();
      if (pData.success) {
        setProducts(pData.rows || []);
      }

      // 2. Fetch categories
      const cRes = await fetch('/api/admin/table/marketplace_categories');
      const cData = await cRes.json();
      if (cData.success) {
        setCategories(cData.rows || []);
      }

      // 3. Fetch leads
      const lRes = await fetch('/api/admin/table/marketplace_leads');
      const lData = await lRes.json();
      if (lData.success) {
        setLeads(lData.rows || []);
      }
    } catch (err: any) {
      console.error('Error loading marketplace DB data:', err);
      setErrorMsg('Не удалось загрузить данные маркетплейса из базы данных.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Unique categories from products + database categories
  const availableCategories = ['Все', ...Array.from(new Set([
    ...categories.map(c => c.name),
    ...products.map(p => p.category)
  ])).filter(Boolean)];

  // Selection handlers
  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredProducts.map((p) => String(p.id || p.tilda_uid));
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  // Bulk Delete Selected Products
  const handleBulkDeleteSelected = () => {
    if (selectedProductIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Массовое удаление товаров',
      message: `Вы действительно хотите безвозвратно удалить выбранные товары (${selectedProductIds.length} шт.) из базы данных?`,
      confirmText: 'Удалить выбранные',
      onConfirm: async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
          const res = await fetch('/api/marketplace/products/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedProductIds })
          });
          const data = await res.json();
          if (data.success) {
            setSuccessMsg(`Успешно удалено ${data.deletedCount} товаров из базы данных.`);
            setSelectedProductIds([]);
            await fetchData();
          } else {
            setErrorMsg(data.error || 'Ошибка при удалении товаров');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Ошибка сети при удалении');
        } finally {
          setLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Delete ALL Products
  const handleDeleteAllProducts = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Очистка всего каталога маркетплейса',
      message: `Внимание! Это действие полностью удалит ВСЕ ${products.length} товаров из базы данных BD ProTalk. Вы уверены?`,
      confirmText: 'Очистить всю базу',
      onConfirm: async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
          const res = await fetch('/api/marketplace/products/clear-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            setSuccessMsg('Каталог маркетплейса полностью очищен.');
            setSelectedProductIds([]);
            await fetchData();
          } else {
            setErrorMsg(data.error || 'Ошибка при очистке каталога');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Ошибка сети при очистке каталога');
        } finally {
          setLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Reset to Default Products
  const handleResetToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Откат каталога к исходным товарам',
      message: `Восстановить заводской каталог маркетплейса (${INITIAL_MARKETPLACE_ITEMS.length} базовых решений с тарифами)? Все текущие позиции будут заменены.`,
      confirmText: 'Сбросить к дефолту',
      onConfirm: async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
          const res = await fetch('/api/marketplace/sync-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              products: INITIAL_MARKETPLACE_ITEMS,
              replace: true
            })
          });
          const data = await res.json();
          if (data.success) {
            setSuccessMsg(`Каталог успешно возвращен к дефолту: восстановлено ${INITIAL_MARKETPLACE_ITEMS.length} решений.`);
            setSelectedProductIds([]);
            await fetchData();
          } else {
            setErrorMsg(data.error || 'Ошибка при сбросе каталога');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Ошибка сети при сбросе каталога');
        } finally {
          setLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Progressive Batch Importer Helper
  const runProgressiveBatchImport = async (parsedItems: MarketplaceItem[]) => {
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(parsedItems.length / BATCH_SIZE);

    setBatchProgress({
      active: true,
      currentBatch: 0,
      totalBatches,
      percent: 0,
      processedItems: 0,
      totalItems: parsedItems.length,
      statusText: `Подготовка к сохранению ${parsedItems.length} товаров...`
    });

    try {
      for (let b = 0; b < totalBatches; b++) {
        const start = b * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, parsedItems.length);
        const chunk = parsedItems.slice(start, end);

        setBatchProgress({
          active: true,
          currentBatch: b + 1,
          totalBatches,
          percent: Math.round(((b + 1) / totalBatches) * 100),
          processedItems: end,
          totalItems: parsedItems.length,
          statusText: `Запись пакета ${b + 1} из ${totalBatches} (${end} из ${parsedItems.length} товаров)...`
        });

        const res = await fetch('/api/marketplace/sync-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: chunk,
            batchIndex: b,
            totalBatches,
            replace: importMode === 'replace'
          })
        });

        const resData = await res.json();
        if (!resData.success) {
          throw new Error(resData.error || `Ошибка на пакете ${b + 1}`);
        }
      }

      setSuccessMsg(`Каталог успешно импортирован: ${parsedItems.length} продуктов записаны в базу данных.`);
      setCsvText('');
      setParsedPreview(null);
      await fetchData();
      setActiveTab('products');
    } catch (err: any) {
      console.error('Batch import error:', err);
      setErrorMsg(`Ошибка при пакетной загрузке: ${err.message}`);
    } finally {
      setTimeout(() => {
        setBatchProgress((prev) => ({ ...prev, active: false }));
      }, 1200);
    }
  };

  // Direct Import from Google Sheets with Live Progressive Batching
  const handleImportFromGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMsg('Введите ссылку на Google Таблицу');
      return;
    }
    setIsSheetImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Step 1: Fetch raw CSV text through backend proxy
      const fetchRes = await fetch('/api/marketplace/fetch-sheet-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl.trim() })
      });

      const fetchDataResult = await fetchRes.json();
      if (!fetchDataResult.success || !fetchDataResult.csvText) {
        throw new Error(fetchDataResult.error || 'Не удалось получить CSV из Google Таблицы');
      }

      // Step 2: Parse CSV into ~200 complex products with 5 child tariff packages each
      const parsedItems = parseCsvContent(fetchDataResult.csvText);
      if (parsedItems.length === 0) {
        throw new Error('В полученном CSV не найдено строк с товарами');
      }

      // Step 3: Run progressive batch upload
      await runProgressiveBatchImport(parsedItems);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка при загрузке Google Таблицы');
    } finally {
      setIsSheetImporting(false);
    }
  };

  // Apply CSV Import from Preview into BD ProTalk via Batches
  const handleApplyCsvImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) {
      setErrorMsg('Сначала загрузите и распознайте CSV каталог');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);
    try {
      await runProgressiveBatchImport(parsedPreview);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка сети при импорте товаров');
    } finally {
      setIsImporting(false);
    }
  };

  // CSV File parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        const parsed = parseCsvContent(content);
        setParsedPreview(parsed);
        if (parsed.length > 0) {
          setSuccessMsg(`Распознано ${parsed.length} товаров из загруженного CSV файла.`);
        } else {
          setErrorMsg('Не удалось распознать позиции. Проверьте заголовки колонок в файле.');
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleParseCsvText = () => {
    if (!csvText.trim()) {
      setErrorMsg('Вставьте текст CSV или выберите файл для импорта');
      return;
    }
    const parsed = parseCsvContent(csvText);
    setParsedPreview(parsed);
    if (parsed.length > 0) {
      setSuccessMsg(`Распознано ${parsed.length} товаров из текста CSV.`);
    } else {
      setErrorMsg('В тексте не найдено строк с товарами. Проверьте наличие заголовков колонок.');
    }
  };

  // Export current catalog to CSV
  const handleExportCsv = () => {
    const csvContent = exportProductsToCsv(products);
    downloadCsvBlob(csvContent, `sav_marketplace_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    setSuccessMsg(`Каталог (${products.length} позиций) успешно экспортирован в CSV.`);
  };

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const template = generateSampleCsvTemplate();
    downloadCsvBlob(template, 'sav_marketplace_template_sample.csv');
  };

  // Single Product Add/Edit Modal
  const handleOpenAdd = () => {
    setProductForm({
      id: `prod_${Date.now()}`,
      sku: `SAV-${Math.floor(Math.random() * 90000 + 10000)}`,
      name: '',
      category: 'SAV Торговля',
      niche: '',
      brand: 'SAV AI',
      short_description: '',
      full_description: '',
      price: 3600,
      max_price: 57600,
      period: 'руб',
      image_url: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
      demo_url: 'https://t.me/SAVPartnerBot',
      rating: 4.9,
      sales_count: 50,
      setup_time: '2 часа',
      is_popular: 1
    });
    setIsAddingProduct(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({ ...prod });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        await fetch(`/api/admin/table/marketplace_products/row/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        });
        setSuccessMsg(`Товар «${productForm.name}» успешно обновлен в базе данных`);
      } else if (isAddingProduct) {
        await fetch(`/api/admin/table/marketplace_products/row`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        });
        setSuccessMsg(`Товар «${productForm.name}» успешно добавлен в базу данных`);
      }
      setEditingProduct(null);
      setIsAddingProduct(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Не удалось сохранить товар в базе данных');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingleProduct = (prod: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление товара из базы данных',
      message: `Удалить товар «${prod.name}» (ID: ${prod.id}) из каталога маркетплейса?`,
      confirmText: 'Удалить',
      onConfirm: async () => {
        setLoading(true);
        try {
          await fetch(`/api/admin/table/marketplace_products/row/${prod.id}`, {
            method: 'DELETE'
          });
          setSuccessMsg(`Товар «${prod.name}» удален из базы данных`);
          await fetchData();
        } catch (err: any) {
          setErrorMsg('Не удалось удалить товар');
        } finally {
          setLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <SystemAdminLayout activeTab="marketplace">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-6 md:p-8 rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-400/40 backdrop-blur-md bg-black/40 text-amber-300 text-xs font-semibold mb-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              Каталог и товары маркетплейса
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
              Управление витриной и товарами
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Импорт каталога в CSV формате, пакетная синхронизация, массовое удаление и откат к заводским настройкам.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetToDefault}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-xl bg-black/40 hover:border-amber-400/50 hover:bg-black/60 text-white/90 hover:text-white text-sm font-semibold transition-all shadow-md"
              title="Восстановить заводской каталог"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Откат к дефолту</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={products.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-xl bg-black/40 hover:border-amber-400/50 hover:bg-black/60 text-white/90 hover:text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Экспорт CSV</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400/80 backdrop-blur-xl bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-transparent hover:from-amber-500/40 text-white text-sm font-bold transition-all shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Создать товар</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 rounded-2xl backdrop-blur-xl bg-black/40 border border-amber-400/50 flex items-center justify-between text-white text-sm shadow-xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl backdrop-blur-xl bg-black/40 border border-white/30 flex items-center justify-between text-white text-sm shadow-xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-white/60 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Progressive Batch Loading Progress Bar */}
        {batchProgress.active && (
          <div className="p-6 rounded-3xl backdrop-blur-3xl bg-black/70 border border-amber-400/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl border border-amber-400/40 bg-amber-400/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />
                </div>
                <div>
                  <div className="font-bold text-white text-base flex items-center gap-2">
                    <span>Пакетная синхронизация каталога</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      Пакет {batchProgress.currentBatch} из {batchProgress.totalBatches}
                    </span>
                  </div>
                  <p className="text-white/70 text-xs mt-0.5">{batchProgress.statusText}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                  {batchProgress.percent}%
                </div>
                <div className="text-xs text-white/60 font-mono">
                  {batchProgress.processedItems} / {batchProgress.totalItems} товаров
                </div>
              </div>
            </div>

            {/* Multi-layered Glass Progress Bar */}
            <div className="w-full h-3.5 rounded-full bg-black/60 border border-white/20 overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 shadow-md"
                style={{ width: `${batchProgress.percent}%` }}
              />
            </div>

            {/* Real-time Sub-metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl backdrop-blur-md bg-black/40 border border-white/10 text-center">
                <div className="text-xs text-white/60">Текущий пакет</div>
                <div className="font-mono text-sm font-bold text-white">
                  {batchProgress.currentBatch} / {batchProgress.totalBatches}
                </div>
              </div>
              <div className="p-2.5 rounded-xl backdrop-blur-md bg-black/40 border border-white/10 text-center">
                <div className="text-xs text-white/60">Обработано позиций</div>
                <div className="font-mono text-sm font-bold text-amber-300">
                  {batchProgress.processedItems}
                </div>
              </div>
              <div className="p-2.5 rounded-xl backdrop-blur-md bg-black/40 border border-white/10 text-center">
                <div className="text-xs text-white/60">Всего в очереди</div>
                <div className="font-mono text-sm font-bold text-white">
                  {batchProgress.totalItems}
                </div>
              </div>
              <div className="p-2.5 rounded-xl backdrop-blur-md bg-black/40 border border-white/10 text-center">
                <div className="text-xs text-white/60">Общий прогресс</div>
                <div className="font-mono text-sm font-bold text-amber-300">
                  {batchProgress.percent}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          {[
            { id: 'products', label: `Товары в базе (${products.length})`, icon: ShoppingBag },
            { id: 'import', label: 'Импорт / Экспорт CSV', icon: FileSpreadsheet },
            { id: 'categories', label: `Категории (${categories.length})`, icon: Layers },
            { id: 'leads', label: `Заявки клиентов (${leads.length})`, icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isSel
                    ? 'border border-amber-400/50 bg-black/60 text-amber-300 shadow-md'
                    : 'border border-transparent text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 text-amber-300" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Filter and Bulk Actions Bar */}
            <div className="p-4 rounded-2xl backdrop-blur-xl bg-black/30 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по названию, артикулу, категории..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl backdrop-blur-xl bg-black/40 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/50"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category dropdown */}
                <div className="w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl backdrop-blur-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-400/50 cursor-pointer"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c} className="bg-black text-white">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedProductIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <span className="text-xs text-white/70">
                      Выбрано: <strong className="text-amber-300">{selectedProductIds.length}</strong>
                    </span>
                    <button
                      onClick={handleBulkDeleteSelected}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/30 backdrop-blur-xl bg-black/40 hover:bg-black/60 text-white text-xs font-semibold transition-all shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Удалить выбранные</span>
                    </button>
                    <button
                      onClick={handleClearSelection}
                      className="px-2.5 py-2 text-xs text-white/60 hover:text-white transition-colors"
                    >
                      Снять
                    </button>
                  </div>
                )}

                <button
                  onClick={handleDeleteAllProducts}
                  disabled={products.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-white/30 text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
                  title="Очистить все товары"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/40" />
                  <span>Очистить каталог</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="rounded-2xl backdrop-blur-xl bg-black/30 border border-white/15 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="backdrop-blur-xl bg-black/60 sticky top-0 border-b border-white/10 z-10">
                    <tr>
                      <th className="p-3.5 w-12 text-center">
                        <button
                          onClick={handleToggleSelectAll}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          {filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(String(p.id || p.tilda_uid))) ? (
                            <CheckSquare className="w-4 h-4 text-amber-300" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Действия</th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Фото</th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Название и артикул</th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Категория</th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Цена (от)</th>
                      <th className="p-3.5 text-white font-semibold text-xs uppercase tracking-wider">Рейтинг / Продажи</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map((p) => {
                      const prodId = String(p.id || p.tilda_uid);
                      const isSelected = selectedProductIds.includes(prodId);

                      return (
                        <tr
                          key={prodId}
                          className={`hover:bg-white/[0.04] transition-colors ${
                            isSelected ? 'bg-amber-400/[0.05]' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleToggleSelectProduct(prodId)}
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-300" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-lg border border-white/15 bg-black/30 hover:border-amber-400/40 text-white/80 hover:text-white"
                                title="Редактировать товар"
                              >
                                <Edit2 className="w-4 h-4 text-amber-300" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleProduct(p)}
                                className="p-1.5 rounded-lg border border-white/15 bg-black/30 hover:border-amber-400/40 text-white/80 hover:text-white"
                                title="Удалить товар"
                              >
                                <Trash2 className="w-4 h-4 text-amber-300" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <img
                              src={p.image_url || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png'}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-white/15 backdrop-blur-md bg-black/40"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white text-sm">{p.name}</div>
                            <div className="text-white/50 text-xs font-mono">{p.sku || p.id}</div>
                          </td>
                          <td className="p-3.5 text-white/80 text-sm">
                            <span className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/30 text-xs">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap font-mono text-amber-300 text-sm font-semibold">
                            {Number(p.price || 0).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="p-3.5 text-white/70 text-xs font-mono">
                            ★ {p.rating || 4.9} ({p.sales_count || 0} покупок)
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-white/50 text-sm">
                          Товары не найдены. Вы можете загрузить каталог через вкладку «Импорт / Экспорт CSV» или нажать «Откат к дефолту».
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. IMPORT / EXPORT CSV TAB */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Card: Google Sheets Live Sync with Progressive Batching */}
            <div className="p-6 rounded-2xl backdrop-blur-2xl bg-black/30 border border-amber-400/30 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                    Пакетная синхронизация из Google Таблицы каталога
                  </h3>
                  <p className="text-white/70 text-sm mt-1">
                    Автоматическая группировка строк (1 продукт + 5 тарифов = 1 карточка). При загрузке 1200 строк таблицы прогресс отображается поэтапно по пакетам.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  Google Sheets Batch Sync
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <input
                  type="text"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                  className="flex-1 p-3.5 rounded-xl backdrop-blur-xl bg-black/50 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/60"
                />
                <button
                  onClick={handleImportFromGoogleSheet}
                  disabled={isSheetImporting || !googleSheetUrl.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-amber-400/50 backdrop-blur-xl bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-transparent hover:from-amber-500/40 text-white text-sm font-semibold transition-all shadow-lg hover:shadow-amber-500/10 disabled:opacity-50"
                >
                  {isSheetImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Пакетный импорт каталога...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-amber-300" />
                      <span>Запустить пакетную загрузку</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card: CSV File Import Tool */}
            <div className="p-6 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent mb-1">
                  Импорт каталога продуктов из CSV файла
                </h3>
                <p className="text-white/70 text-sm">
                  Загрузите CSV файл из Tilda, Excel или другой системы для обновления ассортимента маркетплейса в базе данных.
                </p>
              </div>

              {/* Drag & Drop File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/50 backdrop-blur-xl bg-black/30 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-black/40 group text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .txt, text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="p-3.5 rounded-2xl backdrop-blur-md bg-amber-400/10 border border-amber-400/30 text-amber-300 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-white font-semibold text-sm">
                  Нажмите для выбора CSV файла или перетащите его сюда
                </div>
                <div className="text-white/50 text-xs max-w-md">
                  Поддерживаются форматы кодировки UTF-8, разделители запятая и точка с запятой, многострочные описания и табы.
                </div>
              </div>

              {/* Or Paste CSV Raw Text */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/80">
                    Либо вставьте содержимое CSV текста напрямую:
                  </label>
                  {csvText && (
                    <button
                      onClick={() => {
                        setCsvText('');
                        setParsedPreview(null);
                      }}
                      className="text-white/50 hover:text-white text-xs transition-colors"
                    >
                      Очистить текст
                    </button>
                  )}
                </div>
                <textarea
                  rows={5}
                  placeholder="Tilda UID;Parent UID;Brand;SKU;Category;Title;Description;Price;Photo..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full p-3.5 rounded-xl backdrop-blur-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-amber-400/50 scrollbar-thin"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleParseCsvText}
                    disabled={!csvText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/40 backdrop-blur-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent hover:from-amber-500/30 text-white text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span>Распознать и проверить CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadSampleTemplate}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-white/30 text-white/80 hover:text-white text-xs font-medium transition-all"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Скачать образец CSV шаблона</span>
                  </button>
                </div>
              </div>

              {/* Parsed Preview Section */}
              {parsedPreview && parsedPreview.length > 0 && (
                <div className="p-5 rounded-2xl backdrop-blur-xl bg-black/40 border border-amber-400/40 space-y-4 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/10">
                    <div>
                      <h4 className="text-base font-bold text-white">Предварительный просмотр импорта</h4>
                      <p className="text-white/70 text-xs mt-0.5">
                        Найдено <span className="text-amber-300 font-mono font-bold">{parsedPreview.length}</span> товаров, готовых к пакетной записи
                      </p>
                    </div>

                    {/* Mode selector */}
                    <div className="flex items-center gap-2 p-1 rounded-xl bg-black/50 border border-white/15">
                      <button
                        onClick={() => setImportMode('replace')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          importMode === 'replace'
                            ? 'border border-amber-400/40 bg-amber-400/20 text-amber-300'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Полная замена каталога
                      </button>
                      <button
                        onClick={() => setImportMode('merge')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          importMode === 'merge'
                            ? 'border border-amber-400/40 bg-amber-400/20 text-amber-300'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Объединение (добавить новые)
                      </button>
                    </div>
                  </div>

                  {/* Mini Preview Table */}
                  <div className="overflow-x-auto max-h-60 border border-white/10 rounded-xl scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="backdrop-blur-xl bg-black/60 sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="p-2.5 text-white font-semibold">Фото</th>
                          <th className="p-2.5 text-white font-semibold">Название</th>
                          <th className="p-2.5 text-white font-semibold">Категория</th>
                          <th className="p-2.5 text-white font-semibold">Артикул</th>
                          <th className="p-2.5 text-white font-semibold">Цена</th>
                          <th className="p-2.5 text-white font-semibold">Тарифов</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedPreview.slice(0, 10).map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-white/[0.03]">
                            <td className="p-2.5">
                              <img
                                src={item.imageUrl || 'https://placehold.co/50x50'}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded object-cover border border-white/15"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-white">{item.name}</td>
                            <td className="p-2.5 text-white/80">{item.category}</td>
                            <td className="p-2.5 font-mono text-white/50">{item.sku || '—'}</td>
                            <td className="p-2.5 font-mono text-amber-300 font-semibold">{item.price} ₽</td>
                            <td className="p-2.5 font-mono text-white/70">{item.variants?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedPreview.length > 10 && (
                    <p className="text-xs text-white/50 text-center">
                      ...и еще {parsedPreview.length - 10} товаров
                    </p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleApplyCsvImport}
                      disabled={isImporting}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-400 backdrop-blur-xl bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-transparent hover:from-amber-500/40 text-white font-bold text-sm shadow-xl hover:shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                          <span>Импортируем пакетами...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-amber-300" />
                          <span>Записать {parsedPreview.length} товаров в базу данных</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="rounded-2xl backdrop-blur-xl bg-black/30 border border-white/15 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Категории маркетплейса</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((c: any) => (
                <div key={c.id} className="p-4 rounded-xl backdrop-blur-md bg-black/40 border border-white/15 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">{c.name}</div>
                    <div className="text-xs text-white/50">{c.slug || c.id}</div>
                  </div>
                  <span className="px-2 py-1 rounded-md border border-amber-400/30 text-amber-300 text-xs font-mono">
                    {c.item_count || 0} товаров
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="rounded-2xl backdrop-blur-xl bg-black/30 border border-white/15 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="backdrop-blur-xl bg-black/60 border-b border-white/10">
                  <tr>
                    <th className="p-3.5 text-white font-semibold text-xs">Дата</th>
                    <th className="p-3.5 text-white font-semibold text-xs">Клиент</th>
                    <th className="p-3.5 text-white font-semibold text-xs">Контакт</th>
                    <th className="p-3.5 text-white font-semibold text-xs">Товар / Тариф</th>
                    <th className="p-3.5 text-white font-semibold text-xs">Сумма</th>
                    <th className="p-3.5 text-white font-semibold text-xs">Комментарий</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-white/[0.03]">
                      <td className="p-3.5 text-white/60 font-mono text-xs whitespace-nowrap">{l.created_at || 'Недавно'}</td>
                      <td className="p-3.5 font-semibold text-white text-sm">{l.customer_name || 'Гость'}</td>
                      <td className="p-3.5 font-mono text-amber-300 text-sm">{l.contact}</td>
                      <td className="p-3.5 text-white text-sm">
                        <div>{l.item_name || 'ИИ Решение'}</div>
                        <div className="text-xs text-white/50">{l.variant_name}</div>
                      </td>
                      <td className="p-3.5 font-mono text-white text-sm font-semibold">
                        {Number(l.price || 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="p-3.5 text-white/70 text-xs max-w-xs truncate">{l.comment || '—'}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/50 text-sm">
                        Заявок на подключение пока нет.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Add / Edit Modal */}
        {(isAddingProduct || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
            <div
              onClick={() => {
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}
              className="fixed inset-0 bg-transparent"
            />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-2xl rounded-3xl backdrop-blur-3xl bg-black/90 border border-amber-400/40 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                  {editingProduct ? 'Редактирование товара' : 'Создание нового товара'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="text-white/60 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Название товара *</label>
                    <input
                      type="text"
                      required
                      value={productForm.name || ''}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Категория *</label>
                    <input
                      type="text"
                      required
                      value={productForm.category || ''}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Артикул / SKU</label>
                    <input
                      type="text"
                      value={productForm.sku || ''}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Стоимость (от) ₽</label>
                    <input
                      type="number"
                      value={productForm.price || 0}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/80 mb-1">Ссылка на фото (URL)</label>
                    <input
                      type="url"
                      value={productForm.image_url || ''}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/80 mb-1">Краткое описание</label>
                    <textarea
                      rows={2}
                      value={productForm.short_description || ''}
                      onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/80 mb-1">Полное описание и функционал</label>
                    <textarea
                      rows={4}
                      value={productForm.full_description || ''}
                      onChange={(e) => setProductForm({ ...productForm, full_description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:text-white text-sm font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl border border-amber-400 text-white font-semibold text-sm backdrop-blur-md bg-gradient-to-r from-amber-500/30 to-transparent"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none">
            <div
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-transparent"
            />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md rounded-3xl backdrop-blur-3xl bg-black/90 border border-amber-400/40 p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4"
            >
              <h4 className="text-lg font-bold text-white">{confirmModal.title}</h4>
              <p className="text-white/80 text-sm">{confirmModal.message}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-5 py-2 rounded-xl border border-amber-400 text-white font-bold text-sm backdrop-blur-md bg-gradient-to-r from-amber-500/30 to-transparent hover:from-amber-500/50"
                >
                  {confirmModal.confirmText || 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SystemAdminLayout>
  );
};

export default AdminMarketPage;
