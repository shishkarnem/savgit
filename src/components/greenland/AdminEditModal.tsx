import React, { useState, useEffect } from 'react';
import {
  X, Save, Trash2, Check, User, Phone, MessageSquare,
  FileText, Shield, ExternalLink, Sparkles, CreditCard, Link as LinkIcon
} from 'lucide-react';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';

interface AdminEditModalProps {
  isOpen: boolean;
  row: any;
  activeTab: string;
  onClose: () => void;
  onSave: (rowId: any, updatedData: any) => Promise<void> | void;
  onDelete?: (rowId: any) => Promise<void> | void;
}

const CRM_STATUS_OPTIONS = [
  'Новый',
  'Регистрация',
  'Реферал',
  'Эксперт',
  'В работе',
  'Оплачено',
  'Заблокировано',
  'На проверке',
  'Завершено'
];

const CRM_REG_TYPES = [
  'Партнер',
  'Эксперт',
  'Клиент',
  'Партнер ООО',
  'Партнер ИП',
  'Партнер СМЗ',
  'Эксперт ООО',
  'Эксперт ИП',
  'Эксперт СМЗ',
];

export const AdminEditModal: React.FC<AdminEditModalProps> = ({
  isOpen,
  row,
  activeTab,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (row) {
      setFormData({ ...row });
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(row.id, formData);
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to save row:', e);
    } finally {
      setSaving(false);
    }
  };

  const isCRM = activeTab === 'CRM';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      {/* Container is max-w-5xl (2x wider than standard max-w-lg) */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden relative">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="slow" opacity={0.25} className="-top-3 -left-3 w-[calc(100%+24px)] h-[70px]" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center liquid-bubble-secondary relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl liquid-bubble-secondary border border-amber-400/40 flex items-center justify-center shadow-md">
              <User size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                {isCRM ? 'Карточка клиента CRM' : `Редактирование записи (${activeTab})`}
              </h3>
              <p className="text-sm text-zinc-400">
                ID: <span className="font-mono text-zinc-300">{row.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl liquid-bubble-secondary border border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6 relative z-10">
          {savedToast && (
            <div className="p-3 liquid-bubble-gold border border-amber-300 rounded-xl flex items-center gap-2 text-amber-950 font-bold text-sm shadow-md animate-fadeIn">
              <Check size={18} />
              <span>Данные успешно зафиксированы и сохранены в базе!</span>
            </div>
          )}

          {isCRM ? (
            /* Rich 2-column & grouped layout for CRM */
            <div className="space-y-6">
              {/* Group 1: Основные сведения */}
              <div className="liquid-bubble-secondary border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <User size={16} /> Основные сведения и контакты
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">ФИО / Имя</label>
                    <input
                      type="text"
                      value={formData.fio || ''}
                      onChange={e => handleChange('fio', e.target.value)}
                      placeholder="ФИО клиента"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Telegram (@username)</label>
                    <input
                      type="text"
                      value={formData.telegram || ''}
                      onChange={e => handleChange('telegram', e.target.value)}
                      placeholder="@username"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Telegram ID</label>
                    <input
                      type="text"
                      value={formData.telegram_id || ''}
                      onChange={e => handleChange('telegram_id', e.target.value)}
                      placeholder="123456789"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Статус воронки</label>
                    <select
                      value={formData.status || 'Новый'}
                      onChange={e => handleChange('status', e.target.value)}
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer"
                    >
                      {CRM_STATUS_OPTIONS.map(st => (
                        <option key={st} value={st} className="bg-zinc-900 text-white">{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Тип регистрации</label>
                    <select
                      value={formData.registration_type || 'Партнер'}
                      onChange={e => handleChange('registration_type', e.target.value)}
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer"
                    >
                      {CRM_REG_TYPES.map(rt => (
                        <option key={rt} value={rt} className="bg-zinc-900 text-white">{rt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Псевдоним</label>
                    <input
                      type="text"
                      value={formData.pseudonym || ''}
                      onChange={e => handleChange('pseudonym', e.target.value)}
                      placeholder="Псевдоним в системе"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Партнерская сеть и реквизиты */}
              <div className="liquid-bubble-secondary border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <CreditCard size={16} /> Партнерская программа и реквизиты
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Код партнера</label>
                    <input
                      type="text"
                      value={formData.partner_code || ''}
                      onChange={e => handleChange('partner_code', e.target.value)}
                      placeholder="405"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Промокод</label>
                    <input
                      type="text"
                      value={formData.promo || ''}
                      onChange={e => handleChange('promo', e.target.value)}
                      placeholder="PROMO123"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Карта или расчетный счет</label>
                    <input
                      type="text"
                      value={formData.card_or_account || ''}
                      onChange={e => handleChange('card_or_account', e.target.value)}
                      placeholder="Реквизиты для выплат"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Клиенты партнера</label>
                    <input
                      type="text"
                      value={formData.partner_clients || ''}
                      onChange={e => handleChange('partner_clients', e.target.value)}
                      placeholder="Список клиентов"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Клиенты эксперта</label>
                    <input
                      type="text"
                      value={formData.expert_clients || ''}
                      onChange={e => handleChange('expert_clients', e.target.value)}
                      placeholder="Клиенты на эксперте"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Обучение пройдено</label>
                    <select
                      value={String(formData.training || 'false')}
                      onChange={e => handleChange('training', e.target.value)}
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="true" className="bg-zinc-900 text-white">Да (пройдено)</option>
                      <option value="false" className="bg-zinc-900 text-white">Нет (не пройдено)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 3: Договор и документы */}
              <div className="liquid-bubble-secondary border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <FileText size={16} /> Договор и статус верификации
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Ссылка на договор</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.contract_link || ''}
                        onChange={e => handleChange('contract_link', e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="flex-grow bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                      />
                      {formData.contract_link && (
                        <a
                          href={formData.contract_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400 text-amber-300 flex items-center gap-1.5"
                        >
                          <ExternalLink size={16} />
                          <span className="text-sm">Открыть</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Проверка договора</label>
                    <input
                      type="text"
                      value={formData.contract_check || ''}
                      onChange={e => handleChange('contract_check', e.target.value)}
                      placeholder="✅ или ⏳"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Проверка регистрации</label>
                    <input
                      type="text"
                      value={formData.reg_check || ''}
                      onChange={e => handleChange('reg_check', e.target.value)}
                      placeholder="✅ или ⏳"
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Напоминания и комментарии */}
              <div className="liquid-bubble-secondary border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <MessageSquare size={16} /> Напоминания и комментарии администратора
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Комментарий администратора</label>
                    <textarea
                      rows={3}
                      value={formData.comment || ''}
                      onChange={e => handleChange('comment', e.target.value)}
                      placeholder="Внутренние заметки по клиенту..."
                      className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Текст авто-напоминания</label>
                      <textarea
                        rows={3}
                        value={formData.reminder_text || ''}
                        onChange={e => handleChange('reminder_text', e.target.value)}
                        placeholder="Текст уведомления клиенту..."
                        className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none resize-y"
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Время напоминания</label>
                        <input
                          type="text"
                          value={formData.reminder_time || ''}
                          onChange={e => handleChange('reminder_time', e.target.value)}
                          placeholder="2026-03-10 11:41:52"
                          className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Статус напоминания</label>
                        <input
                          type="text"
                          value={formData.reminder_status || ''}
                          onChange={e => handleChange('reminder_status', e.target.value)}
                          placeholder="Ожидает / Отправлено"
                          className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* General table row editor with clean 2-column grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(formData).map(key => {
                const val = formData[key];
                const isReadOnly = key === 'id' || key === 'created_at' || key === 'updated_at';

                return (
                  <div key={key} className={typeof val === 'string' && val.length > 80 ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5 font-mono">{key}</label>
                    {isReadOnly ? (
                      <div className="text-sm text-zinc-400 bg-zinc-950/70 border border-white/10 p-3 rounded-xl font-mono truncate">
                        {String(val || '')}
                      </div>
                    ) : typeof val === 'string' && val.length > 80 ? (
                      <textarea
                        rows={3}
                        value={val || ''}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val ?? ''}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 liquid-bubble-secondary relative z-10">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Удалить эту запись?')) {
                    onDelete(row.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 size={16} />
                <span>Удалить</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl liquid-bubble-secondary border border-white/15 text-zinc-300 hover:text-white text-sm font-semibold cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl liquid-bubble-gold text-amber-950 border border-amber-300 text-sm font-bold shadow-md cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
            >
              <Save size={16} />
              <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
