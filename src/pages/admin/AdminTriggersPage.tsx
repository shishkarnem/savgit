import React, { useEffect, useState } from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { useSystemAdminStore } from '@/store/useSystemAdminStore';
import { CronScheduleManager } from '@/components/admin/CronScheduleManager';
import {
  Zap,
  RefreshCw,
  Code,
  Shield,
  Activity,
  Clock,
  Settings,
  Layers
} from 'lucide-react';

export const AdminTriggersPage: React.FC = () => {
  const { triggers, fetchTriggers, auditLogs, fetchAuditLogs, loading } = useSystemAdminStore();
  const [activeTab, setActiveTab] = useState<'cron' | 'triggers'>('cron');

  useEffect(() => {
    fetchTriggers();
    fetchAuditLogs();
  }, [fetchTriggers, fetchAuditLogs]);

  return (
    <SystemAdminLayout
      title="Триггеры и Крон-задачи"
      subtitle="Управление периодичностью фоновых задач, расписанием автобэкапов и триггерами BD ProTalk (PostgreSQL)"
      actions={
        <div className="flex items-center gap-3">
          <button
            id="refresh-triggers-btn"
            onClick={() => {
              fetchTriggers();
              fetchAuditLogs();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white/90 hover:text-white transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl backdrop-blur-xl bg-black/30 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('cron')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'cron'
                ? 'backdrop-blur-md bg-white/[0.08] border border-amber-400/50 text-amber-200 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Расписание и Периодичность Cron</span>
            <span className="px-2 py-0.5 rounded-full text-sm font-mono bg-white/[0.05] border border-amber-400/30 text-amber-300">
              06:00 МСК
            </span>
          </button>

          <button
            onClick={() => setActiveTab('triggers')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'triggers'
                ? 'backdrop-blur-md bg-white/[0.08] border border-amber-400/50 text-amber-200 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Триггеры BD ProTalk ({triggers.length})</span>
          </button>
        </div>

        {/* Tab 1: Interactive Cron Schedule & Frequency Manager */}
        {activeTab === 'cron' && (
          <div className="space-y-6">
            <CronScheduleManager />
          </div>
        )}

        {/* Tab 2: ProTalk DB Triggers & Logs */}
        {activeTab === 'triggers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Trigger Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300" />
                  <span>Зарегистрированные триггеры BD ProTalk</span>
                </h2>
                <span className="text-white/60 text-sm font-mono">
                  Статус: Все триггеры активны
                </span>
              </div>

              {triggers.map((trigger, idx) => (
                <div
                  key={trigger.name || idx}
                  id={`trigger-card-${trigger.name}`}
                  className="p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl hover:border-amber-400/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl border border-amber-400/30 bg-black/30 text-amber-300">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white font-mono">{trigger.name}</h3>
                        <p className="text-white/60 text-sm font-mono">Таблица: {trigger.tableName}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl border border-amber-400/40 bg-black/30 text-amber-300 text-sm font-mono flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>Активен</span>
                    </span>
                  </div>

                  {/* SQL View */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 text-sm text-white/70">
                      <Code className="w-4 h-4 text-amber-300" />
                      <span>SQL определение триггера:</span>
                    </div>
                    <pre className="p-3.5 rounded-xl border border-white/10 backdrop-blur-xl bg-black/40 text-amber-200 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                      {trigger.sql || 'CREATE TRIGGER ...'}
                    </pre>
                  </div>
                </div>
              ))}

              {triggers.length === 0 && (
                <div className="p-8 text-center text-white/50 text-sm rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10">
                  Триггеры не найдены или загружаются...
                </div>
              )}
            </div>

            {/* Right: Recent Audit Trigger Activations */}
            <div className="lg:col-span-1 p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl flex flex-col h-[650px]">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
                <Shield className="w-4 h-4 text-amber-300" />
                <h3 className="text-base font-bold text-white">Журнал срабатываний</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {auditLogs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-white/10 backdrop-blur-xl bg-black/20 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-amber-300 font-semibold">{log.action}</span>
                      <span className="text-white/40 text-sm font-mono">{log.timestamp}</span>
                    </div>
                    <div className="text-white/80 font-mono text-sm">
                      Таблица: <span className="text-white font-semibold">{log.table_name}</span> (ID: {log.record_id})
                    </div>
                    {log.new_data && (
                      <div className="mt-1.5 text-white/60 font-mono text-xs truncate">
                        Данные: {log.new_data}
                      </div>
                    )}
                  </div>
                ))}

                {auditLogs.length === 0 && (
                  <div className="p-8 text-center text-white/50 text-sm">
                    Срабатываний триггеров пока нет
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SystemAdminLayout>
  );
};

export default AdminTriggersPage;
