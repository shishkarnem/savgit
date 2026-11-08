import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystemAdminStore } from '@/store/useSystemAdminStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MarketplaceItem } from '@/types';
import { INITIAL_MARKETPLACE_ITEMS, parseCsvContent, parseYmlContent } from '@/data/marketplaceData';
import Header from '@/components/Header';
import DevModeToggle from '@/components/DevModeToggle';
import Rivets from '@/components/Rivets';
import { SystemAdminProxySection } from '@/components/admin/SystemAdminProxySection';
import { CronScheduleManager } from '@/components/admin/CronScheduleManager';
import {
  Database,
  Cpu,
  Clock,
  Shield,
  Terminal,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Code,
  Upload,
  ShoppingBag,
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Key,
  Eye,
  FileDown,
  Globe
} from 'lucide-react';

export const SystemAdminPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    tables,
    selectedTable,
    currentTableRows,
    currentTableColumns,
    triggers,
    crons,
    auditLogs,
    loading,
    error,
    successMessage,
    fetchTables,
    selectTable,
    fetchTriggers,
    fetchCrons,
    fetchAuditLogs,
    deleteRow,
    updateRow,
    addRow,
    showConfirmModal,
    clearMessages,
  } = useSystemAdminStore();

  const [activeTab, setActiveTab] = useState<'tables' | 'triggers' | 'crons' | 'audit' | 'sql' | 'marketplace' | 'migration' | 'proxy'>('tables');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  
  // BD ProTalk Backup and Export State
  const [proTalkTablesStatus, setProTalkTablesStatus] = useState<Record<string, { count: number; status: string }>>({});
  const [inspectingTables, setInspectingTables] = useState(false);
  const [dumpingTables, setDumpingTables] = useState(false);

  const handleInspectProTalkTables = async () => {
    setInspectingTables(true);
    setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔍 Сканирование и инспекция таблиц BD ProTalk (PostgreSQL)...`]);
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.tables) {
        const stats: Record<string, { count: number; status: string }> = {};
        for (const t of data.tables) {
          stats[t.name] = { count: t.rowCount || 0, status: 'available' };
        }
        setProTalkTablesStatus(stats);
        setMigrationLog(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Проверка завершена! Обнаружено ${data.tables.length} активных таблиц BD ProTalk.`
        ]);
      } else {
        setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Не удалось загрузить список таблиц.`]);
      }
    } catch (err: any) {
      setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Ошибка соединения: ${err.message}`]);
    } finally {
      setInspectingTables(false);
    }
  };

  const handleDownloadProTalkDump = async () => {
    setDumpingTables(true);
    setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📦 Генерация полного JSON-дампа всех таблиц BD ProTalk...`]);
    try {
      const res = await fetch('/api/admin/export/all/json');
      const data = await res.json();
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `protalk_database_dump_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        setMigrationLog(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🚀 Полный дамп базы BD ProTalk успешно сформирован и сохранен на устройство!`,
          `[${new Date().toLocaleTimeString()}] Файл сохранен: protalk_database_dump_${new Date().toISOString().slice(0, 10)}.json`
        ]);
      }
    } catch (err: any) {
      setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Ошибка выгрузки дампа: ${err.message}`]);
    } finally {
      setDumpingTables(false);
    }
  };

  const handleCreateServerBackup = async () => {
    setMigrationLoading(true);
    setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Фиксация и создание резервной копии базы данных на сервере...`]);
    try {
      const res = await fetch('/api/admin/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setMigrationResult(data);
      if (data.success) {
        setMigrationLog(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Резервная копия базы BD ProTalk успешно зафиксирована на сервере!`
        ]);
      } else {
        setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Ошибка создания копии: ${data.error}`]);
      }
    } catch (err: any) {
      setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Ошибка запроса: ${err.message}`]);
    } finally {
      setMigrationLoading(false);
    }
  };
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, any>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [customSql, setCustomSql] = useState('SELECT * FROM users LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Marketplace Admin DB Management State
  const [adminCsvText, setAdminCsvText] = useState('');
  const [adminImportType, setAdminImportType] = useState<'csv' | 'yml'>('csv');
  const [adminParsedItems, setAdminParsedItems] = useState<MarketplaceItem[]>([]);
  const [adminMarketplaceItems, setAdminMarketplaceItems] = useState<MarketplaceItem[]>(() => {
    try {
      const saved = localStorage.getItem('sav_marketplace_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed loading marketplace items in admin', e);
    }
    return INITIAL_MARKETPLACE_ITEMS;
  });
  const [adminStatusMsg, setAdminStatusMsg] = useState('');

  const handleParseAdminInput = () => {
    if (!adminCsvText.trim()) {
      setAdminStatusMsg('Вставьте текст CSV или YML файла для парсинга');
      return;
    }
    let parsed: MarketplaceItem[] = [];
    if (adminImportType === 'csv') {
      parsed = parseCsvContent(adminCsvText);
    } else {
      parsed = parseYmlContent(adminCsvText);
    }
    setAdminParsedItems(parsed);
    setAdminStatusMsg(`Успешно распознано: ${parsed.length} главных позиций (товаров)`);
  };

  const handleExportMarketplaceCsv = () => {
    if (adminMarketplaceItems.length === 0) {
      setAdminStatusMsg('Каталог пуст, нечего экспортировать');
      return;
    }

    const headers = ['id', 'title', 'category', 'price', 'old_price', 'rating', 'reviews_count', 'badge', 'delivery_type', 'description', 'features'];
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];
    for (const item of adminMarketplaceItems) {
      const featuresStr = Array.isArray(item.features) ? item.features.join('; ') : '';
      const row = [
        escapeCsv(item.id || item.tildaUid),
        escapeCsv(item.name),
        escapeCsv(item.category),
        escapeCsv(item.price),
        escapeCsv(item.oldPrice || ''),
        escapeCsv(item.rating || 5.0),
        escapeCsv(item.reviewsCount || item.reviews || 0),
        escapeCsv(item.badge || ''),
        escapeCsv(item.deliveryType || 'Мгновенная доставка'),
        escapeCsv(item.description || item.shortDescription || ''),
        escapeCsv(featuresStr)
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketplace_products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setAdminStatusMsg(`Файл marketplace_products.csv успешно выгружен (${adminMarketplaceItems.length} позиций)!`);
  };

  const handleSaveToMarketplaceDb = async (replace: boolean = false) => {
    if (adminParsedItems.length === 0) return;
    let newCatalog: MarketplaceItem[] = [];
    if (replace) {
      newCatalog = adminParsedItems;
    } else {
      const existingIds = new Set(adminMarketplaceItems.map(i => i.id));
      const fresh = adminParsedItems.filter(i => !existingIds.has(i.id));
      newCatalog = [...fresh, ...adminMarketplaceItems];
    }
    setAdminMarketplaceItems(newCatalog);
    try {
      localStorage.setItem('sav_marketplace_items', JSON.stringify(newCatalog));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }

    // Also persist to BD ProTalk backend database
    try {
      await fetch('/api/v1/marketplace/products/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: newCatalog.map(item => ({
            id: item.id || item.tildaUid,
            title: item.name,
            category: item.category,
            price: item.price,
            old_price: item.oldPrice,
            rating: item.rating || 5.0,
            reviews_count: item.reviewsCount || item.reviews || 0,
            badge: item.badge,
            delivery_type: item.deliveryType,
            description: item.description || item.shortDescription,
            features: item.features,
            image: item.image,
            images: item.images,
            is_featured: item.isFeatured ? 1 : 0
          })),
          replace: true
        })
      });
    } catch (dbErr) {
      console.warn('[Marketplace DB Save Warning]', dbErr);
    }

    setAdminStatusMsg(`Сохранено в базу данных сервера и локальное хранилище! Всего позиций: ${newCatalog.length}`);
    setAdminParsedItems([]);
    setAdminCsvText('');
  };

  const handleResetAdminMarketplace = () => {
    showConfirmModal({
      title: 'Сбросить каталог маркетплейса к дефолту?',
      message: 'Все загруженные через CSV позиции будут удалены. Страница /marketplace восстановит исходные проверенные карточки SAV AI.',
      confirmText: 'Да, сбросить к дефолту',
      danger: true,
      onConfirm: async () => {
        try {
          localStorage.removeItem('sav_marketplace_items');
        } catch (e) {
          console.error(e);
        }
        setAdminMarketplaceItems(INITIAL_MARKETPLACE_ITEMS);
        setAdminParsedItems([]);
        setAdminStatusMsg('Каталог успешно сброшен к исходному дефолтному состоянию!');
      }
    });
  };

  useEffect(() => {
    fetchTables();
    fetchTriggers();
    fetchCrons();
    fetchAuditLogs();
  }, []);

  const handleRefresh = () => {
    fetchTables();
    if (selectedTable) selectTable(selectedTable);
    fetchTriggers();
    fetchCrons();
    fetchAuditLogs();
  };

  const handleStartEdit = (row: any) => {
    const pkCol = currentTableColumns.find((c: any) => c.pk === 1)?.name || 'id';
    setEditingRowId(String(row[pkCol]));
    setEditingRowData({ ...row });
  };

  const handleSaveEdit = async () => {
    if (!selectedTable || !editingRowId) return;
    await updateRow(selectedTable, editingRowId, editingRowData);
    setEditingRowId(null);
  };

  const handleDeleteClick = (row: any) => {
    if (!selectedTable) return;
    const pkCol = currentTableColumns.find((c: any) => c.pk === 1)?.name || 'id';
    const rowId = String(row[pkCol]);

    showConfirmModal({
      title: `Удалить запись из таблицы ${selectedTable}?`,
      message: `Вы уверены, что хотите удалить запись с ID: "${rowId}"? Это действие выполнит запрос в BD ProTalk и сработает триггер аудита.`,
      confirmText: 'Да, удалить запись',
      danger: true,
      onConfirm: async () => {
        await deleteRow(selectedTable, rowId);
      },
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    await addRow(selectedTable, newRowData);
    setIsAddModalOpen(false);
    setNewRowData({});
  };

  const handleExecuteSql = async () => {
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: customSql }),
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (err: any) {
      setSqlResult({ success: false, error: err.message });
    }
  };

  const filteredRows = currentTableRows.filter((row) => {
    if (!searchQuery) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8 relative">
      <DevModeToggle />
      <Header onLogoClick={() => navigate('/')} />
      <ConfirmModal />

      <main className="w-full max-w-7xl flex-grow space-y-6 mt-2">
        {/* Top Header Card (Apple Liquid Glass) */}
        <div className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl transition-all">
          <Rivets />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-primary/40 text-primary shadow-sm">
                <Database size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Панель управления базой данных и системой
                  </h1>
                  <span className="text-xs font-semibold backdrop-blur-md bg-primary/15 text-primary border border-primary/30 px-3 py-0.5 rounded-full">
                    PostgreSQL BD ProTalk
                  </span>
                </div>
                <p className="text-sm md:text-base text-slate-300 mt-1 font-normal">
                  Мониторинг таблиц BD ProTalk, управление записями, аудит триггеров и импорт каталога товаров
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-200 hover:text-white text-sm font-semibold transition-all shadow-sm"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-primary'} />
                Обновить данные
              </button>
            </div>
          </div>
        </div>

        {/* Alerts / Feedback */}
        {error && (
          <div className="p-4 backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl text-red-200 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-200 p-1">
              <X size={18} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 backdrop-blur-xl bg-primary/10 border border-primary/30 rounded-2xl text-primary text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary shrink-0" />
              <span className="text-white">{successMessage}</span>
            </div>
            <button onClick={clearMessages} className="text-primary hover:text-white p-1">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Tabs Navigation (Apple Liquid Glass) */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'tables'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Layers size={18} />
            Таблицы BD ProTalk ({tables.length})
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'marketplace'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <ShoppingBag size={18} />
            Каталог маркетплейса в БД ({adminMarketplaceItems.length})
          </button>

          <button
            onClick={() => setActiveTab('triggers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'triggers'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Zap size={18} />
            Триггеры БД ({triggers.length})
          </button>

          <button
            onClick={() => setActiveTab('crons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'crons'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Clock size={18} />
            Фоновые задачи ({crons.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'audit'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Shield size={18} />
            Логи аудита ({auditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'sql'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Terminal size={18} />
            SQL консоль
          </button>

          <button
            onClick={() => setActiveTab('proxy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'proxy'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 border border-amber-400 font-extrabold'
                : 'backdrop-blur-md bg-amber-500/10 text-amber-300 hover:text-white hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Globe size={18} className="text-amber-400" />
            Telegram Прокси и Бэкап 06:00
          </button>

          <button
            onClick={() => setActiveTab('migration')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'migration'
                ? 'bg-primary text-black shadow-md shadow-primary/20 border border-primary font-extrabold'
                : 'backdrop-blur-md bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Database size={18} className="text-primary" />
            Экспорт и бэкап BD ProTalk
          </button>
        </div>

        {/* TAB 1: BD ProTalk Tables Browser & Data Editor */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tables Sidebar */}
            <div className="lg:col-span-1 rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-5 h-fit shadow-xl space-y-3">
              <h2 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2">
                <Database size={16} className="text-primary" /> Таблицы базы данных
              </h2>
              <div className="space-y-1.5">
                {tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => selectTable(t.name)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      selectedTable === t.name
                        ? 'backdrop-blur-md bg-primary/15 border border-primary/40 text-primary shadow-sm'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="font-mono text-sm">{t.name}</span>
                    <span className="text-xs backdrop-blur-md bg-white/[0.06] border border-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      {t.rowCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content & Row Management */}
            <div className="lg:col-span-3 rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 shadow-xl space-y-5">
              {selectedTable ? (
                <div>
                  {/* Table Header Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                        {selectedTable}
                        <span className="text-xs text-primary font-sans font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md bg-primary/10 border border-primary/30">
                          {currentTableRows.length} записей
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Колонки: {currentTableColumns.map((c: any) => c.name).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Поиск по строкам..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-2 text-sm backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-primary/60"
                        />
                      </div>

                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-black text-sm font-bold rounded-xl transition-all shadow-md shadow-primary/20 hover:bg-primary/90"
                      >
                        <Plus size={16} /> Добавить запись
                      </button>
                    </div>
                  </div>

                  {/* Rows Data Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/10 mt-4">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="backdrop-blur-md bg-white/[0.04] border-b border-white/10 text-slate-300 font-mono text-xs">
                          {currentTableColumns.map((col: any) => (
                            <th key={col.name} className="p-3.5 font-semibold">
                              {col.name}{' '}
                              {col.pk === 1 && <span className="text-primary text-[10px]">[PK]</span>}
                            </th>
                          ))}
                          <th className="p-3.5 font-semibold text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 font-mono text-xs">
                        {filteredRows.map((row, idx) => {
                          const pkCol = currentTableColumns.find((c: any) => c.pk === 1)?.name || 'id';
                          const rowId = String(row[pkCol]);
                          const isEditing = editingRowId === rowId;

                          return (
                            <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                              {currentTableColumns.map((col: any) => (
                                <td key={col.name} className="p-3.5 text-slate-200 max-w-[220px] truncate">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRowData[col.name] ?? ''}
                                      onChange={(e) =>
                                        setEditingRowData({ ...editingRowData, [col.name]: e.target.value })
                                      }
                                      disabled={col.pk === 1}
                                      className="w-full backdrop-blur-md bg-white/[0.06] border border-primary/60 rounded px-2.5 py-1 text-white text-xs focus:outline-none disabled:opacity-50"
                                    />
                                  ) : (
                                    String(row[col.name] ?? 'NULL')
                                  )}
                                </td>
                              ))}
                              <td className="p-3.5 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="p-1.5 bg-primary text-black rounded-lg transition-all hover:bg-primary/90"
                                      title="Сохранить"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingRowId(null)}
                                      className="p-1.5 backdrop-blur-md bg-white/[0.05] hover:bg-white/[0.15] text-slate-300 rounded-lg transition-all"
                                      title="Отмена"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleStartEdit(row)}
                                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-white/[0.05] rounded-lg transition-all"
                                      title="Редактировать"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(row)}
                                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                      title="Удалить"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={currentTableColumns.length + 1} className="p-8 text-center text-slate-400 font-sans text-sm">
                              Записи не найдены
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 font-sans text-sm">
                  Выберите таблицу из списка для просмотра и редактирования записей
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Marketplace CSV/YML Database Admin */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="text-primary" size={22} /> Управление каталогом и импорт в базу данных
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 font-normal">
                    Загружайте выгрузки товаров Tilda (CSV) или YML XML прямо в базу данных. Система автоматически группирует модификации по Tilda UID и распарсивает вкладки (Тарифы, Описание, Опции).
                  </p>
                </div>

                <button
                  onClick={handleResetAdminMarketplace}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-sm font-semibold transition-all"
                >
                  <RefreshCw size={15} /> Сбросить каталог к дефолту
                </button>
              </div>

              {adminStatusMsg && (
                <div className="p-4 backdrop-blur-xl bg-primary/10 border border-primary/30 rounded-2xl text-primary text-sm flex items-center justify-between">
                  <span className="text-white">{adminStatusMsg}</span>
                  <button onClick={() => setAdminStatusMsg('')} className="text-primary hover:text-white p-1">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input Form */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-xl p-1 text-sm">
                    <button
                      onClick={() => setAdminImportType('csv')}
                      className={`px-3.5 py-1.5 rounded-lg font-bold text-sm transition-all ${
                        adminImportType === 'csv'
                          ? 'bg-primary text-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Tilda CSV (С вариантами & Tab)
                    </button>
                    <button
                      onClick={() => setAdminImportType('yml')}
                      className={`px-3.5 py-1.5 rounded-lg font-bold text-sm transition-all ${
                        adminImportType === 'yml'
                          ? 'bg-primary text-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      YML (Yandex Market XML)
                    </button>
                  </div>

                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-sm font-semibold transition-all">
                    <Upload size={16} className="text-primary" /> Выбрать файл с диска
                    <input
                      type="file"
                      accept=".csv,.xml,.yml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (content) {
                            setAdminCsvText(content);
                            if (file.name.endsWith('.xml') || file.name.endsWith('.yml')) {
                              setAdminImportType('yml');
                            } else {
                              setAdminImportType('csv');
                            }
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>

                <textarea
                  rows={6}
                  value={adminCsvText}
                  onChange={(e) => setAdminCsvText(e.target.value)}
                  placeholder={
                    adminImportType === 'csv'
                      ? 'Вставьте CSV текст от Tilda... (заголовки: Tilda UID, Parent UID, Title, Price, Tab:Тарифы, Tab:Описание, Tab:Опции, Modifications и т.д.)'
                      : 'Вставьте YML XML структуру...'
                  }
                  className="w-full p-4 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10 text-primary font-mono text-sm focus:outline-none focus:border-primary/60"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleParseAdminInput}
                    className="px-5 py-2.5 bg-primary text-black text-sm font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} /> Проверить и распарсить
                  </button>

                  {adminParsedItems.length > 0 && (
                    <>
                      <button
                        onClick={() => handleSaveToMarketplaceDb(false)}
                        className="px-5 py-2.5 rounded-xl backdrop-blur-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-sm font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <Check size={16} /> Добавить {adminParsedItems.length} позиций в БД
                      </button>
                      <button
                        onClick={() => handleSaveToMarketplaceDb(true)}
                        className="px-5 py-2.5 rounded-xl backdrop-blur-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-sm font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <Layers size={16} /> Заменить весь каталог этими {adminParsedItems.length} позициями
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Parsed Preview Section */}
            {adminParsedItems.length > 0 && (
              <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="text-primary" size={20} /> Результат распознавания ({adminParsedItems.length} товаров)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                  {adminParsedItems.map((item, index) => (
                    <div key={item.id + index} className="p-4 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-primary font-mono font-semibold">
                            {item.tildaUid ? `UID: ${item.tildaUid}` : `SKU: ${item.sku || item.id}`}
                          </span>
                          <h4 className="font-bold text-base text-white">{item.name}</h4>
                        </div>
                        <span className="text-xs font-bold text-primary backdrop-blur-md bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-lg">
                          от {item.price} руб
                        </span>
                      </div>

                      <p className="text-sm text-slate-300 line-clamp-2">{item.shortDescription}</p>

                      {item.tabs && item.tabs.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-xs text-slate-400 font-semibold">Вкладки:</span>
                          {item.tabs.map((tab, idx) => (
                            <span key={idx} className="text-xs backdrop-blur-md bg-white/[0.05] border border-white/10 text-primary px-2 py-0.5 rounded font-mono">
                              {tab.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.variants && item.variants.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-xs text-primary font-bold">
                            Варианты / Тарифы ({item.variants.length}):
                          </span>
                          <div className="mt-1 space-y-1">
                            {item.variants.map((v) => (
                              <div key={v.id} className="text-xs text-slate-300 flex justify-between backdrop-blur-md bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/5">
                                <span>• {v.name}</span>
                                <span className="font-mono text-primary font-bold">{v.price} руб</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Database Active Marketplace Catalog */}
            <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="text-primary" size={20} /> Активные позиции в каталоге ({adminMarketplaceItems.length})
                  </h3>
                  <p className="text-sm text-slate-300">
                    Товары, синхронизированные с базой данных сервера и страницей /marketplace
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportMarketplaceCsv}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/[0.04] border border-primary/30 text-white text-sm font-medium hover:border-primary transition-all shadow-lg"
                    title="Скачать таблицу marketplace_products в формате CSV"
                  >
                    <FileDown size={16} className="text-primary" />
                    Экспорт товаров в CSV
                  </button>

                  <span className="text-sm backdrop-blur-md bg-white/[0.04] text-primary px-3.5 py-1.5 rounded-xl font-mono border border-primary/30">
                    {adminMarketplaceItems.length} позиций
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="backdrop-blur-md bg-white/[0.04] text-slate-300 border-b border-white/10 text-xs font-mono">
                      <th className="p-3.5">ID / Tilda UID</th>
                      <th className="p-3.5">Название</th>
                      <th className="p-3.5">Категория</th>
                      <th className="p-3.5">Цена</th>
                      <th className="p-3.5">Варианты</th>
                      <th className="p-3.5">Вкладки</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono text-xs">
                    {adminMarketplaceItems.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.04] text-slate-200">
                        <td className="p-3.5 font-mono text-primary">{item.tildaUid || item.id}</td>
                        <td className="p-3.5 font-bold text-white font-sans text-sm max-w-xs truncate">{item.name}</td>
                        <td className="p-3.5 font-sans text-sm">
                          <span className="backdrop-blur-md bg-white/[0.04] border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-lg text-xs">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-primary font-bold">{item.price} руб</td>
                        <td className="p-3.5">
                          {item.variants?.length ? (
                            <span className="backdrop-blur-md bg-primary/10 border border-primary/30 text-primary px-2.5 py-0.5 rounded-lg">
                              {item.variants.length} вариантов
                            </span>
                          ) : (
                            <span className="text-slate-400">1 модификация</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {item.tabs?.length ? (
                            <span className="backdrop-blur-md bg-white/[0.04] border border-white/10 text-primary px-2.5 py-0.5 rounded-lg">
                              {item.tabs.length} вкладок
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BD ProTalk Triggers Inspector */}
        {activeTab === 'triggers' && (
          <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="text-primary" size={22} /> Активные триггеры BD ProTalk
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Триггеры базы данных автоматически выполняют логику (аудит изменений, обновление метаданных) прямо внутри движка BD ProTalk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triggers.map((trig) => (
                <div key={trig.name} className="p-5 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{trig.name}</span>
                    <span className="text-xs font-mono backdrop-blur-md bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full">
                      Таблица: {trig.tableName}
                    </span>
                  </div>
                  <pre className="p-4 backdrop-blur-md bg-black/30 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap border border-white/10">
                    {trig.sql}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Node.js Cron Tasks Registry */}
        {activeTab === 'crons' && (
          <CronScheduleManager />
        )}

        {/* TAB 5: Audit Logs Stream */}
        {activeTab === 'audit' && (
          <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="text-primary" size={22} /> Логи аудита (сгенерированы триггерами BD ProTalk)
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Логи изменений данных, автоматически формируемые триггерами BD ProTalk в реальном времени.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="backdrop-blur-md bg-white/[0.04] border-b border-white/10 text-slate-300 font-mono text-xs">
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Таблица</th>
                    <th className="p-3.5">Действие</th>
                    <th className="p-3.5">Record ID</th>
                    <th className="p-3.5">Старые данные</th>
                    <th className="p-3.5">Новые данные</th>
                    <th className="p-3.5">Время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.04] text-slate-200">
                      <td className="p-3.5 text-slate-400">#{log.id}</td>
                      <td className="p-3.5 text-primary font-bold">{log.table_name}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold backdrop-blur-md ${
                          log.action === 'DELETE' ? 'bg-white/[0.06] text-white border border-white/20' :
                          log.action === 'INSERT' ? 'bg-primary/10 text-primary border border-primary/30' :
                          'bg-white/[0.04] text-slate-200 border border-white/10'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-white">{log.record_id}</td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate">{log.old_data || '-'}</td>
                      <td className="p-3.5 text-slate-200 max-w-xs truncate">{log.new_data || '-'}</td>
                      <td className="p-3.5 text-slate-400">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Custom SQL Query Console */}
        {activeTab === 'sql' && (
          <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="text-primary" size={22} /> Прямая SQL консоль
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Выполнение прямых SQL команд (SELECT, INSERT, UPDATE, DELETE) в базе данных BD ProTalk (PostgreSQL).
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                rows={4}
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                className="w-full p-4 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10 text-primary font-mono text-sm focus:outline-none focus:border-primary/60"
                placeholder="Введите SQL запрос..."
              />

              <button
                onClick={handleExecuteSql}
                className="px-6 py-2.5 bg-primary text-black text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                Выполнить SQL запрос
              </button>

              {sqlResult && (
                <div className="p-4 rounded-2xl backdrop-blur-md bg-black/30 border border-white/10 overflow-x-auto font-mono text-xs">
                  <pre className="text-slate-200">{JSON.stringify(sqlResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: BD ProTalk Database Backup, Export & Persistence Center */}
        {activeTab === 'migration' && (
          <div className="rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-primary/20 p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Database className="text-primary" size={24} /> Центр экспорта и резервного копирования BD ProTalk
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Полная фиксация базы данных BD ProTalk на сервере, создание резервных копий и моментальная выгрузка JSON дампа всех таблиц.
                </p>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Операции с базой данных BD ProTalk
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleInspectProTalkTables}
                  disabled={inspectingTables}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20 disabled:opacity-50"
                >
                  <Eye size={16} className={inspectingTables ? 'animate-spin' : ''} />
                  {inspectingTables ? 'Проверка...' : '1. Сканировать таблицы'}
                </button>

                <button
                  onClick={handleDownloadProTalkDump}
                  disabled={dumpingTables}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <FileDown size={16} className={dumpingTables ? 'animate-spin' : ''} />
                  {dumpingTables ? 'Формирование дампа...' : '2. Скачать полный JSON дамп'}
                </button>

                <button
                  onClick={handleCreateServerBackup}
                  disabled={migrationLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition-all border border-white/20 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={migrationLoading ? 'animate-spin' : ''} />
                  {migrationLoading ? 'Фиксация на диске...' : '3. Создать бэкап на сервере'}
                </button>
              </div>
            </div>

            {/* BD ProTalk Core Tables Grid */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database size={16} className="text-amber-400" />
                  Таблицы базы данных BD ProTalk ({tables.length}):
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Всего таблиц: {tables.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                {tables.map((t) => (
                  <div
                    key={t.name}
                    className="p-2 rounded-xl text-xs font-mono border transition-all bg-white/[0.02] border-white/10 text-slate-300"
                  >
                    <div className="truncate font-semibold text-[11px]">{t.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                      <span>{t.rowCount} строк</span>
                      <Check size={12} className="text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Всего таблиц в BD ProTalk</div>
                <div className="text-2xl font-bold text-primary mt-1 font-mono">
                  {tables.length}
                </div>
              </div>
              <div className="p-4 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Пользователей</div>
                <div className="text-2xl font-bold text-white mt-1 font-mono">
                  {tables.find(t => t.name === 'users')?.rowCount || tables.find(t => t.name === 'sav_telegram_profiles')?.rowCount || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Всего записей в базе</div>
                <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
                  {tables.reduce((acc, t) => acc + (t.rowCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Log Window */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Журнал операций BD ProTalk</span>
                {migrationLog.length > 0 && (
                  <button onClick={() => setMigrationLog([])} className="hover:text-white transition-colors">
                    Очистить лог
                  </button>
                )}
              </div>
              <div className="h-64 p-4 rounded-2xl backdrop-blur-md bg-black/50 border border-white/10 font-mono text-xs text-slate-200 overflow-y-auto space-y-1">
                {migrationLog.length === 0 ? (
                  <div className="text-slate-500 italic">Нажмите «Скачать полный JSON дамп» или «Создать бэкап на сервере»...</div>
                ) : (
                  migrationLog.map((line, idx) => (
                    <div key={idx} className="leading-relaxed">{line}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: Telegram Bot Proxy Gateway & 06:00 MSK Daily Backup Center */}
        {activeTab === 'proxy' && <SystemAdminProxySection />}
      </main>

      {/* Add Row Modal Form (Apple Liquid Glass) */}
      {isAddModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl backdrop-blur-3xl bg-black/50 border border-white/20 p-6 md:p-8 text-white shadow-2xl">
            <Rivets />
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full backdrop-blur-md bg-white/[0.05] hover:bg-white/[0.15] border border-white/10"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              Новая запись в таблицу <span className="text-primary font-mono">{selectedTable}</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              {currentTableColumns.map((col: any) => {
                const val = newRowData[col.name] ?? '';
                const isLongText = typeof val === 'string' && (val.length > 50 || val.includes('\n') || val.includes('{') || col.name.includes('prompt') || col.name.includes('config') || col.name.includes('description') || col.name.includes('data') || col.name.includes('json'));

                return (
                  <div key={col.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-mono text-slate-300">
                        {col.name} {col.notNull && <span className="text-amber-400">*</span>}
                      </label>
                      <span className="text-[10px] text-white/40 font-mono">
                        тяните для изменения высоты
                      </span>
                    </div>
                    <textarea
                      required={col.notNull && col.name !== 'id'}
                      value={val}
                      rows={isLongText ? 4 : 2}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                      placeholder={col.defaultValue ? `По умолчанию: ${col.defaultValue}` : `Значение для ${col.name}...`}
                      className="w-full backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400/60 font-mono resize-y min-h-[46px]"
                    />
                  </div>
                );
              })}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-black bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminPage;
