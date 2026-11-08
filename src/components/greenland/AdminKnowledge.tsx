import React, { useState, useEffect, useMemo } from 'react';
import {
  Book, Search, PlusCircle, RefreshCw, Save, Trash2, Edit2, Check,
  Copy, FileText, Bot, AlertCircle, X, ChevronDown, ChevronUp, Tag, Sparkles
} from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';

export interface KnowledgePromptEntry {
  id: string;
  prompt_key: string;
  title: string;
  prompt_name?: string | null;
  bot_id?: string | null;
  category: string;
  system_prompt: string;
  user_prompt_template?: string | null;
  example_response?: string | null;
  response_format?: string | null;
  rules?: string | null;
  macros?: string | null;
  description?: string | null;
  is_active: boolean | number;
  content?: string | null;
  answer?: string | null;
  files?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const AdminKnowledge: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgePromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgePromptEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState('База знаний');
  const [formTitle, setFormTitle] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formUserTemplate, setFormUserTemplate] = useState('');
  const [formModel, setFormModel] = useState('72220');
  const [formRules, setFormRules] = useState('');
  const [formFiles, setFormFiles] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await protalkDb.from('protalk_prompts' as any).select('*').order('created_at', { ascending: false });
      if (res.data && res.data.length > 0) {
        setEntries(res.data as any);
      } else {
        // Fallback to ai_prompts if protalk_prompts empty
        const fallback = await protalkDb.from('ai_prompts' as any).select('*').order('created_at', { ascending: false });
        if (fallback.data && fallback.data.length > 0) {
          const mapped = (fallback.data as any[]).map(p => ({
            id: p.id,
            prompt_key: p.prompt_key || p.id,
            title: p.title,
            category: p.category || 'Общее',
            system_prompt: p.system_prompt || '',
            user_prompt_template: p.user_prompt_template || '',
            is_active: p.is_active === 1 || p.is_active === true,
            bot_id: p.target_model || 'ProTalk',
            created_at: p.created_at,
          }));
          setEntries(mapped);
        } else {
          setEntries([]);
        }
      }
    } catch (e) {
      console.error('Failed to load knowledge & prompts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.category && e.category.trim()) set.add(e.category.trim());
    });
    return Array.from(set);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const lower = search.toLowerCase();
      return (
        (e.title && e.title.toLowerCase().includes(lower)) ||
        (e.prompt_key && e.prompt_key.toLowerCase().includes(lower)) ||
        (e.category && e.category.toLowerCase().includes(lower)) ||
        (e.system_prompt && e.system_prompt.toLowerCase().includes(lower)) ||
        (e.user_prompt_template && e.user_prompt_template.toLowerCase().includes(lower)) ||
        (e.answer && e.answer.toLowerCase().includes(lower)) ||
        (e.content && e.content.toLowerCase().includes(lower))
      );
    });
  }, [entries, selectedCategory, search]);

  const handleOpenAdd = () => {
    setFormCategory('База знаний');
    setFormTitle('');
    setFormKey(`prompt_${Date.now().toString(36)}`);
    setFormSystemPrompt('');
    setFormUserTemplate('');
    setFormModel('72220');
    setFormRules('');
    setFormFiles('');
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (entry: KnowledgePromptEntry) => {
    setEditingEntry(entry);
    setFormCategory(entry.category || 'База знаний');
    setFormTitle(entry.title || entry.prompt_name || '');
    setFormKey(entry.prompt_key || '');
    setFormSystemPrompt(entry.system_prompt || entry.answer || '');
    setFormUserTemplate(entry.user_prompt_template || entry.content || '');
    setFormModel(entry.bot_id || '72220');
    setFormRules(entry.rules || '');
    setFormFiles(entry.files || '');
    setFormIsActive(Boolean(entry.is_active === 1 || entry.is_active === true));
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formSystemPrompt.trim()) return;
    setSaving(true);
    try {
      if (editingEntry) {
        // Update existing record
        const updatePayload = {
          title: formTitle.trim(),
          prompt_name: formTitle.trim(),
          category: formCategory.trim(),
          prompt_key: formKey.trim() || editingEntry.prompt_key,
          system_prompt: formSystemPrompt,
          answer: formSystemPrompt,
          user_prompt_template: formUserTemplate,
          content: formUserTemplate,
          bot_id: formModel,
          rules: formRules,
          files: formFiles,
          is_active: formIsActive ? 1 : 0,
          updated_at: new Date().toISOString(),
        };
        await protalkDb.from('protalk_prompts' as any).update(updatePayload).eq('id', editingEntry.id);
        setEditingEntry(null);
      } else {
        // Create new record
        const newId = `pt_prompt_${Date.now()}`;
        const newPayload = {
          id: newId,
          title: formTitle.trim(),
          prompt_name: formTitle.trim(),
          category: formCategory.trim(),
          prompt_key: formKey.trim() || `prompt_${Date.now().toString(36)}`,
          system_prompt: formSystemPrompt,
          answer: formSystemPrompt,
          user_prompt_template: formUserTemplate,
          content: formUserTemplate,
          bot_id: formModel,
          rules: formRules,
          files: formFiles,
          is_active: formIsActive ? 1 : 0,
          response_format: 'json',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await protalkDb.from('protalk_prompts' as any).insert(newPayload);
        setIsAddModalOpen(false);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      loadData();
    } catch (e) {
      console.error('Failed to save prompt/knowledge entry:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись из базы данных?')) return;
    try {
      await protalkDb.from('protalk_prompts' as any).delete().eq('id', id);
      loadData();
    } catch (e) {
      console.error('Failed to delete prompt/knowledge entry:', e);
    }
  };

  const toggleActive = async (entry: KnowledgePromptEntry) => {
    const current = Boolean(entry.is_active === 1 || entry.is_active === true);
    const newStatus = !current;
    try {
      await protalkDb.from('protalk_prompts' as any).update({ is_active: newStatus ? 1 : 0 }).eq('id', entry.id);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: newStatus } : e));
    } catch (e) {
      console.error('Failed to update active state:', e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-grow flex flex-col space-y-5 p-2 sm:p-4 overflow-y-auto custom-scrollbar">
      {/* Top Banner */}
      <div className="liquid-bubble-secondary rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-lg relative overflow-hidden">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="slow" opacity={0.25} className="-top-2 -left-2 w-[calc(100%+16px)] h-[60px]" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-xl liquid-bubble-secondary border border-amber-400/35 flex items-center justify-center shadow-md">
            <Book size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
              База знаний и промпты ИИ
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              Синхронизировано с российской базой данных BD ProTalk (таблица protalk_prompts): сценарии, промпты агентов, макросы и статьи
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={handleOpenAdd}
            className="liquid-bubble-gold text-amber-950 font-bold px-4 py-2.5 rounded-xl text-sm border border-amber-300 shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <span className="liquid-bubble-glare" />
            <PlusCircle size={16} />
            <span>Добавить запись</span>
          </button>
          <button
            onClick={loadData}
            className="liquid-bubble-secondary text-zinc-200 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/15 hover:border-amber-400/40 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <span className="liquid-bubble-glare" />
            <RefreshCw size={15} className={`text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="liquid-bubble-plate border border-amber-400/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md relative">
        <span className="liquid-bubble-glare" />
        <div className="flex items-center gap-2 flex-grow max-w-md relative z-10">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск по названию, ключу, тексту промпта..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none backdrop-blur-md"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap relative z-10">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedCategory === 'all' ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 hover:text-white border border-white/10'}`}
          >
            Все ({entries.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedCategory === cat ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 hover:text-white border border-white/10'}`}
            >
              {cat} ({entries.filter(e => e.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {savedSuccess && (
        <div className="p-3.5 liquid-bubble-gold border border-amber-300 rounded-2xl flex items-center gap-2.5 text-amber-950 font-bold text-sm shadow-lg animate-fadeIn">
          <Check size={18} />
          <span>Данные успешно зафиксированы в российской базе данных BD ProTalk!</span>
        </div>
      )}

      {/* Cards List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw size={24} className="animate-spin text-amber-400 mr-3" />
          <span className="text-sm text-zinc-300">Загрузка записей базы знаний из базы данных...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="liquid-bubble-plate border border-white/10 rounded-2xl p-12 text-center text-zinc-400 space-y-3">
          <Book size={36} className="mx-auto text-zinc-500 opacity-60" />
          <p className="text-sm">Записи не найдены по заданным критериям.</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 liquid-bubble-gold text-amber-950 font-bold rounded-xl text-sm border border-amber-300 cursor-pointer inline-flex items-center gap-2"
          >
            <PlusCircle size={15} />
            <span>Создать первую запись</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            const isExpanded = expandedId === entry.id;
            const promptText = entry.system_prompt || entry.answer || '';
            const userTemplate = entry.user_prompt_template || entry.content || '';
            const isActive = Boolean(entry.is_active === 1 || entry.is_active === true);

            return (
              <div
                key={entry.id}
                className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all hover:border-amber-400/40"
              >
                <span className="liquid-bubble-glare" />
                <div className="flex flex-wrap items-start justify-between gap-3 relative z-10 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 rounded-xl text-sm font-semibold liquid-bubble-secondary border border-amber-400/35 text-amber-300">
                      {entry.category || 'Общее'}
                    </span>
                    <h3 className="font-bold text-base text-zinc-100">
                      {entry.title || entry.prompt_name || 'Без названия'}
                    </h3>
                    {entry.prompt_key && (
                      <span className="text-sm font-mono text-zinc-400 bg-zinc-950/60 px-2 py-0.5 rounded-lg border border-white/10">
                        {entry.prompt_key}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => toggleActive(entry)}
                      className={`px-3 py-1 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${isActive ? 'liquid-bubble-secondary border-amber-400/35 text-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                    >
                      {isActive ? 'Активен' : 'Отключен'}
                    </button>

                    {/* Copy prompt button */}
                    <button
                      onClick={() => copyToClipboard(promptText, entry.id)}
                      title="Скопировать промпт"
                      className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === entry.id ? <Check size={16} className="text-amber-400" /> : <Copy size={16} />}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      title="Редактировать запись"
                      className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Удалить из базы данных"
                      className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <div className="relative z-10 space-y-2.5">
                  <div className="bg-zinc-950/50 border border-white/10 rounded-xl p-3.5 text-sm text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap">
                    {isExpanded ? promptText : promptText.slice(0, 260) + (promptText.length > 260 ? '...' : '')}
                  </div>

                  {userTemplate && (
                    <div className="text-sm text-zinc-400 flex items-center gap-2">
                      <span className="font-semibold text-amber-300/80">Шаблон запроса:</span>
                      <span className="font-mono text-zinc-300">{userTemplate}</span>
                    </div>
                  )}

                  {entry.files && (
                    <div className="text-sm text-zinc-400 flex items-center gap-2">
                      <span className="font-semibold text-amber-300/80">Файлы:</span>
                      <span className="text-zinc-300">{entry.files}</span>
                    </div>
                  )}

                  {isExpanded && entry.rules && (
                    <div className="text-sm bg-amber-400/5 border border-amber-400/20 rounded-xl p-3 text-zinc-300">
                      <span className="font-semibold text-amber-300 block mb-1">Правила и ограничения:</span>
                      <span>{entry.rules}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingEntry) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="liquid-bubble-plate border border-amber-400/30 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92%] flex flex-col overflow-hidden relative">
            <span className="liquid-bubble-glare" />
            <div className="p-5 border-b border-white/10 flex justify-between items-center liquid-bubble-secondary relative z-10">
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                <Book size={18} className="text-amber-400" />
                {editingEntry ? 'Редактирование записи базы знаний' : 'Новая запись базы знаний / промпта'}
              </h3>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingEntry(null); }}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 relative z-10">
              {/* Category and Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Категория</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="Классификация, Архитектура, FAQ..."
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c} value={c} />)}
                    <option value="База знаний" />
                    <option value="Промпты ProTalk" />
                    <option value="Классификация бизнеса" />
                    <option value="Архитектура решений" />
                    <option value="Экономика внедрения" />
                    <option value="Экспертная поддержка" />
                    <option value="Визуализация" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Ключ промпта (системный)</label>
                  <input
                    type="text"
                    placeholder="protalk_my_prompt"
                    value={formKey}
                    onChange={e => setFormKey(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Заголовок / Вопрос</label>
                <input
                  type="text"
                  placeholder="Название сценария или вопрос из базы знаний"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              {/* System Prompt / Answer */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Системный промпт / Ответ базы знаний</span>
                  <span className="text-xs text-zinc-400 font-normal">Поддерживает макросы в фигурных скобках</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Текст промпта для ИИ или развернутый ответ статьи базы знаний..."
                  value={formSystemPrompt}
                  onChange={e => setFormSystemPrompt(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-zinc-100 font-mono outline-none resize-y leading-relaxed"
                />
              </div>

              {/* User prompt template */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Шаблон входящего запроса (пользовательский ввод)</label>
                <input
                  type="text"
                  placeholder="Бизнес клиента: {userInput}, Сфера: {sphere}"
                  value={formUserTemplate}
                  onChange={e => setFormUserTemplate(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white font-mono outline-none"
                />
              </div>

              {/* Additional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">ID бота / Модель</label>
                  <input
                    type="text"
                    placeholder="72220 или ProTalk"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Файлы / Ссылки на документы</label>
                  <input
                    type="text"
                    placeholder="doc1.pdf, instructions.txt"
                    value={formFiles}
                    onChange={e => setFormFiles(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Active status */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-sm font-semibold text-zinc-300">Активность записи в системе</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-zinc-300">{formIsActive ? 'Включен' : 'Отключен'}</span>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${formIsActive ? 'liquid-bubble-gold border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-zinc-800 border border-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${formIsActive ? 'left-5 bg-amber-950' : 'left-0.5 bg-zinc-400'}`} />
                  </button>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-3 liquid-bubble-secondary relative z-10">
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingEntry(null); }}
                className="px-4 py-2.5 rounded-xl liquid-bubble-secondary border border-white/15 text-zinc-300 hover:text-white text-sm font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim() || !formSystemPrompt.trim()}
                className="px-5 py-2.5 rounded-xl liquid-bubble-gold text-amber-950 border border-amber-300 text-sm font-bold shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-2"
              >
                <Save size={16} />
                <span>{saving ? 'Сохранение...' : 'Сохранить в базу данных'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
