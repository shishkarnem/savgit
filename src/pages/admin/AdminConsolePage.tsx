import React, { useState } from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import {
  Terminal,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  Code,
  FileDown
} from 'lucide-react';

export const AdminConsolePage: React.FC = () => {
  const [sql, setSql] = useState('SELECT relname as name FROM pg_stat_user_tables ORDER BY relname ASC;');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([
    'SELECT relname as name FROM pg_stat_user_tables ORDER BY relname ASC;',
    'SELECT * FROM marketplace_products LIMIT 10;',
    'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10;',
    'SELECT count(*) as total_users FROM users;'
  ]);

  const snippets = [
    { label: 'Все таблицы BD ProTalk', query: 'SELECT relname as name FROM pg_stat_user_tables ORDER BY relname ASC;' },
    { label: '10 товаров маркетплейса', query: 'SELECT id, name, category, price FROM marketplace_products LIMIT 10;' },
    { label: 'Структура таблицы users', query: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'users\';' },
    { label: 'Свежие логи аудита', query: 'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15;' },
    { label: 'Количество записей по таблицам', query: 'SELECT relname as tbl, n_live_tup as cnt FROM pg_stat_user_tables ORDER BY relname ASC;' }
  ];

  const handleRunQuery = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setColumns([]);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sql.trim() })
      });
      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (data.success) {
        setResults(data.rows || []);
        if (data.rows && data.rows.length > 0) {
          setColumns(Object.keys(data.rows[0]));
        }
        // Add to history if unique
        if (!history.includes(sql.trim())) {
          setHistory(prev => [sql.trim(), ...prev.slice(0, 9)]);
        }
      } else {
        setError(data.error || 'Ошибка выполнения SQL запроса');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SystemAdminLayout
      title="SQL консоль"
      subtitle="Прямое выполнение запросов к базе данных BD ProTalk (PostgreSQL)"
      actions={
        <button
          id="run-sql-top-btn"
          onClick={handleRunQuery}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400/50 backdrop-blur-xl bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
        >
          <Play className={`w-4 h-4 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Выполнение...' : 'Выполнить (Ctrl+Enter)'}</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Editor & Snippets */}
        <div className="lg:col-span-3 space-y-6">
          {/* SQL Editor Box */}
          <div className="p-5 sm:p-6 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-amber-300" />
                <span className="font-semibold text-sm">SQL запрос (PostgreSQL BD ProTalk)</span>
              </div>
              <button
                onClick={() => setSql('')}
                className="text-white/50 hover:text-white text-sm flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Очистить</span>
              </button>
            </div>

            <textarea
              id="sql-query-editor"
              rows={6}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleRunQuery();
                }
              }}
              placeholder="Введите любой SQL запрос, например: SELECT * FROM marketplace_products LIMIT 10;"
              className="w-full p-4 rounded-xl backdrop-blur-xl bg-black/40 border border-white/15 text-amber-200 font-mono text-sm leading-relaxed focus:outline-none focus:border-amber-400/50 shadow-inner resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/10">
              <div className="text-white/50 text-sm font-mono">
                {executionTime !== null && (
                  <span className="text-amber-300 mr-4">⏱ Время: {executionTime} мс</span>
                )}
                {results !== null && (
                  <span className="text-white/80">Строк получено: {results.length}</span>
                )}
              </div>
              <button
                id="execute-query-btn"
                onClick={handleRunQuery}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-amber-400/50 backdrop-blur-xl bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
              >
                <Play className="w-4 h-4 text-amber-300" />
                <span>Выполнить запрос</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div className="p-5 sm:p-6 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl min-h-[300px]">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-300" />
              <span>Результат выполнения</span>
            </h3>

            {error && (
              <div className="p-4 rounded-xl backdrop-blur-2xl bg-black/30 border border-amber-400/50 text-white text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300 mb-1">Ошибка SQL:</div>
                  <div className="font-mono text-white/90">{error}</div>
                </div>
              </div>
            )}

            {results !== null && (
              <div className="overflow-x-auto border border-white/10 rounded-xl max-h-[450px] scrollbar-thin">
                <table className="w-full text-left text-sm border-collapse font-mono">
                  <thead className="sticky top-0 backdrop-blur-2xl bg-black/70 border-b border-white/10 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="p-3 text-amber-300 font-semibold whitespace-nowrap text-sm">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {results.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03]">
                        {columns.map((col) => {
                          const val = row[col];
                          let display = val === null || val === undefined ? 'NULL' : String(val);
                          return (
                            <td key={col} className="p-3 text-white/80 text-sm max-w-sm truncate">
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {results.length === 0 && (
                      <tr>
                        <td colSpan={columns.length || 1} className="p-8 text-center text-white/50 text-sm font-sans">
                          Запрос выполнен успешно. 0 строк возвращено.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {results === null && !error && (
              <div className="p-12 text-center text-white/40 text-sm">
                Введите SQL запрос и нажмите "Выполнить" для отображения таблицы результатов.
              </div>
            )}
          </div>
        </div>

        {/* Right: Snippets & History */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Snippets */}
          <div className="p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-amber-300" />
              <span>Шаблоны запросов</span>
            </h3>
            <div className="space-y-2">
              {snippets.map((snip, idx) => (
                <button
                  key={idx}
                  onClick={() => setSql(snip.query)}
                  className="w-full text-left p-2.5 rounded-xl border border-white/10 bg-black/20 hover:border-amber-400/30 text-white/80 hover:text-white transition-all text-sm"
                >
                  <div className="font-medium text-white text-sm">{snip.label}</div>
                  <div className="font-mono text-white/40 text-xs truncate mt-0.5">{snip.query}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Query History */}
          <div className="p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>История запросов</span>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {history.map((hist, idx) => (
                <button
                  key={idx}
                  onClick={() => setSql(hist)}
                  className="w-full text-left p-2.5 rounded-xl border border-white/10 bg-black/20 hover:border-amber-400/30 text-white/70 hover:text-amber-200 transition-all font-mono text-xs truncate"
                >
                  {hist}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SystemAdminLayout>
  );
};
