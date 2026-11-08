import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MapPin, Calendar, Briefcase, DollarSign, MessageSquare, Bot, ExternalLink, FileText, Send, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CardSection } from '@/hooks/useCRMSettings';
import { SettingsConstructor } from './SettingsConstructor';
import { ClientChat } from './ClientChat';

type Client = any;

interface ClientCardConfigurableProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardSections: CardSection[];
  onToggleCardSection: (key: string) => void;
  onResetCardSections: () => void;
}

// Liquid Glass Apple color styling without green or red
const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено':
    case 'Оплачено':
      return 'bg-amber-400/20 text-amber-200 border-amber-400/50 shadow-sm';
    case 'В работе':
    case 'Обслуживание':
      return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40';
    case 'Отказ':
    case 'Заблокировано':
      return 'bg-zinc-800/80 text-zinc-300 border-zinc-600/60';
    case 'Инфо':
    case 'Расчет':
      return 'bg-amber-300/15 text-amber-300 border-amber-300/40';
    case 'Договор':
    case 'Предоплата':
    case 'Тариф':
      return 'bg-purple-500/20 text-purple-200 border-purple-400/40';
    case 'Подбор Эксперта':
    case 'Эксперт':
      return 'bg-sky-500/20 text-sky-200 border-sky-400/40';
    default:
      return 'bg-white/10 text-zinc-300 border-white/15';
  }
};

const InfoRow: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      {icon && <span className="text-amber-400/80 mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-400 font-medium">{label}</div>
        <div className="text-sm text-zinc-100 font-normal break-words mt-0.5">{value}</div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 pl-1">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

export const ClientCardConfigurable: React.FC<ClientCardConfigurableProps> = ({
  client,
  open,
  onOpenChange,
  cardSections,
  onToggleCardSection,
  onResetCardSections
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const { toast } = useToast();
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  const cleanTgId = client?.telegram_id ? String(client.telegram_id).trim() : '';
  const hasTelegramId = Boolean(
    cleanTgId &&
    cleanTgId !== '0' &&
    cleanTgId !== 'null' &&
    cleanTgId !== 'undefined' &&
    cleanTgId !== '—' &&
    cleanTgId !== 'Гость'
  );

  // If user does not have a telegram ID, always switch active tab to info
  useEffect(() => {
    if (!hasTelegramId && activeTab === 'chat') {
      setActiveTab('info');
    }
  }, [hasTelegramId, activeTab]);

  const telegramIdNum = hasTelegramId ? parseInt(cleanTgId, 10) : null;

  const { data: tgProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['telegram-profile', telegramIdNum],
    queryFn: async () => {
      if (!telegramIdNum || isNaN(telegramIdNum)) return null;
      const { data, error } = await protalkDb.from('sav_telegram_profiles').select('*').eq('telegram_id', telegramIdNum).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!telegramIdNum && open,
  });

  const handleSyncProfile = async () => {
    if (!hasTelegramId) return;
    setIsSyncingProfile(true);
    try {
      const { data, error } = await protalkDb.functions.invoke('sav-sync-telegram-profile', { body: { telegram_id: cleanTgId } });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'Профиль обновлен' });
        refetchProfile();
      } else {
        toast({ title: 'Синхронизация Telegram', description: data?.error || 'Данные профиля обновлены' });
      }
    } catch {
      toast({ title: 'Синхронизация профиля Telegram' });
    } finally {
      setIsSyncingProfile(false);
    }
  };

  if (!client) return null;

  const isSectionVisible = (key: string) => cardSections.find(s => s.key === key)?.visible ?? true;

  const displayName = client.full_name || [tgProfile?.first_name, tgProfile?.last_name].filter(Boolean).join(' ') || client.telegram_client || 'Клиент платформы';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 w-[95vw] mx-auto rounded-3xl border border-white/15 bg-zinc-950/85 backdrop-blur-3xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col">
        {/* Glass Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-amber-400/40 shadow-lg bg-zinc-900">
                {tgProfile?.photo_url && <AvatarImage src={tgProfile.photo_url} alt={displayName} />}
                <AvatarFallback className="bg-amber-400/10 text-amber-300 text-xl font-bold">
                  {(displayName || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
                  {displayName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-sm">
                  <Badge variant="outline" className={`text-sm py-0.5 px-3 rounded-full ${getStatusColor(client.status)}`}>
                    {client.status || 'Новый'}
                  </Badge>
                  {client.project_code && (
                    <Badge variant="secondary" className="font-mono text-sm bg-white/10 border border-white/15 text-zinc-200">
                      {client.project_code}
                    </Badge>
                  )}
                  {hasTelegramId ? (
                    <Badge variant="outline" className="text-sm bg-amber-400/10 border-amber-400/30 text-amber-300">
                      Telegram ID: {cleanTgId}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm bg-zinc-800/80 border-white/15 text-zinc-400">
                      Telegram не привязан
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {hasTelegramId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 gap-2 text-sm bg-white/5 border-white/15 hover:border-amber-400/50 text-zinc-200 hover:text-white rounded-xl backdrop-blur-md"
                  onClick={handleSyncProfile}
                  disabled={isSyncingProfile}
                  title="Синхронизировать профиль Telegram"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingProfile ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Синхронизировать</span>
                </Button>
              )}
              <SettingsConstructor
                mode="card"
                cardSections={cardSections}
                onToggleCardSection={onToggleCardSection}
                onResetCardSections={onResetCardSections}
              />
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Control - Only show Chat Tab if Telegram ID exists */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'info' | 'chat')} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 sm:px-6 pt-3 pb-1 border-b border-white/5 bg-white/[0.01]">
            <TabsList className={`grid w-full ${hasTelegramId ? 'grid-cols-2' : 'grid-cols-1'} bg-zinc-900/60 border border-white/10 rounded-xl p-1 h-11`}>
              <TabsTrigger
                value="info"
                className="gap-2 text-sm rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-400/40 transition-all font-medium"
              >
                <FileText className="h-4 w-4" />
                Информация
              </TabsTrigger>

              {hasTelegramId && (
                <TabsTrigger
                  value="chat"
                  className="gap-2 text-sm rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-400/40 transition-all font-medium"
                >
                  <Send className="h-4 w-4" />
                  Чат в Telegram
                </TabsTrigger>
              )}
            </TabsList>

            {!hasTelegramId && (
              <div className="flex items-center gap-2 mt-2 py-1 px-3 rounded-lg bg-zinc-900/40 border border-white/10 text-xs text-zinc-400">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Чат и рассылки скрыты, так как у клиента нет привязанного Telegram ID.</span>
              </div>
            )}
          </div>

          {/* Info Tab */}
          <TabsContent value="info" className="m-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[58vh] custom-scrollbar">
              <div className="p-5 sm:p-6 space-y-6">
                {isSectionVisible('contacts') && (
                  <>
                    <Section title="Контактные данные">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Telegram ID" value={client.telegram_id || 'Не привязан'} icon={<User className="h-4 w-4" />} />
                        <InfoRow label="Telegram логин" value={client.telegram_client || client.telegram || '—'} icon={<MessageSquare className="h-4 w-4" />} />
                        <InfoRow label="Город" value={client.city || '—'} icon={<MapPin className="h-4 w-4" />} />
                        <InfoRow label="Телефон" value={client.phone || '—'} icon={<User className="h-4 w-4" />} />
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('project') && (
                  <>
                    <Section title="Проект и функционал">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Проект" value={client.project || '—'} icon={<Briefcase className="h-4 w-4" />} />
                        <InfoRow label="Продукт" value={client.product || '—'} />
                        <InfoRow label="Подразделение" value={client.department || '—'} />
                        <InfoRow label="Сотрудников" value={client.employees_count ? `${client.employees_count} чел.` : null} />
                        <div className="md:col-span-2">
                          <InfoRow label="Функционал" value={client.functionality || '—'} />
                        </div>
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('expert') && (
                  <>
                    <Section title="Эксперт и тариф">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Эксперт" value={client.expert_name || '—'} />
                        <InfoRow label="Псевдоним" value={client.expert_pseudonym || '—'} />
                        <InfoRow label="Выбранный эксперт" value={client.selected_expert || '—'} />
                        <InfoRow label="Тариф" value={client.tariff || '—'} />
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('finance') && (
                  <>
                    <Section title="Финансовые параметры">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Стоимость SAV" value={client.sav_cost ? `${client.sav_cost} ₽` : null} icon={<DollarSign className="h-4 w-4" />} />
                        <InfoRow label="Окупаемость" value={client.payback || '—'} />
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('dates') && (
                  <>
                    <Section title="Даты и этапы">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Дата калькулятора" value={client.calculator_date || '—'} icon={<Calendar className="h-4 w-4" />} />
                        <InfoRow label="Дата оплаты" value={client.payment_date || '—'} />
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('protalk') && (
                  <>
                    <Section title="ИИ-ассистент">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="ID бота" value={client.protalk_id || '—'} icon={<Bot className="h-4 w-4" />} />
                        <InfoRow label="Имя бота" value={client.protalk_name || '—'} />
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('documents') && (client.contract_ooo_url || client.contract_ip_url) && (
                  <>
                    <Section title="Документы">
                      <div className="flex flex-wrap gap-3">
                        {client.contract_ooo_url && (
                          <a
                            href={client.contract_ooo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Договор ООО
                          </a>
                        )}
                        {client.contract_ip_url && (
                          <a
                            href={client.contract_ip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Договор ИП
                          </a>
                        )}
                      </div>
                    </Section>
                    <Separator className="bg-white/10" />
                  </>
                )}

                {isSectionVisible('comment') && client.comment && (
                  <Section title="Комментарий">
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {client.comment}
                    </div>
                  </Section>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Tab - Only rendered when Telegram ID is present */}
          {hasTelegramId && (
            <TabsContent value="chat" className="m-0 px-5 sm:px-6 pb-6 flex-1 overflow-hidden">
              <ClientChat
                clientId={client.id}
                telegramId={cleanTgId}
                clientName={displayName}
                clientData={client}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCardConfigurable;
