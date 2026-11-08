import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IMAGES } from '@/greenlandConstants';
import { Language, CityNode } from '@/types';
import Rivets from '@/components/Rivets';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';
import MountainHierarchy from './MountainHierarchy';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  X,
  Briefcase,
  Cpu,
  Users,
  Users2,
  TrendingUp,
  Award,
  Building2,
  Palette,
  Map as MapIcon,
  Mountain,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

interface HomeProps {
  lang: Language;
  mapImage: string;
  cities: CityNode[];
  t: (key: string) => string;
}

export const Home: React.FC<HomeProps> = ({ lang, mapImage, cities, t }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPartner = location.pathname.startsWith('/partner');
  const basePath = isPartner ? '/partner' : '/greenland';

  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityNode | null>(null);
  const [selectedLoreKey, setSelectedLoreKey] = useState<string | null>(null);
  const [mapZoomed, setMapZoomed] = useState(false);
  const [loreTab, setLoreTab] = useState<"dossier" | "manifesto" | "protocol">("dossier");
  const [visibleFlagSection, setVisibleFlagSection] = useState<"colors" | "coat" | null>(null);

  const LORE_META: Record<string, any> = {
    res: {
      icon: Users,
      abilities: lang === "ru" ? ["Доступ к казне", "Партнерская ссылка", "Базовое обучение"] : ["Лут", "Инвайт", "Скилл"]
    },
    arc: {
      icon: Cpu,
      abilities: lang === "ru" ? ["Создание ботов", "Доступ к API", "Биржа заказов"] : ["Крафт", "API", "Заказы"]
    },
    min: {
      icon: Briefcase,
      abilities: lang === "ru" ? ["Управление агентами", "Модерация", "Законотворчество"] : ["Власть", "Модерация", "Указы"]
    },
    cha: {
      icon: Award,
      abilities: lang === "ru" ? ["Абсолютный доступ", "Право вето", "Изменение кода"] : ["Полный доступ", "Вето", "Перезагрузка"],
      link: "https://t.me/shishkarnem"
    }
  };

  const getLoreContent = (key: string) => ({
    title: t(`lore_${key}_title`),
    subtitle: t(`lore_${key}_sub`),
    dossier: t(`lore_${key}_dossier`),
    manifesto: t(`lore_${key}_manifesto`),
    protocol: t(`lore_${key}_protocol`),
    ...LORE_META[key]
  });

  const currentLore = selectedLoreKey ? getLoreContent(selectedLoreKey) : null;
  const getCityIcon = () => Building2;

  const ColorRow = ({ color, titleKey, descKey }: { color: string; titleKey: string; descKey: string }) => (
    <div className="flex items-start gap-4 p-3 bg-black/20 rounded-xl border border-foreground/10 animate-fadeIn">
      <div className={`w-7 h-7 rounded-full ${color} shadow-md shrink-0 border border-white/20`} />
      <div>
        <h5 className="font-semibold text-sm text-white">{t(titleKey)}</h5>
        <p className="text-sm text-slate-300 leading-snug">{t(descKey)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* SEO Hidden Text Block */}
      <div className="sr-only" aria-hidden="false">
        <h1>AI-GreenLand — Цифровое государство ИИ-агентов и экспертов по автоматизации</h1>
        <p>
          AI-GreenLand — первое в мире цифровое государство, объединяющее экспертов по искусственному интеллекту,
          разработчиков ИИ-агентов, партнёров и предпринимателей.
        </p>
      </div>

      {/* Hero Section — Liquid Glass Card with Rivets */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="slow" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[90px] pointer-events-none" />
        <Rivets />
        <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
          <div className="lg:w-7/12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-sm font-semibold">
              <Globe size={16} className="text-amber-400" />
              <span>{lang === "ru" ? "Официальный портал ИИ-Гренландии" : "Портал УПЧК"}</span>
            </div>

            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              {t("hero_welcome")}{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">ИИ-Гренландию</span>
            </h2>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-normal">
              {t("hero_desc")}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(`${basePath}/immigration`)}
                className="liquid-bubble-gold px-6 py-3 text-sm md:text-base font-bold text-amber-950 rounded-xl relative overflow-hidden shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="liquid-bubble-glare" />
                <Sparkles size={18} />
                <span>Получить Green Card</span>
              </button>

              <button
                onClick={() => navigate(`${basePath}/constitution`)}
                className="liquid-bubble-secondary px-5 py-3 rounded-xl border border-white/15 text-zinc-200 hover:text-white hover:border-amber-400/40 transition-all text-sm md:text-base font-medium flex items-center gap-2 relative overflow-hidden"
              >
                <span className="liquid-bubble-glare" />
                <span>Законы и Регламенты</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div
            className="lg:w-5/12 w-full cursor-pointer group"
            onClick={() => navigate(`${basePath}/immigration`)}
          >
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-amber-400/40 group-hover:border-amber-300 transition-all duration-300 shadow-xl bg-gradient-to-tr from-amber-950/40 via-transparent to-red-950/30">
              <img
                src={IMAGES.HERO}
                alt="Пейзаж ИИ-Гренландии"
                className="w-full h-full object-cover partner-gold-sepia-filter opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-amber-900/10 flex flex-col justify-end p-5">
                <span className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-amber-400" />
                  Статус резидента
                </span>
                <h3 className="text-lg md:text-xl font-bold text-white mt-1">
                  {lang === "olbanian" ? "Получить ксиву гражданина" : "Оформить Green Card резидента"}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What is Greenland Benefits */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="normal" opacity={0.3} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px] pointer-events-none" />
        <Rivets />
        <div className="text-center max-w-2xl mx-auto mb-8 relative z-10">
          <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2">
            Что такое AI-GreenLand?
          </h3>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            {lang === "ru"
              ? "Первое в мире цифровое государство экспертов по искусственному интеллекту и автоматизации. Мы объединяем разработчиков ИИ-агентов, предпринимателей и партнёров в единую экосистему роста."
              : "Экосистема автоматизации бизнеса и внедрения ИИ-агентов нового поколения."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 relative z-10">
          {[
            {
              icon: TrendingUp,
              badge: "25% - 50%",
              title: lang === "ru" ? "Высокий доход" : "Доход от внедрения",
              desc: lang === "ru"
                ? "Партнёры получают 25% с каждого привлечённого клиента. Архитекторы и разработчики — 50% с каждого проекта."
                : "25% рефералам, 50% разработчикам и архитекторам ИИ."
            },
            {
              icon: Cpu,
              badge: "PRO AI",
              title: lang === "ru" ? "Технологии ИИ" : "Современные ИИ-агенты",
              desc: lang === "ru"
                ? "ИИ-агенты, омниканальные боты, голосовые ассистенты и интеграция с CRM под ключ."
                : "Чат-боты, голосовые ассистенты и автономные ИИ-агенты."
            },
            {
              icon: Users2,
              badge: "10+ Компаний",
              title: lang === "ru" ? "Сообщество экспертов" : "Сеть партнёров",
              desc: lang === "ru"
                ? "Аккредитованные компании-резиденты, единая биржа заказов, арбитраж сделок и база знаний."
                : "Единая экосистема обмена опытом и совместной реализации крупных проектов."
            }
          ].map((item, i) => {
            const IconComp = item.icon;
            return (
              <div
                key={i}
                className="liquid-bubble-secondary border border-white/10 hover:border-amber-400/40 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <IconComp size={20} />
                    </div>
                    <span className="text-sm px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300 font-semibold">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-white group-hover:text-amber-300 transition-colors mb-2">
                    {item.title}
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Cities Map — Liquid Glass Container */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="normal" opacity={0.3} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px] pointer-events-none" />
        <Rivets />
        <div className="text-center mb-6 relative z-10">
          <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-2">
            <MapIcon className="text-amber-400" size={26} />
            <span>{t("map_title")}</span>
          </h3>
          <p className="text-sm md:text-base text-zinc-300 font-normal">{t("map_desc")}</p>
        </div>

        <div className="relative w-full rounded-2xl flex flex-col items-center relative z-10">
          {/* Zoom button - mobile only */}
          <button
            onClick={() => setMapZoomed((z) => !z)}
            className="md:hidden mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl liquid-bubble-secondary border border-amber-400/30 text-amber-300 text-sm font-semibold hover:border-amber-400/50 transition-colors"
          >
            <Mountain size={16} />
            {mapZoomed
              ? (lang === "ru" ? "Уменьшить карту" : "Уменьшить")
              : (lang === "ru" ? "Увеличить карту ×4" : "Увеличить ×4")}
          </button>

          <div className={`relative w-full aspect-video rounded-2xl overflow-auto border border-amber-400/30 ${mapZoomed ? "" : "overflow-hidden"}`}>
            <div
              className="relative bg-black/40 rounded-2xl transition-all duration-500 origin-top-left"
              style={{
                width: mapZoomed ? "400%" : "100%",
                height: mapZoomed ? "400%" : "100%"
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={mapImage}
                  alt="Map"
                  className="w-full h-full object-cover opacity-90 partner-gold-sepia-filter"
                />
              </div>

              <div className="absolute inset-0 w-full h-full">
                {cities.map((city) => {
                  const Icon = getCityIcon();
                  const isHovered = activeCity === city.name;
                  return (
                    <div
                      key={city.id}
                      className={`absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isHovered ? "z-50" : "z-20"}`}
                      style={{ top: city.top, left: city.left }}
                      onMouseEnter={() => setActiveCity(city.name)}
                      onMouseLeave={() => setActiveCity(null)}
                      onClick={() => setSelectedCity(city)}
                    >
                      <div className="relative flex flex-col items-center justify-center w-8 h-8 md:w-12 md:h-12">
                        {/* City name label */}
                        <div
                          className={`absolute bottom-[130%] mb-1 whitespace-nowrap transition-all duration-300 ${isHovered ? "scale-105 opacity-100" : "scale-95 opacity-90"}`}
                        >
                          <div
                            className={`backdrop-blur-md border px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 transition-colors ${
                              isHovered
                                ? "bg-amber-500 text-black border-amber-300 font-bold"
                                : "bg-black/70 text-amber-200 border-amber-500/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isHovered ? "bg-black" : "bg-amber-400 animate-pulse"}`}
                            ></span>
                            <span className="text-sm font-semibold tracking-normal">
                              {city.name}
                            </span>
                          </div>
                        </div>

                        {/* Icon */}
                        <div
                          className={`relative z-10 p-1.5 md:p-2 rounded-full border transition-all duration-300 bg-black/80 ${
                            isHovered
                              ? "border-amber-300 text-amber-300 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.8)]"
                              : "border-amber-500/50 text-amber-400 hover:scale-105"
                          }`}
                        >
                          <Icon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* City Detail Modal */}
      {selectedCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeIn"
            onClick={() => setSelectedCity(null)}
          ></div>
          <div className="relative liquid-bubble-plate border border-amber-400/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full overflow-hidden animate-fadeIn backdrop-blur-2xl p-6 md:p-8 text-center">
            <Rivets />
            <button
              onClick={() => setSelectedCity(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-20"
            >
              <X size={22} />
            </button>

            <div className="w-full flex items-center justify-center my-3 py-2 px-2 min-h-[80px]">
              <img
                src={selectedCity.logo || IMAGES.LOGO}
                alt={selectedCity.name}
                className="max-w-full w-auto h-auto max-h-24 sm:max-h-28 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
              />
            </div>

            <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2">
              {selectedCity.name}
            </h3>

            <p className="text-zinc-300 text-sm md:text-base leading-relaxed mb-6 font-normal">
              {selectedCity.description || "Информация о резиденте засекречена."}
            </p>

            {selectedCity.link && (
              <a
                href={selectedCity.link}
                target="_blank"
                rel="noopener noreferrer"
                className="liquid-bubble-gold w-full py-3 text-sm md:text-base font-bold text-amber-950 rounded-xl relative overflow-hidden shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="liquid-bubble-glare" />
                <span>{selectedCity.linkText || "Перейти на сайт"}</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Role Lore Modal */}
      {selectedLoreKey && currentLore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeIn"
            onClick={() => setSelectedLoreKey(null)}
          ></div>
          <div className="relative liquid-bubble-plate border border-amber-400/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-2xl w-full flex flex-col animate-fadeIn overflow-hidden max-h-[90vh] backdrop-blur-2xl">
            <span className="liquid-bubble-glare" />
            <Rivets />
            <button
              onClick={() => setSelectedLoreKey(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-20"
            >
              <X size={22} />
            </button>

            <div className="p-6 border-b border-foreground/10 flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-400/40">
                {currentLore.icon && <currentLore.icon size={28} className="text-amber-400" />}
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                  {currentLore.title}
                </h3>
                <p className="text-amber-300 text-sm font-medium">{currentLore.subtitle}</p>
              </div>
            </div>

            <div className="flex border-b border-foreground/10 bg-black/20 relative z-10">
              <button
                onClick={() => setLoreTab("dossier")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  loreTab === "dossier" ? "bg-amber-500/20 text-amber-300 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t("lore_tab_dossier") || "Досье"}
              </button>
              <button
                onClick={() => setLoreTab("manifesto")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  loreTab === "manifesto" ? "bg-amber-500/20 text-amber-300 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t("lore_tab_manifesto") || "Манифест"}
              </button>
              <button
                onClick={() => setLoreTab("protocol")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  loreTab === "protocol" ? "bg-amber-500/20 text-amber-300 border-b-2 border-amber-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t("lore_tab_protocol") || "Протокол"}
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] relative z-10">
              {loreTab === "dossier" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 pb-4 border-b border-foreground/10">
                    {currentLore.abilities.map((ability: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-amber-300 text-sm font-medium"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                        {ability}
                      </span>
                    ))}
                  </div>
                  <div className="liquid-bubble-secondary rounded-xl border border-white/10 p-4">
                    <p className="text-sm md:text-base text-zinc-200 leading-relaxed whitespace-pre-line">
                      {currentLore.dossier || "Досье засекречено."}
                    </p>
                  </div>
                </div>
              )}

              {loreTab === "manifesto" && (
                <div className="liquid-bubble-secondary p-5 rounded-xl border border-white/10">
                  <p className="text-sm md:text-base text-amber-100 italic leading-relaxed">
                    "{currentLore.manifesto}"
                  </p>
                </div>
              )}

              {loreTab === "protocol" && (
                <div className="space-y-2">
                  {currentLore.protocol
                    .split("\n")
                    .filter(Boolean)
                    .map((line: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex gap-3 items-start p-3 liquid-bubble-secondary rounded-xl border border-white/10"
                      >
                        <span className="min-w-[24px] h-6 flex items-center justify-center bg-amber-500/20 text-amber-300 font-bold text-sm rounded-md">
                          {idx + 1}
                        </span>
                        <span className="text-sm md:text-base text-zinc-200 leading-relaxed">
                          {line.replace(/^\d+\.\s*/, "")}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {currentLore.link && (
                <a
                  href={currentLore.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-bubble-gold w-full py-3 text-sm md:text-base font-bold text-amber-950 rounded-xl relative overflow-hidden shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  <span className="liquid-bubble-glare" />
                  <span>{lang === "ru" ? "Связаться с канцлером" : "Связаться"}</span>
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Pyramid & Flag — Liquid Glass Containers */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Pyramid Card */}
        <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <span className="liquid-bubble-glare" />
          <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px] pointer-events-none" />
          <Rivets />
          <div className="text-center mb-6 relative z-10">
            <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-1 flex items-center justify-center gap-2">
              <Award className="text-amber-400" size={24} />
              <span>{t("pyramid_title")}</span>
            </h3>
            <p className="text-sm text-zinc-300 font-normal">Нажмите на уровень для просмотра привилегий</p>
          </div>

          <div className="relative z-10 w-full">
            <MountainHierarchy
              onSelectTier={(key) => {
                setSelectedLoreKey(key);
                setLoreTab("dossier");
              }}
              selectedKey={selectedLoreKey}
              t={t}
            />
          </div>
        </div>

        {/* Flag Card */}
        <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <span className="liquid-bubble-glare" />
          <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px] pointer-events-none" />
          <Rivets />
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-85 transition-opacity"
              onClick={() => setVisibleFlagSection((prev) => (prev === "coat" ? null : "coat"))}
            >
              <ShieldCheck className="text-amber-400" size={24} />
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                {t("flag_title")}
              </h3>
            </div>

            <div
              className="relative cursor-pointer w-full max-w-sm mb-4 rounded-xl overflow-hidden border border-amber-400/30 hover:border-amber-300 transition-all duration-300 shadow-xl group"
              onClick={() => setVisibleFlagSection((prev) => (prev === "colors" ? null : "colors"))}
            >
              <img
                src={IMAGES.FLAG}
                alt="Флаг и герб ИИ-Гренландии"
                className="w-full h-auto object-cover partner-gold-sepia-filter opacity-95 group-hover:scale-102 transition-transform duration-300"
              />
            </div>

            <div className="w-full space-y-4 text-left">
              {visibleFlagSection === "colors" && (
                <div className="animate-fadeIn space-y-3">
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Palette size={16} />
                    <span>{t("flag_meaning_title")}</span>
                  </h4>
                  <ColorRow color="bg-amber-400" titleKey="color_yellow_title" descKey="color_yellow_desc" />
                  <ColorRow color="bg-amber-600" titleKey="color_red_title" descKey="color_red_desc" />
                  <ColorRow color="bg-amber-800" titleKey="color_blue_title" descKey="color_blue_desc" />
                </div>
              )}

              {visibleFlagSection === "coat" && (
                <div className="liquid-bubble-secondary p-5 rounded-xl border border-amber-400/30 animate-fadeIn flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={IMAGES.GERB || IMAGES.LOGO || '/file/36/gerb.png'}
                    alt="Герб ИИ-Гренландии"
                    className="w-20 h-20 object-contain partner-gold-sepia-filter shrink-0 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Mountain className="text-amber-400" size={18} />
                      <h4 className="font-bold text-amber-200 text-sm">
                        {t("coat_title")}
                      </h4>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-light">
                      {t("coat_desc")}
                    </p>
                  </div>
                </div>
              )}

              {!visibleFlagSection && (
                <p className="text-sm text-zinc-300 text-center italic">
                  Нажмите на флаг или заголовок, чтобы раскрыть значение цветов и герба.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
