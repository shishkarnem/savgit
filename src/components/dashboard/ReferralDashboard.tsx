import React, { useEffect, useState } from 'react';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { ReferralStats } from '@/types/user';
import { 
  Users, Share2, Copy, Check, Sparkles, Trophy, Gift, ArrowUpRight, 
  Mail, Phone, MapPin, ShieldCheck, Crown, ExternalLink, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReferralDashboard: React.FC = () => {
  const { 
    profile, 
    telegramUser, 
    requestTelegramPhone, 
    requestTelegramLocation, 
    setShowLinkEmailModal,
    refreshProfile 
  } = useTelegramAuth();
  
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<'bot' | 'miniapp' | null>(null);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      const tgId = profile?.telegram_id || telegramUser?.id;
      const userId = profile?.id;
      const url = tgId ? `/api/v1/referrals/stats?telegram_id=${tgId}` : `/api/v1/referrals/stats?user_id=${userId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch (e) {
      console.error('Error fetching referral stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralStats();
  }, [profile?.telegram_id, profile?.id]);

  const copyToClipboard = (text: string, type: 'bot' | 'miniapp') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Profile Overview Card */}
      <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile?.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt={profile.full_name || 'Аватар'} 
                  className="w-16 h-16 rounded-2xl object-cover border border-amber-400/40 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-black font-extrabold text-2xl shadow-md">
                  {(profile?.first_name || profile?.full_name || 'U')[0].toUpperCase()}
                </div>
              )}
              {Boolean(profile?.is_premium) && (
                <div className="absolute -top-1 -right-1 bg-amber-400 text-black p-1 rounded-full shadow-md" title="Telegram Premium">
                  <Crown size={12} />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {profile?.full_name || profile?.first_name || 'Пользователь'}
                </h2>
                {profile?.role && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    {profile.role}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                {profile?.username && (
                  <a 
                    href={`https://t.me/${profile.username}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    @{profile.username} <ExternalLink size={10} />
                  </a>
                )}
                {profile?.telegram_id && (
                  <span className="text-slate-400 font-mono">TG ID: {profile.telegram_id}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Link email, contact, location) */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {!profile?.email ? (
              <button
                onClick={() => setShowLinkEmailModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-md shadow-amber-400/10"
              >
                <Mail size={14} /> Привязать Email
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <ShieldCheck size={14} /> {profile.email}
              </div>
            )}

            {!profile?.phone && window.Telegram?.WebApp && (
              <button
                onClick={requestTelegramPhone}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                <Phone size={14} /> Привязать номер
              </button>
            )}

            <button
              onClick={() => { fetchReferralStats(); refreshProfile(); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
              title="Обновить данные"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Account Details Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Баланс аккаунта</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {profile?.balance ? profile.balance.toLocaleString('ru-RU') : '5 000'} ₽
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Реферальные бонусы</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {stats?.rewardBalance ? stats.rewardBalance.toLocaleString('ru-RU') : '0'} ₽
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Приглашено людей</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
              {stats?.totalInvited ?? 0} чел.
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Статус аккаунта</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5 uppercase text-sm flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {profile?.status || 'ACTIVE'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Referral Links Section */}
      <div className="p-6 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-amber-500/10 via-white/[0.02] to-white/[0.01] border border-amber-500/30 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Gift size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Реферальная программа SAV AI</h3>
              <p className="text-xs text-slate-300">Получайте +500 ₽ за каждого приглашенного пользователя</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mini App Link */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300">Прямая ссылка на Mini App:</span>
              <span className="text-[10px] text-slate-400">Telegram WebApp</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={stats?.miniAppLink || `https://t.me/SAVPartnerBot/app?startapp=ref_${profile?.telegram_id || 'me'}`}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 select-all outline-none"
              />
              <button
                onClick={() => copyToClipboard(stats?.miniAppLink || '', 'miniapp')}
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 transition-all"
              >
                {copiedLink === 'miniapp' ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink === 'miniapp' ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
          </div>

          {/* Bot Direct Link */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Ссылка на запуск Telegram Бота:</span>
              <span className="text-[10px] text-slate-400">Стандартный диалог</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={stats?.referralLink || `https://t.me/SAVPartnerBot?start=ref_${profile?.telegram_id || 'me'}`}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 select-all outline-none"
              />
              <button
                onClick={() => copyToClipboard(stats?.referralLink || '', 'bot')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 transition-all"
              >
                {copiedLink === 'bot' ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink === 'bot' ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>

        {/* Referrer Info Banner (If invited by someone) */}
        {stats?.referrerInfo && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400 shrink-0" />
              <span>
                Вас пригласил эксперт: <strong className="text-white">{stats.referrerInfo.full_name || `@${stats.referrerInfo.username}`}</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px]">
              Партнёр SAV AI
            </span>
          </div>
        )}
      </div>

      {/* 3. Invited Users Table / Network */}
      <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Список приглашённых партнёров</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Всего: {stats?.invitedUsers?.length || 0}</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Загрузка данных реферальной сети...</div>
        ) : !stats?.invitedUsers || stats.invitedUsers.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-500">
              <Users size={20} />
            </div>
            <p className="text-xs text-slate-400">У вас пока нет приглашённых пользователей.</p>
            <p className="text-[11px] text-slate-500">Поделитесь реферальной ссылкой выше, чтобы получать бонусы и накапливать баланс.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold">
                  <th className="pb-3">Пользователь</th>
                  <th className="pb-3">Username / ID</th>
                  <th className="pb-3">Роль</th>
                  <th className="pb-3">Дата регистрации</th>
                  <th className="pb-3 text-right">Награда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.invitedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-medium text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                        {(u.first_name || u.full_name || 'U')[0]}
                      </div>
                      <span>{u.full_name || u.first_name || 'Пользователь'}</span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {u.username ? `@${u.username}` : `tg:${u.telegram_id}`}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px]">
                        {u.role || 'RESIDENT'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-400 font-mono">
                      +500 ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
