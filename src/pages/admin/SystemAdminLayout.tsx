import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import {
  Database,
  ShoppingBag,
  Zap,
  Clock,
  Shield,
  Terminal,
  RefreshCw,
  Image as ImageIcon,
  ArrowLeft,
  Server,
  Users,
  BarChart3,
  Send,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  LogOut,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemAdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const SystemAdminLayout: React.FC<SystemAdminLayoutProps> = ({
  title,
  subtitle,
  actions,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sav_system_admin_auth') === 'true';
  });
  const [accessCode, setAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleVerifyAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accessCode.trim()) {
      setAuthError('Введите код доступа');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/admin/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: accessCode.trim() })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('sav_system_admin_auth', 'true');
        setIsAuthenticated(true);
        toast.success('Доступ администратора подтвержден');
      } else {
        setAuthError(data.error || 'Неверный код доступа');
        toast.error('Неверный код доступа');
      }
    } catch (err: any) {
      setAuthError('Ошибка проверки соединения');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sav_system_admin_auth');
    setIsAuthenticated(false);
    setAccessCode('');
    toast.info('Сессия администратора завершена');
  };

  // Consolidated system admin navigation without duplicates
  const navItems = [
    {
      to: '/system-admin',
      exact: true,
      label: 'Таблицы BD ProTalk',
      icon: Database,
      badge: 'База данных',
      isExternal: false
    },
    {
      to: '/system-admin/market',
      label: 'Каталог маркетплейса',
      icon: ShoppingBag,
      badge: 'Товары',
      isExternal: false
    },
    {
      to: '/system-admin/crm',
      exact: true,
      label: 'Клиенты CRM',
      icon: Users,
      badge: 'Клиенты',
      isExternal: false
    },
    {
      to: '/system-admin/crm/dashboard',
      label: 'Аналитика CRM',
      icon: BarChart3,
      badge: 'Отчеты',
      isExternal: false
    },
    {
      to: '/greenland/admin',
      label: 'Штаб партнерки Greenland',
      icon: Server,
      badge: 'Штаб',
      isExternal: true
    },
    {
      to: '/system-admin/files',
      label: 'Галерея файлов',
      icon: ImageIcon,
      badge: 'Файлы',
      isExternal: false
    },
    {
      to: '/system-admin/autopilot',
      label: 'Настройки рассылок (Автопилот)',
      icon: Sparkles,
      badge: '10:00-17:00 МСК',
      isExternal: false
    },
    {
      to: '/system-admin/proxy',
      label: 'Telegram прокси и бэкап',
      icon: Send,
      badge: '06:00 МСК',
      isExternal: false
    },
    {
      to: '/system-admin/triggers',
      label: 'Триггеры и крон',
      icon: Zap,
      badge: 'Триггеры',
      isExternal: false
    },
    {
      to: '/system-admin/cron',
      label: 'Фоновые задачи',
      icon: Clock,
      badge: 'Расписание',
      isExternal: false
    },
    {
      to: '/system-admin/console',
      label: 'Консоль SQL',
      icon: Terminal,
      badge: 'Консоль',
      isExternal: false
    }
  ];

  const currentItem = navItems.find((item) =>
    item.exact
      ? location.pathname === item.to
      : location.pathname === item.to || (item.to !== '/system-admin' && location.pathname.startsWith(item.to))
  ) || navItems[0];

  const CurrentIcon = currentItem.icon;

  // Access Gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div id="system-admin-auth-lock" className="min-h-screen bg-transparent text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="p-6 sm:p-8 rounded-2xl backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl border border-amber-300/40 backdrop-blur-xl flex items-center justify-center mb-5 text-amber-300">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent mb-2">
              Панель управления системой
            </h2>
            <p className="text-sm text-white/70 mb-6">
              Для доступа ко всем разделам системного администрирования введите код авторизации
            </p>

            <form onSubmit={handleVerifyAccess} className="w-full space-y-4">
              <div className="relative">
                <KeyRound className="w-5 h-5 text-amber-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Введите код доступа"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setAuthError(null);
                  }}
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/20 bg-transparent backdrop-blur-xl text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-amber-300 transition-all"
                />
              </div>

              {authError && (
                <div className="text-sm text-amber-300 font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-12 rounded-xl border border-amber-300/60 bg-transparent backdrop-blur-xl hover:border-amber-300 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-amber-300" />
                    <span>Подтвердить вход</span>
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => navigate('/')}
              className="mt-6 text-sm text-white/60 hover:text-white transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-amber-300" />
              <span>Вернуться на главную</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="system-admin-wrapper" className="min-h-screen bg-transparent text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        <Header />

        {/* Top Control Bar */}
        <div id="admin-top-bar" className="mb-6 p-5 sm:p-6 rounded-2xl backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              id="admin-back-btn"
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl border border-white/20 backdrop-blur-xl hover:border-amber-300/60 text-white transition-all text-sm flex items-center gap-2"
              title="На главную"
            >
              <ArrowLeft className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium hidden sm:inline">На главную</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl border border-amber-300/40 backdrop-blur-xl text-amber-300">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent text-smoke-anim">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-white/70 text-sm mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {actions}
            <button
              onClick={handleLogout}
              className="p-2.5 px-3.5 rounded-xl border border-white/20 backdrop-blur-xl bg-black/30 hover:border-amber-300/60 text-white/80 hover:text-white transition-all text-sm flex items-center gap-2"
              title="Выйти из админ-панели"
            >
              <LogOut className="w-4 h-4 text-amber-300" />
              <span className="text-sm">Заблокировать</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown (Liquid Glass Apple Style - No Horizontal Scroll) */}
        <div className="md:hidden mb-6 w-full">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full p-3.5 rounded-2xl border border-white/20 backdrop-blur-2xl bg-black/40 flex items-center justify-between text-left text-sm font-medium text-white shadow-lg transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CurrentIcon className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">{currentItem.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-lg border border-amber-300/40 text-amber-200 text-sm font-mono">
                {currentItem.badge}
              </span>
              {mobileNavOpen ? <ChevronUp className="w-4 h-4 text-amber-300" /> : <ChevronDown className="w-4 h-4 text-amber-300" />}
            </div>
          </button>

          {mobileNavOpen && (
            <div className="mt-2.5 p-2 rounded-2xl backdrop-blur-2xl bg-black/50 border border-white/20 shadow-2xl flex flex-col gap-1.5 w-full">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname === item.to || (item.to !== '/system-admin' && location.pathname.startsWith(item.to));

                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileNavOpen(false)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'border border-amber-300 bg-amber-400/20 text-amber-200 shadow-md font-semibold'
                        : 'border border-white/10 bg-black/20 text-white/80 hover:text-white hover:border-amber-300/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-white/60'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isExternal && <ExternalLink className="w-3.5 h-3.5 text-amber-300/70" />}
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-lg text-sm border font-mono ${
                          isActive ? 'border-amber-300/40 text-amber-200' : 'border-white/10 text-white/50'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Navigation Tabs (Tag Cloud Block - Liquid Glass Apple Style) */}
        <div id="admin-navigation-tabs" className="hidden md:flex mb-8 p-3 rounded-2xl backdrop-blur-2xl bg-black/30 border border-white/20 shadow-lg flex-wrap items-center gap-2.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || (item.to !== '/system-admin' && location.pathname.startsWith(item.to));

            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-link-${item.to.replace(/[/]/g, '-')}`}
                className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-xl ${
                  isActive
                    ? 'border border-amber-300 bg-amber-400/15 text-amber-300 shadow-md shadow-amber-400/10 font-semibold'
                    : 'border border-white/15 bg-black/20 text-white/80 hover:text-white hover:border-amber-300/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-300' : 'text-white/60'}`} />
                <span>{item.label}</span>
                {item.isExternal && <ExternalLink className="w-3.5 h-3.5 text-amber-300/70" />}
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-lg text-sm border font-mono ${
                    isActive
                      ? 'border-amber-300/40 text-amber-200'
                      : 'border-white/10 text-white/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Page Main Content */}
        <main id="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
