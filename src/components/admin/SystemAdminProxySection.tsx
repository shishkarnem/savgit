import React, { useState, useEffect } from "react";
import { Shield, Globe, Server, Check, HelpCircle, Save, Send, Database, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import Rivets from "../Rivets";

export const SystemAdminProxySection: React.FC = () => {
  const [proxyType, setProxyType] = useState<"dialog_ai" | "custom_cloudflare" | "direct">("dialog_ai");
  const [customProxyUrl, setCustomProxyUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("@SAV_AI_Sales_Bot");
  const [maskedToken, setMaskedToken] = useState("");
  const [isTokenConfigured, setIsTokenConfigured] = useState(false);
  const [adminId, setAdminId] = useState("169262990");
  const [showCfHelp, setShowCfHelp] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [copiedCfCode, setCopiedCfCode] = useState(false);
  const [backupResult, setBackupResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/bot-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success || data.proxyType) {
          setProxyType(data.proxyType || "dialog_ai");
          if (data.proxyType === "custom_cloudflare") {
            setCustomProxyUrl(data.apiBaseUrl || "");
          }
          if (data.botUsername) setBotUsername(data.botUsername);
          setMaskedToken(data.maskedToken || "");
          setIsTokenConfigured(data.isTokenConfigured || false);
          if (data.adminTelegramId) setAdminId(data.adminTelegramId);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyType,
          apiBaseUrl: customProxyUrl,
          botToken: botToken ? botToken.trim() : undefined,
          botUsername: botUsername.trim(),
          adminTelegramId: adminId.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("Настройки прокси-шлюза и Telegram бота успешно сохранены!");
        setBotToken("");
        if (data.config?.isTokenConfigured) {
          setIsTokenConfigured(true);
          setMaskedToken(data.config.maskedToken);
        }
      } else {
        setStatusMsg(`Ошибка сохранения: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (e: any) {
      setStatusMsg(`Ошибка соединения: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      const res = await fetch("/api/admin/backup/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Тестовая ручная отправка из панели управления" })
      });
      const data = await res.json();
      setBackupResult(data);
      if (data.success) {
        setStatusMsg(`Резервная копия базы данных успешно отправлена администратору в Telegram (Chat ID: ${adminId})! Таблиц: ${data.tablesCount}, строк: ${data.totalRows}.`);
      } else {
        setStatusMsg(`Не удалось отправить бэкап в Telegram: ${data.error || 'Проверьте токен бота и доступность шлюза'}`);
      }
    } catch (e: any) {
      setStatusMsg(`Сбой запроса: ${e.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const getFullExampleUrl = () => {
    const tokenDisplay = isTokenConfigured ? "<ТОКЕН_БОТА>" : "YOUR_BOT_TOKEN";
    if (proxyType === "dialog_ai") {
      return `https://eu1.account.dialog.ai.atiks.org/bot${tokenDisplay}/sendMessage`;
    }
    if (proxyType === "custom_cloudflare") {
      const base = customProxyUrl.replace(/\/+$/, "") || "https://your-worker.workers.dev";
      return `${base}/bot${tokenDisplay}/sendMessage`;
    }
    return `https://api.telegram.org/bot${tokenDisplay}/sendMessage`;
  };

  const cfWorkerCode = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'api.telegram.org';
    const newReq = new Request(url, request);
    return fetch(newReq);
  }
};`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(cfWorkerCode);
    setCopiedCfCode(true);
    setTimeout(() => setCopiedCfCode(false), 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl transition-all space-y-6">
      <Rivets />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-amber-400/40 text-amber-300 shadow-sm">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent">
              Шлюз и Проксирование Telegram Bot API
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Антиблокировочная система проксирования запросов и автобэкап базы данных в 06:00 МСК
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCfHelp(!showCfHelp)}
          className="flex items-center gap-2 text-sm text-amber-200 backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.08] border border-amber-400/30 px-4 py-2.5 rounded-xl transition-all self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-amber-300" />
          Инструкция по Cloudflare Worker
        </button>
      </div>

      {/* Cloudflare Worker Guide Modal/Panel */}
      {showCfHelp && (
        <div className="relative z-10 rounded-2xl backdrop-blur-xl bg-black/40 border border-amber-400/30 p-5 text-sm space-y-3.5 text-slate-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 text-base">Инструкция: Создание собственного бесплатного Cloudflare Worker прокси</span>
            <button
              onClick={copyCodeToClipboard}
              className="flex items-center gap-1.5 text-xs text-amber-200 bg-amber-500/15 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/25 transition"
            >
              {copiedCfCode ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5 text-amber-300" />}
              {copiedCfCode ? "Скопировано" : "Копировать код воркера"}
            </button>
          </div>

          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-sm">
            <li>Зарегистрируйтесь или войдите на <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" className="text-amber-300 underline font-medium">dash.cloudflare.com</a></li>
            <li>Перейдите в раздел <b>Build → Compute → Workers & Pages → Create Application</b>. Выберите шаблон <b>"Hello, World"</b>, укажите поддомен и нажмите <b>Deploy</b>.</li>
            <li>В настройках созданного воркера нажмите <b>"Edit Code"</b> в правом верхнем углу, вставьте следующий код и нажмите <b>Deploy</b>:</li>
          </ol>

          <pre className="backdrop-blur-md bg-black/60 p-4 rounded-xl border border-white/10 font-mono text-xs text-amber-200 overflow-x-auto select-all leading-relaxed">
{cfWorkerCode}
          </pre>

          <p className="text-xs text-slate-300">
            После деплоя скопируйте полученный адрес (например, <code className="text-amber-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">https://my-proxy.my-subdomain.workers.dev</code>) и вставьте его в поле "URL вашего Cloudflare Worker" ниже.
          </p>
        </div>
      )}

      {/* Preset Selector */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset 1: Dialog AI */}
        <div
          onClick={() => setProxyType("dialog_ai")}
          className={`cursor-pointer p-5 rounded-2xl border transition-all backdrop-blur-xl ${
            proxyType === "dialog_ai"
              ? "bg-white/[0.06] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
              : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base text-white">Готовый прокси-шлюз</span>
            {proxyType === "dialog_ai" && <Check className="w-5 h-5 text-amber-300" />}
          </div>
          <p className="text-sm text-slate-300 mb-3 leading-relaxed">
            Выделенный европейский шлюз высокой доступности. Работает в РФ без блокировок.
          </p>
          <code className="text-xs text-amber-300 font-mono break-all block backdrop-blur-md bg-black/30 p-2 rounded-lg border border-white/10">
            https://eu1.account.dialog.ai.atiks.org
          </code>
        </div>

        {/* Preset 2: Custom Cloudflare Worker */}
        <div
          onClick={() => setProxyType("custom_cloudflare")}
          className={`cursor-pointer p-5 rounded-2xl border transition-all backdrop-blur-xl ${
            proxyType === "custom_cloudflare"
              ? "bg-white/[0.06] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
              : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base text-white">Свой Cloudflare Worker</span>
            {proxyType === "custom_cloudflare" && <Check className="w-5 h-5 text-amber-300" />}
          </div>
          <p className="text-sm text-slate-300 mb-3 leading-relaxed">
            Персональный бесплатный воркер Cloudflare для приватного проксирования.
          </p>
          <span className="text-xs text-amber-300 font-mono block backdrop-blur-md bg-black/30 p-2 rounded-lg border border-white/10">
            Пользовательский URL шлюза
          </span>
        </div>

        {/* Preset 3: Direct */}
        <div
          onClick={() => setProxyType("direct")}
          className={`cursor-pointer p-5 rounded-2xl border transition-all backdrop-blur-xl ${
            proxyType === "direct"
              ? "bg-white/[0.06] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
              : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base text-white">Прямое подключение</span>
            {proxyType === "direct" && <Check className="w-5 h-5 text-amber-300" />}
          </div>
          <p className="text-sm text-slate-300 mb-3 leading-relaxed">
            Стандартные эндпоинты Telegram API без промежуточных прокси.
          </p>
          <code className="text-xs text-slate-300 font-mono block backdrop-blur-md bg-black/30 p-2 rounded-lg border border-white/10">
            https://api.telegram.org
          </code>
        </div>
      </div>

      {/* Custom Cloudflare URL input */}
      {proxyType === "custom_cloudflare" && (
        <div className="relative z-10 space-y-2 backdrop-blur-xl bg-black/30 p-4 rounded-2xl border border-white/10">
          <label className="text-sm font-semibold text-slate-200">
            URL вашего развернутого Cloudflare Worker:
          </label>
          <input
            type="text"
            value={customProxyUrl}
            onChange={(e) => setCustomProxyUrl(e.target.value)}
            placeholder="https://my-proxy.my-subdomain.workers.dev"
            className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition"
          />
        </div>
      )}

      {/* Target URL Preview */}
      <div className="relative z-10 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
          Итоговый URL выполнения запросов:
        </span>
        <div className="font-mono text-sm text-amber-300 break-all select-all font-semibold">
          {getFullExampleUrl()}
        </div>
      </div>

      {/* Bot Token, Username, and Admin Telegram ID */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
            <span>Токен Telegram-бота:</span>
            {isTokenConfigured && (
              <span className="text-xs text-amber-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {maskedToken}
              </span>
            )}
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={isTokenConfigured ? "Оставьте пустым, чтобы сохранить текущий" : "7656117989:AAFg..."}
            className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition"
          />
          <p className="text-xs text-slate-400">
            Токен надежно хранится в российской базе данных BD ProTalk и никогда не передается в браузер.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">
            Имя / Юзернейм бота:
          </label>
          <input
            type="text"
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value)}
            placeholder="@SAV_AI_Sales_Bot"
            className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition"
          />
          <p className="text-xs text-slate-400">
            Используется для генерации прямых ссылок на консультации и аудит.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">
            Telegram ID Администратора (для бэкапов в 06:00 МСК):
          </label>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="169262990"
            className="w-full backdrop-blur-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition"
          />
          <p className="text-xs text-slate-400">
            На этот Chat ID бот отправляет ежедневный автобэкап базы и заявки.
          </p>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMsg && (
        <div className="relative z-10 p-4 backdrop-blur-xl bg-white/[0.04] border border-amber-400/40 rounded-2xl text-sm text-amber-200 flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{statusMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2.5 backdrop-blur-md bg-white/[0.05] hover:bg-white/[0.1] border border-amber-400/50 text-amber-200 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all"
        >
          <Save className="w-4 h-4 text-amber-300" />
          {isSaving ? "Сохранение конфигурации..." : "Сохранить конфигурацию"}
        </button>

        <button
          onClick={handleTriggerBackup}
          disabled={isBackingUp}
          className="flex items-center gap-2.5 backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-slate-200 hover:text-white px-5 py-3 rounded-2xl text-sm font-semibold transition-all"
        >
          <Database className="w-4 h-4 text-amber-300" />
          {isBackingUp ? "Формирование и отправка..." : "Тестовый запуск бэкапа в Telegram"}
        </button>
      </div>
    </div>
  );
};
export default SystemAdminProxySection;
