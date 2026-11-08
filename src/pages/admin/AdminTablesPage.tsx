import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SystemAdminLayout } from './SystemAdminLayout';
import { useSystemAdminStore } from '@/store/useSystemAdminStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Database,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Trash2,
  Columns,
  List,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  FileUp,
  Download,
  Archive,
  Upload,
  FileCode,
  ArrowDownToLine,
  Layers,
  Loader2,
  CheckCircle2,
  Coins,
  TrendingUp,
  Sparkles,
  Calculator,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bot,
  Image as ImageIcon,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Gift,
  Send,
  UserCheck,
  Compass,
  Lock,
  Shield,
  Server,
  ExternalLink
} from 'lucide-react';

export const AdminTablesPage: React.FC = () => {
  const {
    tables,
    selectedTable,
    currentTableRows,
    currentTableColumns,
    loading,
    error,
    successMessage,
    fetchTables,
    selectTable,
    deleteRow,
    deleteRows,
    updateRow,
    addRow,
    exportTableCsv,
    importTableCsv,
    exportAllTablesZip,
    downloadFullJsonBackup,
    restoreFullJsonBackup,
    confirmModal,
    showConfirmModal,
    closeConfirmModal,
    clearMessages
  } = useSystemAdminStore();

  const [tableSearch, setTableSearch] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'rows' | 'schema'>('rows');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTable = searchParams.get('table');

  const quickSections = useMemo(() => [
    { name: 'autopilot_settings', label: 'Настройки рассылок (Автопилот 10:00-17:00)', icon: Sparkles, route: '/system-admin/autopilot?tab=settings' },
    { name: 'protalk_logs', label: 'Логи AI и расходы', icon: Sparkles },
    { name: 'sav_user_calculations', label: 'История расчетов и ТЗ', icon: Calculator },
    { name: 'contracts', label: 'Договоры и заказы', icon: FileText },
    { name: 'partners', label: 'Реферальная сеть', icon: Gift },
    { name: 'sav_client_messages', label: 'Логи рассылок', icon: Send },
    { name: 'sav_message_templates', label: 'Шаблоны рассылок', icon: FileCode },
    { name: 'sav_telegram_profiles', label: 'Telegram профили', icon: UserCheck },
    { name: 'experts', label: 'Эксперты SAV', icon: Compass },
    { name: 'crm_admins', label: 'Администраторы', icon: Lock },
    { name: 'audit_logs', label: 'Логи аудита', icon: Shield },
  ], []);

  const handleSelectTable = (name: string, route?: string) => {
    if (route) {
      navigate(route);
      return;
    }
    setSearchParams({ table: name });
    selectTable(name);
  };

  // Sync selected table from URL parameter ?table=...
  useEffect(() => {
    if (urlTable && tables.length > 0) {
      if (selectedTable !== urlTable && tables.some(t => t.name === urlTable)) {
        selectTable(urlTable);
      }
    }
  }, [urlTable, tables, selectedTable, selectTable]);

  // Sorting state (default: sort by id desc)
  const [sortColumn, setSortColumn] = useState<string | null>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Rub & Channel filter states
  const [rubFilterMode, setRubFilterMode] = useState<'all' | 'cost_only' | 'images_only' | 'text_only' | 'free_only' | 'custom'>('all');
  const [rubMin, setRubMin] = useState<string>('');
  const [rubMax, setRubMax] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Сброс выбора строк и фильтров при смене таблицы
  useEffect(() => {
    setSelectedRowIds(new Set());
    setRubFilterMode('all');
    setRubMin('');
    setRubMax('');
    setChannelFilter('all');
    setSortColumn('id');
    setSortDirection('desc');
  }, [selectedTable]);
  
  // Row Edit / Add Modal States
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [rowFormData, setRowFormData] = useState<Record<string, any>>({});

  // Add Column Modal States
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('TEXT');
  const [newColDefault, setNewColDefault] = useState('');
  const [columnActionLoading, setColumnActionLoading] = useState(false);

  // CSV Import Modal States
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // JSON Restore Modal States
  const [isRestoringJson, setIsRestoringJson] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonLoading, setJsonLoading] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // JSON Restore Progress States
  const [restoreProgressActive, setRestoreProgressActive] = useState(false);
  const [restoreProgressPercent, setRestoreProgressPercent] = useState(0);
  const [restoreCurrentStage, setRestoreCurrentStage] = useState('');
  const [restoreCurrentDetail, setRestoreCurrentDetail] = useState('');
  const [restoreStepLogs, setRestoreStepLogs] = useState<Array<{
    id: string;
    tableName: string;
    rows: number;
    status: 'pending' | 'processing' | 'done' | 'failed';
  }>>([]);
  const [restoreCompletedSummary, setRestoreCompletedSummary] = useState<{
    totalTables: number;
    totalRows: number;
    durationSeconds: number;
  } | null>(null);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const hasRubColumn = useMemo(() => {
    return currentTableColumns.some((c: any) => c.name === 'rub');
  }, [currentTableColumns]);

  const isProTalkLogs = selectedTable === 'protalk_logs';

  // Available channels for channel filter
  const availableChannels = useMemo(() => {
    if (!currentTableRows || currentTableRows.length === 0) return [];
    const set = new Set<string>();
    currentTableRows.forEach((r: any) => {
      if (r.channel_name && typeof r.channel_name === 'string' && r.channel_name.trim()) {
        set.add(r.channel_name.trim());
      }
    });
    return Array.from(set);
  }, [currentTableRows]);

  // Filter rows based on text search, rub value, and channel
  const filteredRows = useMemo(() => {
    return currentTableRows.filter(row => {
      // 1. Text search
      if (rowSearch.trim()) {
        const searchLower = rowSearch.toLowerCase();
        const matches = Object.values(row).some(val =>
          String(val ?? '').toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      // 2. Channel filter
      if (channelFilter !== 'all') {
        const ch = String(row.channel_name || '').trim().toLowerCase();
        if (ch !== channelFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Rub filter
      if (hasRubColumn) {
        const rubVal = Number(row.rub) || 0;
        const isImg = (rubVal >= 0.99 && rubVal <= 1.01) || Number(row.tokens_total) === 33333 || String(row.llm || '').includes('621') || String(row.channel_name || '').toLowerCase().includes('изображен');

        if (rubFilterMode === 'cost_only') {
          if (rubVal <= 0) return false;
        } else if (rubFilterMode === 'images_only') {
          if (!isImg) return false;
        } else if (rubFilterMode === 'text_only') {
          if (isImg || rubVal <= 0) return false;
        } else if (rubFilterMode === 'free_only') {
          if (rubVal > 0) return false;
        } else if (rubFilterMode === 'custom') {
          const min = rubMin !== '' ? parseFloat(rubMin) : -Infinity;
          const max = rubMax !== '' ? parseFloat(rubMax) : Infinity;
          if (rubVal < min || rubVal > max) return false;
        }
      }

      return true;
    });
  }, [currentTableRows, rowSearch, channelFilter, hasRubColumn, rubFilterMode, rubMin, rubMax]);

  // Sort rows based on sortColumn and sortDirection
  const sortedAndFilteredRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;

      // Numeric comparison
      const isNum = sortColumn === 'rub' || sortColumn.includes('tokens') || sortColumn === 'id' || typeof valA === 'number';
      if (isNum) {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Date comparison
      if (sortColumn.includes('date') || sortColumn.includes('created') || sortColumn.includes('timestamp')) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Live aggregated rub metrics and conversions for filtered records
  const rubMetrics = useMemo(() => {
    let totalRub = 0;
    let totalTokens = 0;
    let imagesCount = 0;
    let textCount = 0;
    let successCount = 0;
    let errorCount = 0;

    filteredRows.forEach(row => {
      const r = Number(row.rub) || 0;
      totalRub += r;
      const tok = Number(row.tokens_total) || 0;
      totalTokens += tok;

      const isImg = (r >= 0.99 && r <= 1.01) || tok === 33333 || String(row.llm || '').includes('621') || String(row.channel_name || '').toLowerCase().includes('изображен');
      if (isImg) {
        imagesCount++;
      } else if (r > 0 || tok > 0) {
        textCount++;
      }

      if (row.function_error) {
        errorCount++;
      } else if (row.bot_reply && !String(row.bot_reply).includes('Ожидание ответа')) {
        successCount++;
      }
    });

    const totalCount = filteredRows.length;
    const avgRub = totalCount > 0 ? (totalRub / totalCount) : 0;
    const conversionRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

    return {
      totalRub,
      totalRubDisplay: totalRub >= 10 ? totalRub.toFixed(2) : totalRub.toFixed(4),
      totalTokens: totalTokens.toLocaleString('ru-RU'),
      imagesCount,
      textCount,
      successCount,
      errorCount,
      totalCount,
      avgRubDisplay: avgRub.toFixed(4),
      conversionRate
    };
  }, [filteredRows]);

  const handleSortClick = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('desc');
    }
  };

  const handleOpenAddRow = () => {
    const initialData: Record<string, any> = {};
    currentTableColumns.forEach((col: any) => {
      if (col.name === 'id') {
        initialData[col.name] = `id_${Date.now()}`;
      } else {
        initialData[col.name] = '';
      }
    });
    setRowFormData(initialData);
    setIsAddingRow(true);
  };

  const handleOpenEditRow = (row: any) => {
    setEditingRow(row);
    setRowFormData({ ...row });
  };

  const handleSaveRow = async () => {
    if (!selectedTable) return;
    if (editingRow) {
      const pkCol = currentTableColumns.find((c: any) => c.pk === 1 || c.pk === true)?.name || 'id';
      const id = editingRow[pkCol] || editingRow.id;
      await updateRow(selectedTable, id, rowFormData);
      setEditingRow(null);
    } else if (isAddingRow) {
      await addRow(selectedTable, rowFormData);
      setIsAddingRow(false);
    }
  };

  const getRowPkValue = (row: any) => {
    const pkCol = currentTableColumns.find((c: any) => c.pk === 1 || c.pk === true)?.name || 'id';
    return row[pkCol] !== undefined ? row[pkCol] : row.id;
  };

  const toggleRowSelection = (rowId: string | number) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const isAllFilteredSelected = sortedAndFilteredRows.length > 0 && sortedAndFilteredRows.every(r => selectedRowIds.has(getRowPkValue(r)));
  const isSomeFilteredSelected = sortedAndFilteredRows.some(r => selectedRowIds.has(getRowPkValue(r))) && !isAllFilteredSelected;

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedRowIds(new Set());
    } else {
      const next = new Set(selectedRowIds);
      sortedAndFilteredRows.forEach(r => {
        const id = getRowPkValue(r);
        if (id !== undefined && id !== null) {
          next.add(id);
        }
      });
      setSelectedRowIds(next);
    }
  };

  const handleBatchDeleteClick = () => {
    if (!selectedTable || selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    const idsList = Array.from(selectedRowIds);

    showConfirmModal({
      title: 'Массовое удаление записей',
      message: `Вы действительно хотите удалить ${count} выбранных записей из таблицы "${selectedTable}"? Это действие необратимо.`,
      confirmText: `Удалить выбранные (${count})`,
      danger: true,
      onConfirm: async () => {
        const success = await deleteRows(selectedTable, idsList);
        if (success) {
          setSelectedRowIds(new Set());
        }
        closeConfirmModal();
      }
    });
  };

  const handleDeleteRowClick = (row: any) => {
    if (!selectedTable) return;
    const pkCol = currentTableColumns.find((c: any) => c.pk === 1 || c.pk === true)?.name || 'id';
    const id = row[pkCol] || row.id;

    showConfirmModal({
      title: 'Удаление записи',
      message: `Вы действительно хотите удалить запись с идентификатором "${id}" из таблицы "${selectedTable}"? Это действие необратимо.`,
      confirmText: 'Удалить запись',
      danger: true,
      onConfirm: async () => {
        await deleteRow(selectedTable, id);
        setSelectedRowIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        closeConfirmModal();
      }
    });
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !newColName.trim()) return;

    setColumnActionLoading(true);
    try {
      const res = await fetch(`/api/admin/table/${selectedTable}/column`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnName: newColName.trim(),
          columnType: newColType,
          defaultValue: newColDefault.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingColumn(false);
        setNewColName('');
        setNewColDefault('');
        await selectTable(selectedTable);
        await fetchTables();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setColumnActionLoading(false);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonContent(text || '');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExecuteCsvImport = async () => {
    if (!selectedTable || !csvContent.trim()) return;
    setCsvLoading(true);
    const success = await importTableCsv(selectedTable, csvContent);
    setCsvLoading(false);
    if (success) {
      setIsImportingCsv(false);
      setCsvContent('');
    }
  };

  const handleExecuteJsonRestore = async () => {
    if (!jsonContent.trim()) return;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (err: any) {
      alert('Ошибка структуры JSON: ' + err.message);
      return;
    }

    if (!parsed || !parsed.tables || typeof parsed.tables !== 'object') {
      alert('Неверная структура JSON бэкапа: отсутствует раздел tables.');
      return;
    }

    const tableNames = Object.keys(parsed.tables);
    if (tableNames.length === 0) {
      alert('В файле бэкапа нет таблиц для восстановления.');
      return;
    }

    setJsonLoading(true);
    setRestoreProgressActive(true);
    setRestoreCompletedSummary(null);
    setRestoreProgressPercent(2);
    setRestoreCurrentStage('Анализ и проверка структуры бэкапа BD ProTalk');

    const startTime = Date.now();
    let totalRowsInBackup = 0;
    const initialSteps = tableNames.map(name => {
      const rowsCount = Array.isArray(parsed.tables[name]?.rows) ? parsed.tables[name].rows.length : 0;
      totalRowsInBackup += rowsCount;
      return {
        id: name,
        tableName: name,
        rows: rowsCount,
        status: 'pending' as const
      };
    });

    setRestoreStepLogs(initialSteps);
    setRestoreCurrentDetail(`Обнаружено таблиц: ${tableNames.length}, всего записей: ${totalRowsInBackup}`);
    await new Promise(r => setTimeout(r, 250));

    let restoredTablesCount = 0;
    let restoredRowsCount = 0;
    const totalTables = tableNames.length;

    for (let i = 0; i < totalTables; i++) {
      const tableName = tableNames[i];
      const tableData = parsed.tables[tableName];
      const rowsCount = Array.isArray(tableData?.rows) ? tableData.rows.length : 0;

      // Mark current table as processing
      setRestoreStepLogs(prev => prev.map(s => s.tableName === tableName ? { ...s, status: 'processing' } : s));

      const percent = Math.round(5 + (i / totalTables) * 85);
      setRestoreProgressPercent(percent);
      setRestoreCurrentStage(`Восстановление таблицы «${tableName}»`);
      setRestoreCurrentDetail(`Таблица ${i + 1} из ${totalTables} • ${rowsCount} записей`);

      try {
        const res = await fetch('/api/admin/database/restore/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: parsed.version || '2.0',
            tables: {
              [tableName]: tableData
            }
          })
        });
        const data = await res.json();
        if (data.success) {
          restoredTablesCount++;
          restoredRowsCount += (data.totalRowsRestored ?? rowsCount);
          setRestoreStepLogs(prev => prev.map(s => s.tableName === tableName ? { ...s, status: 'done' } : s));
        } else {
          console.warn(`Restore warning for ${tableName}:`, data.error);
          setRestoreStepLogs(prev => prev.map(s => s.tableName === tableName ? { ...s, status: 'failed' } : s));
        }
      } catch (tabErr) {
        console.error(`Network error restoring table ${tableName}:`, tabErr);
        setRestoreStepLogs(prev => prev.map(s => s.tableName === tableName ? { ...s, status: 'failed' } : s));
      }

      const progressAfter = Math.round(5 + ((i + 1) / totalTables) * 85);
      setRestoreProgressPercent(progressAfter);
      await new Promise(r => setTimeout(r, 120));
    }

    // Schema sync stage
    setRestoreProgressPercent(93);
    setRestoreCurrentStage('Синхронизация реестра таблиц');
    setRestoreCurrentDetail('Обновление метаданных в панели администратора...');
    await fetchTables();
    if (selectedTable) {
      await selectTable(selectedTable);
    }
    await new Promise(r => setTimeout(r, 250));

    // Server persistence
    setRestoreProgressPercent(97);
    setRestoreCurrentStage('Фиксация базы данных на сервере');
    setRestoreCurrentDetail('Создание резервной копии базы данных...');
    try {
      await fetch('/api/admin/backup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Автофиксация после восстановления JSON бэкапа' })
      });
    } catch {}
    await new Promise(r => setTimeout(r, 200));

    setRestoreProgressPercent(100);
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setRestoreCurrentStage('Восстановление успешно завершено!');
    setRestoreCurrentDetail(`База данных синхронизирована: ${restoredTablesCount} таблиц, ${restoredRowsCount} записей`);
    setRestoreCompletedSummary({
      totalTables: restoredTablesCount,
      totalRows: restoredRowsCount,
      durationSeconds: durationSec
    });
    setJsonLoading(false);
  };

  return (
    <SystemAdminLayout
      title="Таблицы BD ProTalk"
      subtitle={`Управление структурой базы данных BD ProTalk (PostgreSQL, ${tables.length} таблиц зарегистрировано)`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export All Tables to ZIP */}
          <button
            id="export-zip-btn"
            onClick={exportAllTablesZip}
            title="Скачать все таблицы базы данных в ZIP архиве (отдельные CSV файлы)"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-400/30 backdrop-blur-xl bg-black/40 hover:border-amber-400 text-amber-200 hover:text-white transition-all text-sm font-medium shadow-md shadow-amber-500/10"
          >
            <Archive className="w-4 h-4 text-amber-300" />
            <span>Все таблицы в ZIP</span>
          </button>

          {/* Download Full JSON Backup */}
          <button
            id="backup-json-btn"
            onClick={downloadFullJsonBackup}
            title="Скачать полный снимок всей базы данных (структура + данные) в JSON"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>Бэкап JSON</span>
          </button>

          {/* Restore JSON Backup */}
          <button
            id="restore-json-btn"
            onClick={() => {
              setJsonContent('');
              setIsRestoringJson(true);
            }}
            title="Восстановить структуру и данные базы данных из JSON файла"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white transition-all text-sm font-medium"
          >
            <Upload className="w-4 h-4 text-amber-300" />
            <span>Восстановить JSON</span>
          </button>

          {/* Refresh Tables */}
          <button
            id="refresh-tables-btn"
            onClick={() => {
              fetchTables();
              if (selectedTable) selectTable(selectedTable);
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      }
    >
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm || (() => {})}
        onClose={closeConfirmModal}
      />

      {/* Messages */}
      {error && (
        <div id="admin-error-banner" className="mb-6 p-4 rounded-xl backdrop-blur-2xl bg-black/30 border border-amber-400/50 flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={clearMessages} className="p-1 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div id="admin-success-banner" className="mb-6 p-4 rounded-xl backdrop-blur-2xl bg-black/30 border border-amber-400/50 flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={clearMessages} className="p-1 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Prominent Mailing & Autopilot Hub Card (Liquid Glass Apple Style) */}
      <div id="admin-autopilot-hub-banner" className="mb-6 p-5 sm:p-6 rounded-2xl backdrop-blur-2xl bg-black/40 border border-amber-300/40 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="p-2 rounded-xl border border-amber-300/50 bg-amber-400/15 text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent text-smoke-anim">
                Настройки отправки рассылок и автопилота мемов
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg border border-amber-300/40 text-amber-200 text-sm font-semibold">
                10:00 — 17:00 МСК
              </span>
              <span className="px-2.5 py-0.5 rounded-lg border border-white/20 text-white/80 text-sm font-semibold">
                Защита от ночной отправки
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              Центр управления регулярными рассылками: автоматическая генерация сатирических бизнес-мемов в 07:00 МСК, моментальный тестовый предпросмотр администратору (ID: 169262990) и случайная каскадная доставка клиентам и партнерам строго с 10:00 до 17:00 по Москве.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0 w-full sm:w-auto">
            <button
              type="button"
              id="goto-autopilot-settings-btn"
              onClick={() => navigate('/system-admin/autopilot?tab=settings')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white transition-all text-sm font-semibold shadow-lg shadow-amber-500/10"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300" />
              <span>Параметры и расписание</span>
            </button>
            <button
              type="button"
              id="goto-autopilot-editor-btn"
              onClick={() => navigate('/system-admin/autopilot?tab=editor')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-black/30 hover:border-amber-300/50 text-white transition-all text-sm font-medium"
            >
              <Bot className="w-4 h-4 text-amber-300" />
              <span>Конструктор мемов</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Sections Ribbon (Consolidated Database Sections - Liquid Glass Apple Style) */}
      <div id="admin-quick-sections" className="mb-6 p-4 sm:p-5 rounded-2xl backdrop-blur-2xl bg-black/35 border border-white/20 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg border border-amber-300/40 bg-black/30 text-amber-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Быстрый переход к разделам базы данных</h3>
              <p className="text-sm text-white/60">Все ключевые таблицы системы объединены в едином реестре BD ProTalk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/greenland/admin')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-300/50 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 text-sm font-semibold transition-all shadow-sm shrink-0"
            title="Открыть штаб экосистемы Greenland AI"
          >
            <Server className="w-4 h-4 text-amber-300" />
            <span>Штаб партнерки Greenland</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-300/70" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quickSections.map((sec) => {
            const isSelected = selectedTable === sec.name;
            const Icon = sec.icon;
            const tableItem = tables.find(t => t.name === sec.name);
            const count = tableItem?.rowCount ?? null;

            return (
              <button
                key={sec.name}
                type="button"
                id={`quick-section-${sec.name}`}
                onClick={() => handleSelectTable(sec.name, sec.route)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'border border-amber-300 bg-amber-400/25 text-amber-200 shadow-md shadow-amber-400/15 font-semibold'
                    : 'border border-white/15 bg-black/30 text-white/80 hover:text-white hover:border-amber-300/40'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-200' : 'text-amber-300/80'}`} />
                <span>{sec.label}</span>
                {count !== null && (
                  <span className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                    isSelected ? 'bg-amber-300/20 text-amber-100' : 'bg-white/10 text-white/50'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Tables Directory List */}
        <div className="lg:col-span-1 p-4 sm:p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl flex flex-col h-[780px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-300" />
              <h2 className="text-base font-semibold text-white">Список таблиц ({tables.length})</h2>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-tables-input"
              type="text"
              placeholder="Поиск по таблицам..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Quick Jump to protalk_logs */}
          <button
            type="button"
            id="quick-jump-protalk-logs-btn"
            onClick={() => {
              handleSelectTable('protalk_logs');
              setTableSearch('');
            }}
            className={`w-full text-left mb-3 px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between border ${
              selectedTable === 'protalk_logs'
                ? 'border-amber-300 bg-amber-400/20 text-amber-200 shadow-md shadow-amber-400/10 font-bold'
                : 'border-amber-400/35 bg-black/40 hover:border-amber-300 text-amber-300 hover:text-amber-100 shadow-sm'
            }`}
          >
            <span className="flex items-center gap-2 font-mono text-sm">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">protalk_logs</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg border border-amber-400/30 bg-black/40 text-amber-300 text-sm font-mono whitespace-nowrap">
              Расходы AI
            </span>
          </button>

          {/* Table List Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredTables.map((t) => {
              const isSelected = selectedTable === t.name;
              return (
                <button
                  key={t.name}
                  id={`table-item-${t.name}`}
                  onClick={() => handleSelectTable(t.name)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border border-amber-400/50 bg-black/40 text-white shadow-md shadow-amber-400/10'
                      : 'border border-transparent hover:border-white/15 bg-black/10 text-white/80 hover:text-white'
                  }`}
                >
                  <span className="font-mono truncate max-w-[170px] text-sm">{t.name}</span>
                  <span className="px-2 py-0.5 rounded-lg border border-white/10 bg-black/30 text-white/60 font-mono text-sm">
                    {t.rowCount}
                  </span>
                </button>
              );
            })}

            {filteredTables.length === 0 && (
              <div className="p-4 text-center text-white/50 text-sm">
                Таблицы не найдены
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Table Details & Data Viewer */}
        <div className="lg:col-span-3 p-5 sm:p-6 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl flex flex-col h-[780px]">
          {selectedTable ? (
            <>
              {/* Header of selected table */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-mono">
                      {selectedTable}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg border border-amber-400/30 bg-black/30 text-amber-200 text-sm font-mono">
                      {currentTableRows.length} записей
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mt-0.5">
                    Структура: {currentTableColumns.length} колонок
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="p-1 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 flex items-center gap-1">
                    <button
                      id="view-rows-tab-btn"
                      onClick={() => setActiveSubTab('rows')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        activeSubTab === 'rows'
                          ? 'border border-amber-400/40 bg-black/40 text-amber-300'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Данные</span>
                    </button>
                    <button
                      id="view-schema-tab-btn"
                      onClick={() => setActiveSubTab('schema')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        activeSubTab === 'schema'
                          ? 'border border-amber-400/40 bg-black/40 text-amber-300'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Колонки</span>
                    </button>
                  </div>

                  {/* Export Table to CSV */}
                  <button
                    id="export-table-csv-btn"
                    onClick={() => exportTableCsv(selectedTable)}
                    title={`Экспорт таблицы ${selectedTable} в CSV`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white text-sm font-medium transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                    <span>Экспорт CSV</span>
                  </button>

                  {/* Import CSV to Table */}
                  <button
                    id="import-table-csv-btn"
                    onClick={() => {
                      setCsvContent('');
                      setIsImportingCsv(true);
                    }}
                    title={`Импорт данных из CSV в таблицу ${selectedTable}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white text-sm font-medium transition-all"
                  >
                    <FileUp className="w-3.5 h-3.5 text-amber-300" />
                    <span>Импорт CSV</span>
                  </button>

                  <button
                    id="add-column-btn"
                    onClick={() => setIsAddingColumn(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white text-sm font-medium transition-all"
                  >
                    <Columns className="w-3.5 h-3.5 text-amber-300" />
                    <span>Добавить колонку</span>
                  </button>

                  <button
                    id="add-row-btn"
                    onClick={handleOpenAddRow}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-400/50 backdrop-blur-xl bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>Добавить запись</span>
                  </button>
                </div>
              </div>

              {/* Rows View Mode */}
              {activeSubTab === 'rows' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Dedicated ProTalk & Rub Analytics Banner for Expenses & Conversions */}
                  {(hasRubColumn || isProTalkLogs) && (
                    <div className="mb-4 p-4 rounded-2xl backdrop-blur-2xl bg-black/40 border border-amber-400/40 shadow-xl flex flex-col gap-3">
                      {/* Top metrics grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {/* Metric 1: Total Rubles */}
                        <div className="p-3 rounded-xl border border-amber-400/40 bg-black/50 flex flex-col justify-between shadow-sm">
                          <div className="flex items-center justify-between text-amber-300 text-sm">
                            <span className="font-medium">Расход по фильтру</span>
                            <Coins className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-mono">
                            {rubMetrics.totalRubDisplay} ₽
                          </div>
                          <span className="text-white/50 text-sm mt-0.5">сумма колонки rub</span>
                        </div>

                        {/* Metric 2: Image Generations (1 ₽) */}
                        <div className="p-3 rounded-xl border border-white/10 bg-black/35 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-zinc-300 text-sm">
                            <span>Картинки (1 ₽)</span>
                            <ImageIcon className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-bold text-white font-mono">
                            {rubMetrics.imagesCount} шт.
                          </div>
                          <span className="text-amber-300 text-sm mt-0.5">ф. 621 ({rubMetrics.imagesCount} ₽)</span>
                        </div>

                        {/* Metric 3: Text Generations (< 1 ₽) */}
                        <div className="p-3 rounded-xl border border-white/10 bg-black/35 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-zinc-300 text-sm">
                            <span>Текстовые</span>
                            <Bot className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-bold text-white font-mono">
                            {rubMetrics.textCount} шт.
                          </div>
                          <span className="text-white/50 text-sm mt-0.5">&lt; 1 ₽ за запрос</span>
                        </div>

                        {/* Metric 4: Total Tokens */}
                        <div className="p-3 rounded-xl border border-white/10 bg-black/35 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-zinc-300 text-sm">
                            <span>Всего токенов</span>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-bold text-white font-mono">
                            {rubMetrics.totalTokens}
                          </div>
                          <span className="text-white/50 text-sm mt-0.5">tokens_total</span>
                        </div>

                        {/* Metric 5: Average Rub Per Query */}
                        <div className="p-3 rounded-xl border border-white/10 bg-black/35 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-zinc-300 text-sm">
                            <span>Средний расход</span>
                            <Calculator className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-bold text-white font-mono">
                            {rubMetrics.avgRubDisplay} ₽
                          </div>
                          <span className="text-white/50 text-sm mt-0.5">за 1 запрос</span>
                        </div>

                        {/* Metric 6: Conversion & Success Rate */}
                        <div className="p-3 rounded-xl border border-white/10 bg-black/35 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-zinc-300 text-sm">
                            <span>Конверсия ответов</span>
                            <TrendingUp className="w-4 h-4 text-amber-300" />
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-bold text-amber-300 font-mono">
                            {rubMetrics.conversionRate}%
                          </div>
                          <span className="text-white/50 text-sm mt-0.5">{rubMetrics.successCount} из {rubMetrics.totalCount}</span>
                        </div>
                      </div>

                      {/* Rub filter chips & Channel selector */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-zinc-200 font-medium mr-1 flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-amber-300" />
                            Фильтр по рублям:
                          </span>
                          {[
                            { id: 'all', label: `Все (${currentTableRows.length})` },
                            { id: 'cost_only', label: 'С расходом (> 0 ₽)' },
                            { id: 'images_only', label: 'Картинки (1 ₽)' },
                            { id: 'text_only', label: 'Текст (< 1 ₽)' },
                            { id: 'free_only', label: '0 ₽' },
                            { id: 'custom', label: 'Диапазон' },
                          ].map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setRubFilterMode(f.id as any)}
                              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                                rubFilterMode === f.id
                                  ? 'border border-amber-300 bg-amber-400/20 text-amber-200 shadow-sm font-bold'
                                  : 'border border-white/15 bg-black/30 text-zinc-300 hover:text-white hover:border-white/30'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}

                          {rubFilterMode === 'custom' && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <input
                                type="number"
                                placeholder="От ₽"
                                step="0.0001"
                                value={rubMin}
                                onChange={e => setRubMin(e.target.value)}
                                className="w-20 px-2.5 py-1 rounded-lg border border-white/20 bg-black/40 text-white text-sm focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-white/40 text-sm">—</span>
                              <input
                                type="number"
                                placeholder="До ₽"
                                step="0.0001"
                                value={rubMax}
                                onChange={e => setRubMax(e.target.value)}
                                className="w-20 px-2.5 py-1 rounded-lg border border-white/20 bg-black/40 text-white text-sm focus:outline-none focus:border-amber-400"
                              />
                              {(rubMin || rubMax) && (
                                <button
                                  type="button"
                                  onClick={() => { setRubMin(''); setRubMax(''); }}
                                  className="text-sm text-zinc-400 hover:text-white underline ml-1"
                                >
                                  Сброс
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Channel dropdown filter */}
                        {availableChannels.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-300">Канал:</span>
                            <select
                              value={channelFilter}
                              onChange={e => setChannelFilter(e.target.value)}
                              className="px-3 py-1.5 rounded-xl border border-white/20 bg-black/50 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              <option value="all">Все каналы</option>
                              {availableChannels.map(ch => (
                                <option key={ch} value={ch}>{ch}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Search within rows */}
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="search-rows-input"
                        type="text"
                        placeholder="Поиск по строкам текущей таблицы..."
                        value={rowSearch}
                        onChange={(e) => setRowSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedRowIds.size > 0 && (
                        <span className="text-amber-300 text-sm font-medium">
                          Выбрано: {selectedRowIds.size}
                        </span>
                      )}
                      <span className="text-white/50 text-sm font-mono">
                        Показано {sortedAndFilteredRows.length} из {currentTableRows.length}
                      </span>
                      {sortColumn && (
                        <span className="text-amber-300/80 text-sm font-mono border border-amber-400/30 px-2 py-0.5 rounded-lg bg-black/30 flex items-center gap-1">
                          <span>Сортировка: {sortColumn}</span>
                          {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multiselect Action Bar */}
                  {selectedRowIds.size > 0 && (
                    <div className="mb-3 p-3 rounded-2xl backdrop-blur-2xl bg-black/40 border border-amber-400/40 shadow-lg flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-white text-sm font-medium">
                          Выбрано записей: <span className="font-bold text-amber-300 font-mono">{selectedRowIds.size}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          id="deselect-all-rows-btn"
                          type="button"
                          onClick={() => setSelectedRowIds(new Set())}
                          className="px-3 py-1.5 rounded-xl border border-white/20 bg-black/30 hover:border-white/40 text-white/80 hover:text-white text-sm transition-all"
                        >
                          Снять выбор
                        </button>
                        <button
                          id="delete-selected-rows-btn"
                          type="button"
                          onClick={handleBatchDeleteClick}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent hover:from-amber-500/30 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
                        >
                          <Trash2 className="w-4 h-4 text-amber-300" />
                          <span>Удалить выбранные ({selectedRowIds.size})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table Grid Scrollable */}
                  <div className="flex-1 overflow-auto border border-white/10 rounded-xl scrollbar-thin">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 backdrop-blur-2xl bg-black/60 border-b border-white/10 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">
                            <input
                              id="select-all-rows-checkbox"
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeFilteredSelected;
                              }}
                              onChange={toggleSelectAllFiltered}
                              className="w-4 h-4 rounded border-amber-400/40 bg-black/40 text-amber-500 focus:ring-amber-400/30 focus:ring-offset-0 cursor-pointer accent-amber-500"
                              title={isAllFilteredSelected ? 'Снять выбор со всех' : 'Выбрать все отфильтрованные'}
                            />
                          </th>
                          <th className="p-3 text-amber-300 font-semibold whitespace-nowrap text-sm">Действия</th>
                          {currentTableColumns.map((col: any) => {
                            const isSorted = sortColumn === col.name;
                            return (
                              <th 
                                key={col.name} 
                                onClick={() => handleSortClick(col.name)}
                                className={`p-3 font-semibold whitespace-nowrap text-sm font-mono cursor-pointer select-none transition-colors group ${
                                  isSorted ? 'text-amber-300 bg-amber-400/10' : 'text-white/90 hover:text-amber-200 hover:bg-white/5'
                                }`}
                                title="Нажмите для сортировки по этой колонке"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{col.name}</span>
                                  {col.pk === 1 && (
                                    <span className="px-1.5 py-0.5 rounded border border-amber-400/40 text-amber-200 text-sm font-mono">
                                      PK
                                    </span>
                                  )}
                                  {isSorted ? (
                                    sortDirection === 'asc' ? (
                                      <ArrowUp className="w-3.5 h-3.5 text-amber-300 inline" />
                                    ) : (
                                      <ArrowDown className="w-3.5 h-3.5 text-amber-300 inline" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 text-white/30 group-hover:text-amber-300/60 inline transition-colors" />
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedAndFilteredRows.map((row, idx) => {
                          const rowId = getRowPkValue(row);
                          const isSelected = rowId !== undefined && selectedRowIds.has(rowId);

                          return (
                            <tr 
                              key={idx} 
                              className={`transition-colors ${isSelected ? 'bg-amber-400/10 hover:bg-amber-400/15' : 'hover:bg-white/5'}`}
                            >
                              <td className="p-3 w-12 text-center">
                                <input
                                  id={`select-row-checkbox-${idx}`}
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => rowId !== undefined && toggleRowSelection(rowId)}
                                  className="w-4 h-4 rounded border-amber-400/40 bg-black/40 text-amber-500 focus:ring-amber-400/30 focus:ring-offset-0 cursor-pointer accent-amber-500"
                                  title="Выбрать строку для удаления"
                                />
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    id={`edit-row-${idx}`}
                                    onClick={() => handleOpenEditRow(row)}
                                    className="p-1.5 rounded-lg border border-white/10 bg-black/20 hover:border-amber-400/50 text-white/80 hover:text-white transition-all"
                                    title="Редактировать запись"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                                  </button>
                                  <button
                                    id={`delete-row-${idx}`}
                                    onClick={() => handleDeleteRowClick(row)}
                                    className="p-1.5 rounded-lg border border-white/10 bg-black/20 hover:border-amber-400/50 text-white/80 hover:text-amber-300 transition-all"
                                    title="Удалить запись"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                                  </button>
                                </div>
                              </td>
                              {currentTableColumns.map((col: any) => {
                                const val = row[col.name];
                                const isSortedCol = sortColumn === col.name;

                                // Special rich formatting for rub column
                                if (col.name === 'rub') {
                                  const num = Number(val) || 0;
                                  const isImage = (num >= 0.99 && num <= 1.01) || Number(row.tokens_total) === 33333 || String(row.llm || '').includes('621') || String(row.channel_name || '').toLowerCase().includes('изображен');
                                  return (
                                    <td key={col.name} className={`p-3 font-mono text-sm whitespace-nowrap ${isSortedCol ? 'bg-amber-400/5' : ''}`}>
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-bold text-sm ${
                                        isImage
                                          ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                                          : num > 0
                                            ? 'border-amber-400/40 bg-black/40 text-amber-300'
                                            : 'border-white/10 bg-black/20 text-white/40 font-normal'
                                      }`}>
                                        {num >= 10 ? num.toFixed(2) : num.toFixed(4)} ₽
                                        {isImage && (
                                          <span className="text-sm font-semibold text-amber-200 px-1 rounded bg-amber-400/30">1 ₽ (ф. 621)</span>
                                        )}
                                      </span>
                                    </td>
                                  );
                                }

                                // Special rich formatting for bot_reply when it is an image URL
                                if (col.name === 'bot_reply' && typeof val === 'string' && (val.includes('.png') || val.includes('.jpg') || val.includes('.jpeg') || val.includes('.webp') || val.includes('amazonaws.com') || val.includes('fal.media'))) {
                                  return (
                                    <td key={col.name} className={`p-3 font-mono text-sm text-white/90 max-w-xs truncate ${isSortedCol ? 'bg-amber-400/5' : ''}`}>
                                      <div className="flex items-center gap-2">
                                        <a href={val} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                                          <img src={val} alt="AI Gen" className="w-8 h-8 rounded-lg object-cover border border-amber-400/40 hover:scale-110 transition-transform" />
                                        </a>
                                        <a href={val} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline truncate text-sm">
                                          {val}
                                        </a>
                                      </div>
                                    </td>
                                  );
                                }

                                const isLong = typeof val === 'string' && val.length > 50;
                                return (
                                  <td 
                                    key={col.name} 
                                    className={`p-3 font-mono text-sm text-white/80 max-w-xs truncate ${isSortedCol ? 'bg-amber-400/5 text-amber-100' : ''}`} 
                                    title={String(val ?? '')}
                                  >
                                    {val === null ? (
                                      <span className="text-white/30 italic">NULL</span>
                                    ) : isLong ? (
                                      `${String(val).slice(0, 50)}...`
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {sortedAndFilteredRows.length === 0 && (
                          <tr>
                            <td colSpan={currentTableColumns.length + 2} className="p-8 text-center text-white/40 text-sm">
                              В этой таблице пока нет данных или записи не соответствуют выбранным фильтрам
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Schema View Mode */}
              {activeSubTab === 'schema' && (
                <div className="flex-1 overflow-auto border border-white/10 rounded-xl scrollbar-thin">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 backdrop-blur-2xl bg-black/60 border-b border-white/10">
                      <tr>
                        <th className="p-3 text-amber-300 font-semibold font-mono">Колонка</th>
                        <th className="p-3 text-amber-300 font-semibold font-mono">Тип данных</th>
                        <th className="p-3 text-amber-300 font-semibold font-mono">Primary Key</th>
                        <th className="p-3 text-amber-300 font-semibold font-mono">Not Null</th>
                        <th className="p-3 text-amber-300 font-semibold font-mono">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {currentTableColumns.map((col: any) => (
                        <tr key={col.name} className="hover:bg-white/5">
                          <td className="p-3 text-white font-medium">{col.name}</td>
                          <td className="p-3 text-amber-200">{col.type || 'TEXT'}</td>
                          <td className="p-3">
                            {col.pk === 1 || col.pk === true ? (
                              <span className="px-2 py-0.5 rounded border border-amber-400/50 bg-black/30 text-amber-300 text-sm">
                                Primary Key
                              </span>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {col.notNull === 1 || col.notNull === true ? (
                              <span className="text-white/90 text-sm">Not Null</span>
                            ) : (
                              <span className="text-white/30 text-sm">Null</span>
                            )}
                          </td>
                          <td className="p-3 text-white/60">{col.defaultValue ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 space-y-3">
              <Database className="w-12 h-12 text-amber-300/40" />
              <p className="text-base">Выберите таблицу из списка слева для просмотра и редактирования записей</p>
            </div>
          )}
        </div>
      </div>

      {/* Row Edit/Add Modal */}
      {(editingRow || isAddingRow) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl backdrop-blur-2xl bg-black/40 border border-white/20 p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingRow ? `Редактирование записи в ${selectedTable}` : `Добавление записи в ${selectedTable}`}
              </h3>
              <button
                onClick={() => {
                  setEditingRow(null);
                  setIsAddingRow(false);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {currentTableColumns.map((col: any) => {
                const isPk = col.pk === 1 || col.pk === true;
                const val = rowFormData[col.name] ?? '';
                const isLongText = typeof val === 'string' && (val.length > 50 || val.includes('\n') || val.includes('{') || col.name.includes('prompt') || col.name.includes('config') || col.name.includes('description') || col.name.includes('data') || col.name.includes('json') || col.name.includes('features') || col.name.includes('rules'));

                return (
                  <div key={col.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-mono text-white/80">
                        {col.name} {isPk && <span className="text-amber-300 font-semibold">(Primary Key)</span>}
                      </label>
                      <span className="text-sm text-white/50 font-mono">
                        {col.type || 'TEXT'} (тяните за угол для изменения высоты)
                      </span>
                    </div>
                    <textarea
                      disabled={isPk && editingRow}
                      value={val}
                      rows={isLongText ? 4 : 2}
                      onChange={(e) =>
                        setRowFormData({
                          ...rowFormData,
                          [col.name]: e.target.value
                        })
                      }
                      className="w-full p-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50 disabled:opacity-50 resize-y min-h-[46px]"
                      placeholder={`Значение для ${col.name}...`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingRow(null);
                  setIsAddingRow(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/15 bg-black/20 hover:border-white/30 text-white/80 text-sm font-medium transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveRow}
                disabled={loading}
                className="px-5 py-2 rounded-xl border border-amber-400/50 bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
              >
                {loading ? 'Сохранение...' : 'Сохранить запись'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {isAddingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl backdrop-blur-2xl bg-black/40 border border-white/20 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">
                Добавить колонку в {selectedTable}
              </h3>
              <button
                onClick={() => setIsAddingColumn(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Название колонки
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. custom_notes, tax_rate"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full p-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Тип данных
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full p-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
                >
                  <option value="TEXT" className="bg-neutral-900 text-white">TEXT (Текст / JSON)</option>
                  <option value="INTEGER" className="bg-neutral-900 text-white">INTEGER (Целое число / Флаг 0/1)</option>
                  <option value="REAL" className="bg-neutral-900 text-white">REAL (Число с плавающей точкой)</option>
                  <option value="DATETIME" className="bg-neutral-900 text-white">DATETIME (Дата и время)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Значение по умолчанию (опционально)
                </label>
                <input
                  type="text"
                  placeholder="e.g. default_val, 0"
                  value={newColDefault}
                  onChange={(e) => setNewColDefault(e.target.value)}
                  className="w-full p-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-4 py-2 rounded-xl border border-white/15 bg-black/20 hover:border-white/30 text-white/80 text-sm font-medium transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={columnActionLoading}
                  className="px-5 py-2 rounded-xl border border-amber-400/50 bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
                >
                  {columnActionLoading ? 'Добавление...' : 'Добавить колонку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportingCsv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl backdrop-blur-2xl bg-black/40 border border-white/20 p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-amber-300" />
                <h3 className="text-lg font-bold text-white">
                  Импорт CSV в таблицу {selectedTable}
                </h3>
              </div>
              <button
                onClick={() => setIsImportingCsv(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              <p className="text-white/70 text-sm">
                Выберите .csv файл со своего компьютера или вставьте текст CSV ниже. Первая строка должна содержать заголовки колонок.
              </p>

              <div>
                <input
                  type="file"
                  ref={csvFileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvFileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-white/20 hover:border-amber-400/50 bg-black/20 hover:bg-black/30 text-white/80 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-amber-300" />
                  <span>Загрузить CSV файл с диска</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-mono text-white/80 mb-1">
                  Содержимое CSV (текст):
                </label>
                <textarea
                  rows={10}
                  placeholder={`id,name,category,price\nprod_1,SAV Bot,Telegram,4900\nprod_2,AI Seller,Web,9900`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50 resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
              <button
                type="button"
                onClick={() => setIsImportingCsv(false)}
                className="px-4 py-2 rounded-xl border border-white/15 bg-black/20 hover:border-white/30 text-white/80 text-sm font-medium transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteCsvImport}
                disabled={csvLoading || !csvContent.trim()}
                className="px-5 py-2 rounded-xl border border-amber-400/50 bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
              >
                {csvLoading ? 'Импорт...' : 'Импортировать в базу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore JSON Backup Modal */}
      {isRestoringJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl backdrop-blur-2xl bg-black/60 border border-white/20 p-6 flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-amber-300" />
                <h3 className="text-lg font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                  Восстановление базы данных из JSON бэкапа
                </h3>
              </div>
              {!restoreProgressActive && (
                <button
                  onClick={() => setIsRestoringJson(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Active Restore Progress Animation View */}
            {restoreProgressActive ? (
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin">
                {/* Progress Metric & Stage Card */}
                <div className="p-4 rounded-xl border border-amber-400/30 bg-black/40 backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-amber-200 font-semibold">
                      {restoreProgressPercent < 100 ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      )}
                      <span>{restoreCurrentStage}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full border border-amber-400/40 bg-black/50 text-amber-300 font-bold text-sm shadow-inner">
                      {restoreProgressPercent}%
                    </span>
                  </div>

                  {/* Liquid Glass Animated Progress Bar */}
                  <div className="w-full h-4 rounded-full bg-black/80 border border-white/20 p-0.5 overflow-hidden shadow-inner relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 transition-all duration-300 relative shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      style={{ width: `${restoreProgressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                    </div>
                  </div>

                  {/* Detail Info */}
                  <div className="text-sm text-white/80">
                    {restoreCurrentDetail}
                  </div>
                </div>

                {/* Real-time Tables Progress List */}
                {restoreStepLogs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/90 flex items-center justify-between">
                      <span>Ход восстановления таблиц BD ProTalk:</span>
                      <span className="text-sm text-amber-300/90 font-mono">
                        {restoreStepLogs.filter(s => s.status === 'done').length} / {restoreStepLogs.length}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 rounded-xl p-3 border border-white/10 bg-black/30 backdrop-blur-xl scrollbar-thin">
                      {restoreStepLogs.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Database className="w-4 h-4 text-amber-300 shrink-0" />
                            <span className="font-mono text-white/90 truncate text-sm">
                              {item.tableName}
                            </span>
                            <span className="text-white/50 text-sm">
                              ({item.rows} строк)
                            </span>
                          </div>

                          <div className="shrink-0 ml-2">
                            {item.status === 'processing' && (
                              <span className="flex items-center gap-1 text-sm text-amber-300">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Восстановление</span>
                              </span>
                            )}
                            {item.status === 'done' && (
                              <span className="flex items-center gap-1 text-sm text-amber-200">
                                <Check className="w-4 h-4 text-amber-300" />
                                <span>Готово</span>
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="text-sm text-white/40">
                                В очереди
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="text-sm text-white/60">
                                Пропущено
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Summary Card */}
                {restoreCompletedSummary && (
                  <div className="p-4 rounded-xl border border-amber-400/40 bg-black/40 text-center space-y-1.5 backdrop-blur-xl animate-in fade-in">
                    <CheckCircle2 className="w-8 h-8 text-amber-300 mx-auto" />
                    <div className="text-base font-bold text-amber-200">
                      База данных успешно восстановлена!
                    </div>
                    <div className="text-sm text-white/80">
                      Восстановлено таблиц: {restoreCompletedSummary.totalTables} • Всего записей: {restoreCompletedSummary.totalRows} • Время: {restoreCompletedSummary.durationSeconds} сек
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                <div className="pt-2 border-t border-white/10">
                  {restoreProgressPercent >= 100 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRestoringJson(false);
                        setRestoreProgressActive(false);
                        setJsonContent('');
                      }}
                      className="w-full py-2.5 rounded-xl border border-amber-400/50 bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
                    >
                      Завершить и закрыть
                    </button>
                  ) : (
                    <div className="text-center text-sm text-white/60 py-1">
                      Пожалуйста, не закрывайте окно до завершения восстановления данных...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* JSON File Upload & Textarea Input View */
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                <div className="p-3 rounded-xl border border-amber-400/40 bg-black/30 text-amber-200 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <span>
                    Внимание: восстановление из JSON перезапишет соответствующие таблицы в текущей базе BD ProTalk. Рекомендуется сначала скачать свежий бэкап.
                  </span>
                </div>

                <div>
                  <input
                    type="file"
                    ref={jsonFileInputRef}
                    accept=".json,application/json"
                    onChange={handleJsonFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonFileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-white/20 hover:border-amber-400/50 bg-black/20 hover:bg-black/30 text-white/80 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>Загрузить JSON файл бэкапа</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-mono text-white/80 mb-1.5">
                    Содержимое JSON бэкапа:
                  </label>
                  <textarea
                    rows={10}
                    placeholder={`{\n  "version": "2.0",\n  "tables": {\n    "users": { ... },\n    "products": { ... }\n  }\n}`}
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    className="w-full p-3 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50 resize-y"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsRestoringJson(false)}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-black/20 hover:border-white/30 text-white/80 text-sm font-medium transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteJsonRestore}
                    disabled={jsonLoading || !jsonContent.trim()}
                    className="px-5 py-2 rounded-xl border border-amber-400/50 bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
                  >
                    {jsonLoading ? 'Восстановление...' : 'Восстановить базу данных'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SystemAdminLayout>
  );
};
export default AdminTablesPage;
