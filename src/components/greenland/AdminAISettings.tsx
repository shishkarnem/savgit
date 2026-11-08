import React, { useState, useEffect } from 'react';
import { Bot, Save, RefreshCw, Check, AlertCircle, Settings, Zap, Shield, Copy, PlusCircle, Trash2, X } from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';

interface AIAgentConfig {
  id: string;
  agent_key: string;
  label: string;
  model: string;
  fallback_model: string | null;
  fallback_provider: string;
  active_model_override: string | null;
  last_fallback_at: string | null;
  system_prompt: string;
  temperature: number;
  gateway_url: string;
  is_active: boolean;
  extra_config: Record<string, any>;
  provider: string;
  bot_id?: string;
  employee_id?: string;
  api_token?: string;
  bot_token?: string;
}

const AVAILABLE_PROVIDERS = [
  { value: 'lovable_gateway', label: 'Lovable AI Gateway', desc: 'шлюз с поддержкой стриминга' },
  { value: 'protalk', label: 'ProTalk API', desc: 'автономный сервис ProTalk' },
  { value: 'openai', label: 'OpenAI Direct API', desc: 'прямой доступ к моделям OpenAI' },
];

const AVAILABLE_MODELS = [
  { value: 'protalk/bot-72220', label: 'ProTalk Bot 72220 (основной)', desc: 'интегрированный агент ProTalk' },
  { value: 'protalk/function-369', label: 'ProTalk Doc Parser (369)', desc: 'распознавание документов и таблиц' },
  { value: 'protalk/function-621', label: 'ProTalk Functions Base (621)', desc: 'база знаний и crm' },
  { value: 'openai/gpt-5', label: 'GPT-5 (шлюз)', desc: 'флагманская языковая модель' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', desc: 'быстрая и экономичная модель' },
  { value: 'gpt-4o', label: 'GPT-4o', desc: 'мультимодальная модель' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'компактная модель' },
];

const AGENT_ICONS: Record<string, string> = {
  'ai-chat': '💬',
  'ai-agent': '📄',
  'protalk': '🤖',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'ai-chat': 'Чат-виджет на сайте (пресс-секретарь). Консультирует посетителей по государственным и правовым вопросам.',
  'ai-agent': 'AI-агент Министерства юстиции. Ведет сбор реквизитов, распознает сканы документов и формирует договоры.',
  'protalk': 'ProTalk AI Core Bot. Автономный классификатор бизнеса, подбор архитектурных решений и продавец.',
};

const DEFAULT_AGENTS_SEED: AIAgentConfig[] = [
  {
    id: 'cfg_ai_chat',
    agent_key: 'ai-chat',
    label: 'Чат-виджет на сайте (пресс-секретарь)',
    provider: 'lovable_gateway',
    model: 'openai/gpt-5-mini',
    fallback_model: 'protalk/bot-72220',
    fallback_provider: 'protalk',
    gateway_url: 'https://ai.gateway.lovable.dev/v1',
    active_model_override: null,
    last_fallback_at: null,
    temperature: 0.7,
    is_active: true,
    system_prompt: 'Ты — официальный виртуальный пресс-секретарь и консультант. Отвечай вежливо, структурированно и четко на основе законодательства и базы знаний.',
    extra_config: { max_tokens: 2048, top_p: 0.9, presence_penalty: 0.1 },
  },
  {
    id: 'cfg_ai_agent',
    agent_key: 'ai-agent',
    label: 'AI-агент Министерства юстиции и договоров',
    provider: 'protalk',
    model: 'protalk/function-369',
    fallback_model: 'openai/gpt-5',
    fallback_provider: 'lovable_gateway',
    gateway_url: 'https://api.pro-talk.ru',
    active_model_override: null,
    last_fallback_at: null,
    temperature: 0.3,
    is_active: true,
    bot_id: '72220',
    employee_id: '72220',
    system_prompt: 'Ты — автономный юридический AI-агент. Веди сбор реквизитов, распознавание документов, проверку корректности ИНН/ОГРН и автоматическое формирование договоров.',
    extra_config: { max_tokens: 4096, top_p: 0.95, timeout: 300 },
  },
  {
    id: 'cfg_protalk_main',
    agent_key: 'protalk',
    label: 'ProTalk AI Core Bot (SAV AI)',
    provider: 'protalk',
    model: 'protalk/bot-72220',
    fallback_model: 'openai/gpt-5',
    fallback_provider: 'lovable_gateway',
    gateway_url: 'https://api.pro-talk.ru',
    active_model_override: null,
    last_fallback_at: null,
    temperature: 0.5,
    is_active: true,
    bot_id: '72220',
    employee_id: '72220',
    system_prompt: 'Ты — ведущий системный архитектор и автономный ИИ-продавец SAV AI ProTalk. Классифицируй бизнес, формируй архитектуру и подбирай решения.',
    extra_config: { bot_id: 72220, employee_id: 72220, gateway_url: 'https://api.pro-talk.ru', timeout: 300, poll_interval: 1 },
  },
];

const EXTRA_CONFIG_EXAMPLE = {
  max_tokens: 4096,
  top_p: 0.9,
  top_k: 40,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  stop: ["\n\n"],
  response_format: { type: "text" },
};

const PROTALK_CONFIG_EXAMPLE = {
  protalk_token: "BIUTUa499JhVgwmcsY6tRLy4WExXuSX6",
  protalk_bot_id: 72220,
  employee_id: 72220,
};

export const AdminAISettings: React.FC = () => {
  const [configs, setConfigs] = useState<AIAgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [editedConfigs, setEditedConfigs] = useState<Record<string, Partial<AIAgentConfig>>>({});
  const [extraJsonStrings, setExtraJsonStrings] = useState<Record<string, string>>({});
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    agent_key: '',
    label: '',
    provider: 'protalk',
    model: 'protalk/bot-72220',
    temperature: 0.7,
    gateway_url: 'https://api.pro-talk.ru',
    system_prompt: '',
  });

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await protalkDb.from('ai_agent_configs' as any).select('*').order('created_at');
      if (data && data.length > 0) {
        const parsedData = (data as any[]).map(c => {
          let extra = c.extra_config;
          if (typeof extra === 'string') {
            try { extra = JSON.parse(extra); } catch { extra = {}; }
          }
          return {
            ...c,
            is_active: Boolean(c.is_active === 1 || c.is_active === true),
            extra_config: extra || {},
          };
        });
        setConfigs(parsedData);
        const jsonStrs: Record<string, string> = {};
        for (const c of parsedData) {
          jsonStrs[c.id] = JSON.stringify(c.extra_config || {}, null, 2);
        }
        setExtraJsonStrings(jsonStrs);
      } else {
        // Auto-seed default agents if table is empty
        for (const agent of DEFAULT_AGENTS_SEED) {
          await protalkDb.from('ai_agent_configs' as any).insert({
            ...agent,
            is_active: agent.is_active ? 1 : 0,
            extra_config: JSON.stringify(agent.extra_config),
          });
        }
        setConfigs(DEFAULT_AGENTS_SEED);
        const jsonStrs: Record<string, string> = {};
        for (const c of DEFAULT_AGENTS_SEED) {
          jsonStrs[c.id] = JSON.stringify(c.extra_config || {}, null, 2);
        }
        setExtraJsonStrings(jsonStrs);
      }
    } catch (err) {
      console.error('Failed to load AI agent configs:', err);
      setConfigs(DEFAULT_AGENTS_SEED);
    } finally {
      setLoading(false);
      setEditedConfigs({});
    }
  };

  useEffect(() => { loadConfigs(); }, []);

  const getEdited = (config: AIAgentConfig): AIAgentConfig => {
    return { ...config, ...(editedConfigs[config.id] || {}) };
  };

  const updateField = (id: string, field: string, value: any) => {
    setEditedConfigs(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const handleExtraJsonChange = (id: string, value: string) => {
    setExtraJsonStrings(prev => ({ ...prev, [id]: value }));
    try {
      const parsed = JSON.parse(value);
      updateField(id, 'extra_config', parsed);
    } catch {
      // allow typing
    }
  };

  const resetFallback = async (config: AIAgentConfig) => {
    await protalkDb.from('ai_agent_configs' as any).update({ active_model_override: null, last_fallback_at: null } as any).eq('id', config.id);
    loadConfigs();
  };

  const saveConfig = async (config: AIAgentConfig) => {
    const edited = editedConfigs[config.id];
    if (!edited) return;
    setSaving(config.id);
    try {
      const merged = { ...config, ...edited };
      const { id, created_at, updated_at, ...rest } = merged as any;
      const updatePayload = {
        ...rest,
        is_active: rest.is_active ? 1 : 0,
        extra_config: typeof rest.extra_config === 'object' ? JSON.stringify(rest.extra_config) : rest.extra_config,
      };
      await protalkDb.from('ai_agent_configs' as any).update(updatePayload).eq('id', id);
      setSaved(config.id);
      setTimeout(() => setSaved(null), 2500);
      setEditedConfigs(prev => { const n = { ...prev }; delete n[config.id]; return n; });
      loadConfigs();
    } catch (e) {
      console.error('Failed to save config:', e);
    } finally {
      setSaving(null);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('Удалить конфигурацию этого агента?')) return;
    try {
      await protalkDb.from('ai_agent_configs' as any).delete().eq('id', id);
      loadConfigs();
    } catch (e) {
      console.error('Failed to delete config:', e);
    }
  };

  const createAgent = async () => {
    if (!newAgent.label.trim() || !newAgent.agent_key.trim()) return;
    try {
      const id = `cfg_${newAgent.agent_key.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`;
      await protalkDb.from('ai_agent_configs' as any).insert({
        id,
        agent_key: newAgent.agent_key.trim(),
        label: newAgent.label.trim(),
        provider: newAgent.provider,
        model: newAgent.model,
        fallback_model: 'openai/gpt-5-mini',
        fallback_provider: 'lovable_gateway',
        gateway_url: newAgent.gateway_url,
        temperature: newAgent.temperature,
        is_active: 1,
        system_prompt: newAgent.system_prompt,
        extra_config: JSON.stringify({}),
      });
      setIsNewAgentModalOpen(false);
      setNewAgent({
        agent_key: '',
        label: '',
        provider: 'protalk',
        model: 'protalk/bot-72220',
        temperature: 0.7,
        gateway_url: 'https://api.pro-talk.ru',
        system_prompt: '',
      });
      loadConfigs();
    } catch (e) {
      console.error('Failed to create agent:', e);
    }
  };

  const hasChanges = (id: string) => !!editedConfigs[id] && Object.keys(editedConfigs[id]).length > 0;

  const getActiveModel = (config: AIAgentConfig) => {
    const edited = getEdited(config);
    return edited.active_model_override || edited.model;
  };

  const isOnFallback = (config: AIAgentConfig) => !!config.active_model_override;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={22} className="animate-spin text-amber-400" />
        <span className="ml-3 text-sm text-zinc-300">Загрузка настроек ИИ-агентов из базы данных...</span>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto p-2 sm:p-4 space-y-6 custom-scrollbar">
      {/* Top Header Card */}
      <div className="liquid-bubble-secondary rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-lg relative overflow-hidden">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="slow" opacity={0.25} className="-top-2 -left-2 w-[calc(100%+16px)] h-[60px]" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-xl liquid-bubble-secondary border border-amber-400/35 flex items-center justify-center shadow-md">
            <Bot size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
              Настройки ИИ-агентов
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              Синхронизировано с российской базой данных BD ProTalk: провайдеры, модели, системные промпты и параметры
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={() => setIsNewAgentModalOpen(true)}
            className="liquid-bubble-gold text-amber-950 font-bold px-4 py-2.5 rounded-xl text-sm border border-amber-300 shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <span className="liquid-bubble-glare" />
            <PlusCircle size={16} />
            <span>Добавить агента</span>
          </button>
          <button
            onClick={loadConfigs}
            className="liquid-bubble-secondary text-zinc-200 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/15 hover:border-amber-400/40 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <span className="liquid-bubble-glare" />
            <RefreshCw size={15} className="text-amber-400" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Agents List */}
      {configs.map(config => {
        const edited = getEdited(config);
        const changed = hasChanges(config.id);
        const activeModel = getActiveModel(config);
        const onFallback = isOnFallback(config);
        const modelInfo = AVAILABLE_MODELS.find(m => m.value === activeModel);

        return (
          <div key={config.id} className="liquid-bubble-plate border border-amber-400/30 rounded-2xl overflow-hidden shadow-2xl relative">
            <span className="liquid-bubble-glare" />
            <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-2 -left-2 w-[calc(100%+16px)] h-[70px]" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 relative z-10 bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{AGENT_ICONS[config.agent_key] || '🤖'}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-100 text-base">{edited.label || config.label}</h3>
                    <span className="text-sm font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      {config.agent_key}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5 truncate">{AGENT_DESCRIPTIONS[config.agent_key] || config.agent_key}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-zinc-300">{edited.is_active ? 'Активен' : 'Отключен'}</span>
                  <button
                    type="button"
                    onClick={() => updateField(config.id, 'is_active', !edited.is_active)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${edited.is_active ? 'liquid-bubble-gold border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-zinc-800 border border-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${edited.is_active ? 'left-5 bg-amber-950' : 'left-0.5 bg-zinc-400'}`} />
                  </button>
                </label>
                {changed && (
                  <button
                    onClick={() => saveConfig(config)}
                    disabled={saving === config.id}
                    className="liquid-bubble-gold text-amber-950 font-bold px-4 py-2 rounded-xl text-sm border border-amber-300 shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="liquid-bubble-glare" />
                    {saving === config.id ? <RefreshCw size={15} className="animate-spin text-amber-950" /> : <Save size={15} className="text-amber-950" />}
                    <span>Сохранить в базу</span>
                  </button>
                )}
                {saved === config.id && (
                  <span className="text-sm text-amber-300 font-medium flex items-center gap-1.5"><Check size={16} /> Сохранено</span>
                )}
                <button
                  onClick={() => deleteConfig(config.id)}
                  title="Удалить конфигурацию"
                  className="p-2 rounded-xl liquid-bubble-secondary border border-white/10 text-zinc-400 hover:text-white hover:border-amber-400/40 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Active Provider & Model Badge */}
            <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium liquid-bubble-secondary text-amber-300 border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Провайдер: {AVAILABLE_PROVIDERS.find(p => p.value === (edited.provider || 'lovable_gateway'))?.label || edited.provider}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium liquid-bubble-secondary text-zinc-200 border border-white/15">
                <span className={`w-2 h-2 rounded-full ${onFallback ? 'bg-amber-400 animate-pulse' : 'bg-amber-300'}`} />
                <span>Модель: {modelInfo?.label || activeModel}</span>
                {onFallback && (
                  <>
                    <span className="text-sm opacity-70">(резервная)</span>
                    <button onClick={() => resetFallback(config)} className="ml-1 underline text-sm text-amber-300 hover:text-amber-200">Сбросить</button>
                  </>
                )}
              </div>
              {edited.bot_id && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium liquid-bubble-secondary text-amber-200 border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Идентификатор бота: {edited.bot_id}</span>
                </div>
              )}
            </div>
            {onFallback && config.last_fallback_at && (
              <div className="px-5 pb-2 relative z-10">
                <p className="text-sm text-amber-300 font-medium">
                  Переключено на резерв: {new Date(config.last_fallback_at).toLocaleString('ru-RU')}
                </p>
              </div>
            )}

            {/* Body Form */}
            <div className="p-5 space-y-5 relative z-10">
              {/* Agent Label */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">
                    Отображаемое название
                  </label>
                  <input
                    type="text"
                    value={edited.label || ''}
                    onChange={e => updateField(config.id, 'label', e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">
                    Системный ключ (ID агента)
                  </label>
                  <input
                    type="text"
                    value={config.agent_key}
                    disabled
                    className="w-full bg-zinc-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-400 font-mono outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Provider & Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Settings size={15} className="text-amber-400" /> Провайдер ИИ
                  </label>
                  <select
                    value={edited.provider || 'protalk'}
                    onChange={e => updateField(config.id, 'provider', e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition-all"
                  >
                    {AVAILABLE_PROVIDERS.map(p => (
                      <option key={p.value} value={p.value} className="bg-zinc-900 text-white">{p.label} — {p.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Zap size={15} className="text-amber-400" /> Основная модель
                  </label>
                  <input
                    type="text"
                    list={`models-${config.id}`}
                    value={edited.model || ''}
                    onChange={e => updateField(config.id, 'model', e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none backdrop-blur-md"
                    placeholder="Выберите или введите название модели"
                  />
                  <datalist id={`models-${config.id}`}>
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* ProTalk specific parameters */}
              {(edited.provider === 'protalk' || edited.agent_key === 'protalk') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl liquid-bubble-secondary border border-amber-400/20">
                  <div>
                    <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Идентификатор бота</label>
                    <input
                      type="text"
                      value={edited.bot_id || ''}
                      onChange={e => updateField(config.id, 'bot_id', e.target.value)}
                      placeholder="72220"
                      className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">ID сотрудника</label>
                    <input
                      type="text"
                      value={edited.employee_id || ''}
                      onChange={e => updateField(config.id, 'employee_id', e.target.value)}
                      placeholder="72220"
                      className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Адрес шлюза ProTalk</label>
                    <input
                      type="text"
                      value={edited.gateway_url || 'https://api.pro-talk.ru'}
                      onChange={e => updateField(config.id, 'gateway_url', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Fallbacks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Shield size={15} className="text-amber-400" /> Резервный провайдер
                  </label>
                  <select
                    value={edited.fallback_provider || 'lovable_gateway'}
                    onChange={e => updateField(config.id, 'fallback_provider', e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition-all"
                  >
                    {AVAILABLE_PROVIDERS.map(p => (
                      <option key={p.value} value={p.value} className="bg-zinc-900 text-white">{p.label} — {p.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Shield size={15} className="text-amber-400" /> Резервная модель
                  </label>
                  <input
                    type="text"
                    list={`fallback-models-${config.id}`}
                    value={edited.fallback_model || ''}
                    onChange={e => updateField(config.id, 'fallback_model', e.target.value || null)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none backdrop-blur-md"
                    placeholder="Резервная модель (на случай сбоев)"
                  />
                  <datalist id={`fallback-models-${config.id}`}>
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Gateway URL for Gateway Provider */}
              {edited.provider === 'lovable_gateway' && (
                <div>
                  <label className="text-sm font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Settings size={15} className="text-amber-400" /> Адрес шлюза
                  </label>
                  <input
                    type="text"
                    value={edited.gateway_url || ''}
                    onChange={e => updateField(config.id, 'gateway_url', e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none font-mono backdrop-blur-md"
                  />
                </div>
              )}

              {/* Temperature */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold text-zinc-300">
                    Температура генерации: <span className="text-amber-300 font-bold font-mono">{edited.temperature ?? 0.7}</span>
                  </label>
                  <span className="text-sm text-zinc-400">
                    {(edited.temperature ?? 0.7) < 0.4 ? 'точный и строгий' : (edited.temperature ?? 0.7) < 0.9 ? 'сбалансированный' : 'творческий'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={edited.temperature ?? 0.7}
                  onChange={e => updateField(config.id, 'temperature', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={15} className="text-amber-400" /> Системный промпт агента
                </label>
                <textarea
                  value={edited.system_prompt || ''}
                  onChange={e => updateField(config.id, 'system_prompt', e.target.value)}
                  rows={6}
                  placeholder="Инструкции и контекст поведения агента..."
                  className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none font-mono leading-relaxed resize-y backdrop-blur-md transition-all"
                />
              </div>

              {/* Extra Config JSON */}
              <div>
                <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                  Дополнительные параметры (JSON)
                </label>
                <textarea
                  value={extraJsonStrings[config.id] ?? JSON.stringify(edited.extra_config || {}, null, 2)}
                  onChange={e => handleExtraJsonChange(config.id, e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none font-mono resize-y backdrop-blur-md transition-all"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* New Agent Modal */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="liquid-bubble-plate border border-amber-400/30 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90%] flex flex-col overflow-hidden relative">
            <span className="liquid-bubble-glare" />
            <div className="p-5 border-b border-white/10 flex justify-between items-center liquid-bubble-secondary relative z-10">
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                <PlusCircle size={18} className="text-amber-400" /> Новый ИИ-агент
              </h3>
              <button onClick={() => setIsNewAgentModalOpen(false)} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Название агента</label>
                <input
                  type="text"
                  placeholder="например: AI-аналитик продаж"
                  value={newAgent.label}
                  onChange={e => setNewAgent({ ...newAgent, label: e.target.value })}
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Ключ агента (латиница)</label>
                  <input
                    type="text"
                    placeholder="ai-sales-analyst"
                    value={newAgent.agent_key}
                    onChange={e => setNewAgent({ ...newAgent, agent_key: e.target.value })}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Провайдер</label>
                  <select
                    value={newAgent.provider}
                    onChange={e => setNewAgent({ ...newAgent, provider: e.target.value })}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                  >
                    {AVAILABLE_PROVIDERS.map(p => (
                      <option key={p.value} value={p.value} className="bg-zinc-900 text-white">{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Модель</label>
                <input
                  type="text"
                  value={newAgent.model}
                  onChange={e => setNewAgent({ ...newAgent, model: e.target.value })}
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Системный промпт</label>
                <textarea
                  rows={4}
                  value={newAgent.system_prompt}
                  onChange={e => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
                  placeholder="Опишите роль и правила поведения агента..."
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none resize-y"
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3 liquid-bubble-secondary relative z-10">
              <button
                onClick={() => setIsNewAgentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl liquid-bubble-secondary border border-white/15 text-zinc-300 hover:text-white text-sm font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={createAgent}
                disabled={!newAgent.label || !newAgent.agent_key}
                className="px-5 py-2.5 rounded-xl liquid-bubble-gold text-amber-950 border border-amber-300 text-sm font-bold shadow-md cursor-pointer disabled:opacity-40"
              >
                Создать агента
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Template Examples */}
      <div className="liquid-bubble-secondary rounded-2xl p-5 border border-white/10 relative overflow-hidden shadow-lg space-y-4">
        <span className="liquid-bubble-glare" />
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            Шаблон параметров JSON
          </h3>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(EXTRA_CONFIG_EXAMPLE, null, 2))}
            className="liquid-bubble-secondary text-zinc-200 hover:text-white px-3.5 py-1.5 rounded-xl text-sm font-medium border border-white/15 hover:border-amber-400/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="liquid-bubble-glare" />
            <Copy size={14} className="text-amber-400" />
            <span>Копировать</span>
          </button>
        </div>
        <pre className="bg-zinc-950/60 rounded-xl p-4 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed border border-white/10">
{JSON.stringify(EXTRA_CONFIG_EXAMPLE, null, 2)}
        </pre>
      </div>

      <div className="liquid-bubble-secondary rounded-2xl p-5 border border-white/10 relative overflow-hidden shadow-lg space-y-4">
        <span className="liquid-bubble-glare" />
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            Шаблон конфигурации ProTalk (JSON)
          </h3>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(PROTALK_CONFIG_EXAMPLE, null, 2))}
            className="liquid-bubble-secondary text-zinc-200 hover:text-white px-3.5 py-1.5 rounded-xl text-sm font-medium border border-white/15 hover:border-amber-400/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="liquid-bubble-glare" />
            <Copy size={14} className="text-amber-400" />
            <span>Копировать</span>
          </button>
        </div>
        <pre className="bg-zinc-950/60 rounded-xl p-4 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed border border-white/10">
{JSON.stringify(PROTALK_CONFIG_EXAMPLE, null, 2)}
        </pre>
      </div>
    </div>
  );
};
