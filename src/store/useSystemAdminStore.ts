import { create } from 'zustand';

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    pk: boolean;
    notNull: boolean;
    defaultValue: any;
  }>;
}

export interface TriggerInfo {
  name: string;
  tableName: string;
  sql: string;
}

export interface CronInfo {
  id: string;
  name: string;
  schedule: string;
  description: string;
  status: string;
  last_run: string | null;
  run_count: number;
}

export interface AuditLog {
  id: number;
  table_name: string;
  action: string;
  record_id: string;
  old_data: string | null;
  new_data: string | null;
  timestamp: string;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm?: () => void;
}

interface SystemAdminState {
  tables: TableInfo[];
  selectedTable: string | null;
  currentTableRows: any[];
  currentTableColumns: any[];
  triggers: TriggerInfo[];
  crons: CronInfo[];
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  
  // Custom Modal Confirmation State (Replaces window.confirm)
  confirmModal: ConfirmModalState;

  // Actions
  fetchTables: () => Promise<void>;
  selectTable: (tableName: string) => Promise<void>;
  fetchTriggers: () => Promise<void>;
  fetchCrons: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  
  // Row CRUD Operations with Modal Confirmation
  deleteRow: (tableName: string, id: string) => Promise<void>;
  deleteRows: (tableName: string, ids: (string | number)[]) => Promise<boolean>;
  updateRow: (tableName: string, id: string, data: any) => Promise<void>;
  addRow: (tableName: string, data: any) => Promise<void>;

  // Database Import / Export / Backup / Restore
  exportTableCsv: (tableName: string) => void;
  importTableCsv: (tableName: string, csvContent: string) => Promise<boolean>;
  exportAllTablesZip: () => void;
  downloadFullJsonBackup: () => void;
  restoreFullJsonBackup: (jsonData: any) => Promise<boolean>;

  // Modal Triggers
  showConfirmModal: (options: Omit<ConfirmModalState, 'isOpen'>) => void;
  closeConfirmModal: () => void;
  clearMessages: () => void;
}

export const useSystemAdminStore = create<SystemAdminState>((set, get) => ({
  tables: [],
  selectedTable: null,
  currentTableRows: [],
  currentTableColumns: [],
  triggers: [],
  crons: [],
  auditLogs: [],
  loading: false,
  error: null,
  successMessage: null,

  confirmModal: {
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Подтвердить',
    danger: false,
  },

  showConfirmModal: (options) => {
    set({
      confirmModal: {
        isOpen: true,
        confirmText: options.confirmText || 'Подтвердить',
        danger: options.danger ?? true,
        ...options,
      },
    });
  },

  closeConfirmModal: () => {
    set((state) => ({
      confirmModal: { ...state.confirmModal, isOpen: false },
    }));
  },

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchTables: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        set({ tables: data.tables, loading: false });
        if (data.tables.length > 0 && !get().selectedTable) {
          get().selectTable(data.tables[0].name);
        }
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  selectTable: async (tableName: string) => {
    set({ selectedTable: tableName, loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}`);
      const data = await res.json();
      if (data.success) {
        set({
          currentTableRows: data.rows,
          currentTableColumns: data.columns,
          loading: false,
        });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchTriggers: async () => {
    try {
      const res = await fetch('/api/admin/triggers');
      const data = await res.json();
      if (data.success) {
        set({ triggers: data.triggers });
      }
    } catch (err) {
      console.error('Error fetching triggers:', err);
    }
  },

  fetchCrons: async () => {
    try {
      const res = await fetch('/api/admin/crons');
      const data = await res.json();
      if (data.success) {
        set({ crons: data.crons });
      }
    } catch (err) {
      console.error('Error fetching crons:', err);
    }
  },

  fetchAuditLogs: async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) {
        set({ auditLogs: data.logs });
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  },

  deleteRow: async (tableName: string, id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}/row/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: `Запись ${id} успешно удалена из таблицы ${tableName}` });
        await get().selectTable(tableName);
        await get().fetchTables();
        await get().fetchAuditLogs();
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteRows: async (tableName: string, ids: (string | number)[]) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}/rows/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: data.message || `Успешно удалено ${ids.length} записей из таблицы ${tableName}` });
        await get().selectTable(tableName);
        await get().fetchTables();
        await get().fetchAuditLogs();
        return true;
      } else {
        set({ error: data.error || 'Ошибка массового удаления', loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateRow: async (tableName: string, id: string, updatedData: any) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}/row/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: `Запись ${id} обновлена` });
        await get().selectTable(tableName);
        await get().fetchAuditLogs();
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addRow: async (tableName: string, rowData: any) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}/row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData),
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: `Новая запись добавлена в таблицу ${tableName}` });
        await get().selectTable(tableName);
        await get().fetchTables();
        await get().fetchAuditLogs();
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  exportTableCsv: (tableName: string) => {
    window.location.href = `/api/admin/table/${tableName}/export/csv`;
  },

  importTableCsv: async (tableName: string, csvContent: string): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${tableName}/import/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent })
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: data.message });
        await get().selectTable(tableName);
        await get().fetchTables();
        await get().fetchAuditLogs();
        return true;
      } else {
        set({ error: data.error || 'Ошибка при импорте CSV', loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  exportAllTablesZip: () => {
    window.location.href = `/api/admin/database/export/zip`;
  },

  downloadFullJsonBackup: () => {
    window.location.href = `/api/admin/database/backup/json`;
  },

  restoreFullJsonBackup: async (jsonData: any): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/database/restore/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });
      const data = await res.json();
      if (data.success) {
        set({ successMessage: data.message });
        const selTable = get().selectedTable;
        await get().fetchTables();
        if (selTable) await get().selectTable(selTable);
        await get().fetchAuditLogs();
        return true;
      } else {
        set({ error: data.error || 'Ошибка при восстановлении базы данных', loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
