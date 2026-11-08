import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Power,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import Rivets from '../Rivets';

export interface CronTask {
  id: string;
  name: string;
  schedule: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'RUNNING';
  last_run?: string;
  run_count: number;
  created_at?: string;
}

const CRON_PRESETS = [
  { label: 'Каждый день в 06:00 МСК (03:00 UTC)', value: '0 3 * * *', description: 'Оптимально для автобэкапа базы данных' },
  { label: 'Каждый день в 00:00 (Полночь)', value: '0 0 * * *', description: 'Ежесуточная синхронизация' },
  { label: 'Каждый час в 00 минут', value: '0 * * * *', description: 'Регулярная синхронизация' },
  { label: 'Каждые 30 минут', value: '*/30 * * * *', description: 'Частая проверка обновлений' },
  { label: 'Каждые 15 минут', value: '*/15 * * * *', description: 'Периодический опрос систем' },
  { label: 'Каждые 5 минут', value: '*/5 * * * *', description: 'Быстрый мониторинг и пинг' },
  { label: 'Каждое воскресенье в 02:00', value: '0 2 * * 0', description: 'Очистка системных логов' },
  { label: 'Каждый понедельник в 09:00', value: '0 9 * * 1', description: 'Еженедельный отчет' },
  { label: 'Пользовательское Cron-выражение', value: 'custom', description: 'Ручная настройка 5 полей cron' }
];

export const CronScheduleManager: React.FC = () => {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  // Add task state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSchedule, setNewSchedule] = useState('0 3 * * *');
  const [newDescription, setNewDescription] = useState('');

  // Status & Notification feedback
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchCrons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crons');
      const data = await res.json();
      if (data.success && Array.isArray(data.crons)) {
        setTasks(data.crons);
      }
    } catch (err: any) {
      console.error('Failed to fetch cron tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const handleStartEdit = (task: CronTask) => {
    setEditingTaskId(task.id);
    setEditName(task.name);
    setEditSchedule(task.schedule);
    setEditDescription(task.description || '');

    const matchingPreset = CRON_PRESETS.find(p => p.value === task.schedule);
    setSelectedPreset(matchingPreset ? matchingPreset.value : 'custom');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handlePresetSelect = (presetVal: string) => {
    setSelectedPreset(presetVal);
    if (presetVal !== 'custom') {
      setEditSchedule(presetVal);
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/crons/${taskId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          schedule: editSchedule,
          description: editDescription
        })
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({ text: data.message || 'Расписание успешно обновлено!', type: 'success' });
        setEditingTaskId(null);
        fetchCrons();
      } else {
        setStatusMessage({ text: data.message || data.error || 'Ошибка обновления', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Сбой запроса: ${err.message}`, type: 'error' });
    }
  };

  const handleToggleStatus = async (taskId: string) => {
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/crons/${taskId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        fetchCrons();
      } else {
        setStatusMessage({ text: data.message || data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Сбой запроса: ${err.message}`, type: 'error' });
    }
  };

  const handleRunNow = async (taskId: string, taskName: string) => {
    setRunningTaskId(taskId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/crons/${taskId}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `Задача "${taskName}" выполнена: ${data.message}`,
          type: 'success'
        });
        fetchCrons();
      } else {
        setStatusMessage({
          text: `Ошибка запуска задачи "${taskName}": ${data.message || data.error}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Сбой выполнения: ${err.message}`, type: 'error' });
    } finally {
      setRunningTaskId(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSchedule.trim()) return;

    try {
      const res = await fetch('/api/admin/crons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          schedule: newSchedule,
          description: newDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message || 'Задача успешно создана!', type: 'success' });
        setShowAddModal(false);
        setNewName('');
        setNewDescription('');
        setNewSchedule('0 3 * * *');
        fetchCrons();
      } else {
        setStatusMessage({ text: data.message || data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Ошибка создания: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!confirm(`Вы действительно хотите удалить задачу "${taskName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/crons/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        fetchCrons();
      } else {
        setStatusMessage({ text: data.message || data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Ошибка удаления: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
      <Rivets />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-amber-400/40 text-amber-300 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent">
              Управление расписанием и крон-задачами
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Настройка периодичности, времени запуска, фоновых триггеров и моментального тестирования
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 text-sm text-amber-200 backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.08] border border-amber-400/40 px-4 py-2.5 rounded-xl transition-all font-semibold"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Добавить задачу
          </button>
          <button
            onClick={fetchCrons}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-300 backdrop-blur-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 px-3.5 py-2.5 rounded-xl transition-all"
          >
            <RotateCcw className={`w-4 h-4 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div
          className={`relative z-10 p-4 backdrop-blur-xl rounded-2xl border flex items-start justify-between gap-3 text-sm shadow-lg ${
            statusMessage.type === 'success'
              ? 'bg-black/30 border-amber-400/40 text-amber-200'
              : 'bg-black/30 border-white/20 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Task Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-5">
        {tasks.map((task) => {
          const isEditing = editingTaskId === task.id;
          const isRunning = runningTaskId === task.id;
          const isActive = task.status === 'ACTIVE';

          return (
            <div
              key={task.id}
              className={`p-6 rounded-2xl border transition-all backdrop-blur-xl ${
                isEditing
                  ? 'bg-black/40 border-amber-400/60 shadow-xl shadow-amber-500/10'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              {isEditing ? (
                /* EDIT MODE FORM */
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-base font-bold text-amber-300 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Редактирование задачи: {task.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {task.id}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-200">Название задачи:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-200">Выберите готовый шаблон периодичности:</label>
                      <select
                        value={selectedPreset}
                        onChange={(e) => handlePresetSelect(e.target.value)}
                        className="w-full backdrop-blur-md bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60"
                      >
                        {CRON_PRESETS.map((p) => (
                          <option key={p.value} value={p.value} className="bg-slate-900 text-white">
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                        <span>Cron-выражение:</span>
                        <span className="text-xs text-amber-300 font-mono">5 полей: мин час день мес день_нед</span>
                      </label>
                      <input
                        type="text"
                        value={editSchedule}
                        onChange={(e) => {
                          setEditSchedule(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        placeholder="0 3 * * *"
                        className="w-full font-mono backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-amber-300 focus:outline-none focus:border-amber-400/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-200">Описание задачи:</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Краткое назначение задачи"
                        className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60"
                      />
                    </div>
                  </div>

                  {/* Actions for Edit */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => handleSaveEdit(task.id)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl backdrop-blur-md bg-white/[0.06] hover:bg-white/[0.1] border border-amber-400/50 text-amber-200 text-sm font-bold shadow-lg transition"
                    >
                      <Save className="w-4 h-4 text-amber-300" />
                      Сохранить расписание
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW MODE CARD */
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <span>{task.name}</span>
                      </h3>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono border flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-white/[0.05] border-amber-400/40 text-amber-300'
                            : 'bg-white/[0.02] border-white/10 text-slate-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-300 animate-pulse' : 'bg-slate-500'}`} />
                        {isActive ? 'АКТИВЕН' : 'ПРИОСТАНОВЛЕН'}
                      </span>

                      <span className="text-xs font-mono text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/10">
                        ID: {task.id}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      {task.description || 'Фоновая автоматическая задача'}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-slate-400">Расписание:</span>
                        <span className="text-amber-300 font-bold">{task.schedule}</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-slate-400">Последний запуск:</span>
                        <span className="text-white">{task.last_run ? new Date(task.last_run).toLocaleString('ru-RU') : 'Еще не запускалась'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                        <Layers className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-slate-400">Всего запусков:</span>
                        <span className="text-white font-bold">{task.run_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Task Controls */}
                  <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                    <button
                      onClick={() => handleRunNow(task.id, task.name)}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.08] border border-amber-400/40 text-amber-200 hover:text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
                      title="Выполнить задачу немедленно"
                    >
                      <Play className={`w-4 h-4 text-amber-300 ${isRunning ? 'animate-spin' : ''}`} />
                      <span>{isRunning ? 'Выполнение...' : 'Запустить сейчас'}</span>
                    </button>

                    <button
                      onClick={() => handleStartEdit(task)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl backdrop-blur-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/15 text-slate-200 hover:text-white text-sm transition-all"
                      title="Изменить расписание и время"
                    >
                      <Edit3 className="w-4 h-4 text-amber-300" />
                      <span>Изменить</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(task.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl backdrop-blur-md border text-sm transition-all ${
                        isActive
                          ? 'bg-white/[0.02] border-white/15 text-slate-300 hover:text-amber-200'
                          : 'bg-amber-500/10 border-amber-400/40 text-amber-300 hover:bg-amber-500/20'
                      }`}
                      title={isActive ? 'Приостановить задачу' : 'Активировать задачу'}
                    >
                      <Power className="w-4 h-4 text-amber-300" />
                      <span>{isActive ? 'Пауза' : 'Включить'}</span>
                    </button>

                    {task.id.startsWith('cron_custom_') && (
                      <button
                        onClick={() => handleDeleteTask(task.id, task.name)}
                        className="p-2.5 rounded-xl backdrop-blur-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-slate-400 hover:text-white transition-all"
                        title="Удалить пользовательскую задачу"
                      >
                        <Trash2 className="w-4 h-4 text-amber-300" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-400 text-sm rounded-2xl backdrop-blur-xl bg-black/20 border border-white/10">
            Задачи не найдены или загружаются...
          </div>
        )}
      </div>

      {/* ADD NEW TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-3xl backdrop-blur-2xl bg-black/85 border border-amber-400/40 p-6 md:p-8 shadow-2xl space-y-5 text-white">
            <Rivets />

            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-300" />
                Новая фоновая Cron-задача
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200">Название задачи:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Ночной аудит и резервирование"
                  required
                  className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200">Шаблон частоты:</label>
                <select
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className="w-full backdrop-blur-md bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400/60"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value === 'custom' ? '0 3 * * *' : p.value}>
                      {p.label} ({p.value})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200">Cron выражение (5 полей):</label>
                <input
                  type="text"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  required
                  placeholder="0 3 * * *"
                  className="w-full font-mono backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-amber-300 focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200">Описание задачи:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Например: Автоматический экспорт и запись логов"
                  className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl backdrop-blur-md bg-white/[0.06] hover:bg-white/[0.1] border border-amber-400/50 text-amber-200 text-sm font-bold shadow-lg transition"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  Создать задачу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CronScheduleManager;
