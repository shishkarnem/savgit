import React, { useState } from "react";
import { Award, Shield, Sparkles, ChevronRight, Crown, Briefcase, Cpu, Users } from "lucide-react";

export interface MountainTier {
  id: number;
  key: "cha" | "min" | "arc" | "res";
  role: string;
  desc: string;
  levelLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  elevation: string;
}

interface MountainHierarchyProps {
  onSelectTier: (key: string) => void;
  selectedKey: string | null;
  t: (key: string) => string;
}

export const MountainHierarchy: React.FC<MountainHierarchyProps> = ({
  onSelectTier,
  selectedKey,
  t,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const tiers: MountainTier[] = [
    {
      id: 4,
      key: "cha",
      role: t("pyr_cha_role") || "Канцлер",
      desc: t("pyr_cha_desc") || "Dr.White",
      levelLabel: "Уровень 4 • Вершина",
      icon: Crown,
      elevation: "4 810 м",
    },
    {
      id: 3,
      key: "min",
      role: t("pyr_min_role") || "Министр",
      desc: t("pyr_min_desc") || "Агент / Дилер",
      levelLabel: "Уровень 3 • Верхние скалы",
      icon: Briefcase,
      elevation: "3 200 м",
    },
    {
      id: 2,
      key: "arc",
      role: t("pyr_arc_role") || "Архитектор",
      desc: t("pyr_arc_desc") || "Эксперт по ИИ",
      levelLabel: "Уровень 2 • Горный массив",
      icon: Cpu,
      elevation: "1 950 м",
    },
    {
      id: 1,
      key: "res",
      role: t("pyr_res_role") || "Резидент",
      desc: t("pyr_res_desc") || "Партнер / Реферал",
      levelLabel: "Уровень 1 • Фундамент",
      icon: Users,
      elevation: "800 м",
    },
  ];

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Interactive Mountain Canvas */}
      <div className="relative w-full max-w-[680px] aspect-[800/640] rounded-2xl overflow-hidden p-1">
        <svg
          viewBox="0 0 800 640"
          className="w-full h-full filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Mountain lighting & glowing filters */}
            <filter id="tierGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0.95   0 1 0 0 0.8   0 0 1 0 0.35  0 0 0 1.5 0"
                result="colorBlur"
              />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rockShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.75" />
            </filter>

            {/* Radiant Sun/Star at Summit */}
            <radialGradient id="summitAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* TIER 4 (КАНЦЛЕР - ВЕРШИНА): Peak snow and gold sunlit rock */}
            <linearGradient id="t4Lit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="25%" stopColor="#fef08a" />
              <stop offset="65%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="t4Dark" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="50%" stopColor="#291402" />
              <stop offset="100%" stopColor="#170a01" />
            </linearGradient>
            <linearGradient id="t4Snow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0.1" />
            </linearGradient>

            {/* TIER 3 (МИНИСТР - ВЕРХНИЕ СКАЛЫ): Steep jagged cliffs */}
            <linearGradient id="t3Lit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="35%" stopColor="#d97706" />
              <stop offset="80%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="t3Dark" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d1e06" />
              <stop offset="60%" stopColor="#241002" />
              <stop offset="100%" stopColor="#140801" />
            </linearGradient>

            {/* TIER 2 (АРХИТЕКТОР - ГОРНЫЙ МАССИВ): Broad rock terraces & couloirs */}
            <linearGradient id="t2Lit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="45%" stopColor="#b45309" />
              <stop offset="85%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#542407" />
            </linearGradient>
            <linearGradient id="t2Dark" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2c1404" />
              <stop offset="55%" stopColor="#1a0b02" />
              <stop offset="100%" stopColor="#0d0501" />
            </linearGradient>

            {/* TIER 1 (РЕЗИДЕНТ - ФУНДАМЕНТ): Tectonic bedrock & foothills */}
            <linearGradient id="t1Lit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="40%" stopColor="#92400e" />
              <stop offset="80%" stopColor="#542407" />
              <stop offset="100%" stopColor="#301403" />
            </linearGradient>
            <linearGradient id="t1Dark" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f0c02" />
              <stop offset="50%" stopColor="#120601" />
              <stop offset="100%" stopColor="#080300" />
            </linearGradient>

            {/* Atmospheric mist layer */}
            <linearGradient id="mistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Background Ambient Aura */}
          <ellipse cx="400" cy="300" rx="340" ry="240" fill="url(#summitAura)" opacity="0.12" />

          {/* ============================================================ */}
          {/* TIER 1: РЕЗИДЕНТ (ОСНОВАНИЕ / ФУНДАМЕНТ ГОРИЗОНТА)           */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer transition-all duration-300"
            onClick={() => onSelectTier("res")}
            onMouseEnter={() => setHoveredKey("res")}
            onMouseLeave={() => setHoveredKey(null)}
            filter={selectedKey === "res" || hoveredKey === "res" ? "url(#tierGlow)" : "url(#rockShadow)"}
            opacity={selectedKey && selectedKey !== "res" && hoveredKey !== "res" ? 0.75 : 1}
          >
            {/* Shaded Left Flank of Base Foothills */}
            <path
              d="M150,455 L132,492 L105,532 L78,572 L45,605 L112,615 L185,606 L265,618 L355,608 L400,612 L400,455 L320,466 L250,452 L195,468 Z"
              fill="url(#t1Dark)"
              stroke="#b45309"
              strokeWidth={selectedKey === "res" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "res" ? "0.9" : "0.5"}
            />
            {/* Rocky facets left side */}
            <path
              d="M150,455 L210,505 L265,618 L185,606 L132,492 Z"
              fill="#180b02"
              fillOpacity="0.7"
            />
            <path
              d="M105,532 L155,565 L185,606 L112,615 L78,572 Z"
              fill="#120601"
              fillOpacity="0.8"
            />

            {/* Sunlit Right Flank of Base Foothills */}
            <path
              d="M400,455 L400,612 L450,618 L550,606 L640,616 L715,608 L755,605 L730,570 L700,530 L675,492 L650,455 L615,466 L565,452 L485,468 Z"
              fill="url(#t1Lit)"
              stroke="#f59e0b"
              strokeWidth={selectedKey === "res" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "res" ? "0.9" : "0.5"}
            />
            {/* Rocky facets right side */}
            <path
              d="M400,455 L445,510 L485,468 L565,452 L540,520 L450,618 L400,612 Z"
              fill="#b45309"
              fillOpacity="0.45"
            />
            <path
              d="M565,452 L615,466 L650,455 L675,492 L610,545 L550,606 Z"
              fill="#f59e0b"
              fillOpacity="0.25"
            />
            <path
              d="M675,492 L700,530 L730,570 L660,575 L610,545 Z"
              fill="#78350f"
              fillOpacity="0.6"
            />

            {/* Geological Stratum & Crag Lines on Base */}
            <path
              d="M90,560 Q180,540 270,555 T450,545 T640,550 T730,580"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              fill="none"
              strokeOpacity="0.35"
            />
            <path
              d="M65,585 Q200,580 380,585 T600,575 T745,595"
              stroke="#fde68a"
              strokeWidth="1.2"
              fill="none"
              strokeOpacity="0.3"
            />

            {/* Natural Rock Fissure between Tier 1 and Tier 2 */}
            <path
              d="M150,455 L195,468 L250,452 L320,466 L400,454 L485,468 L565,452 L615,466 L650,455"
              stroke="#f59e0b"
              strokeWidth={selectedKey === "res" || hoveredKey === "res" ? "3" : "2"}
              fill="none"
              strokeOpacity="0.8"
            />
          </g>

          {/* ============================================================ */}
          {/* TIER 2: АРХИТЕКТОР (ГОРНЫЙ МАССИВ / УСТУПЫ И КАРНИЗЫ)       */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer transition-all duration-300"
            onClick={() => onSelectTier("arc")}
            onMouseEnter={() => setHoveredKey("arc")}
            onMouseLeave={() => setHoveredKey(null)}
            filter={selectedKey === "arc" || hoveredKey === "arc" ? "url(#tierGlow)" : "url(#rockShadow)"}
            opacity={selectedKey && selectedKey !== "arc" && hoveredKey !== "arc" ? 0.75 : 1}
          >
            {/* Shaded Left Flank of Tier 2 */}
            <path
              d="M240,305 L218,345 L195,380 L175,420 L150,455 L195,468 L250,452 L320,466 L400,454 L400,305 L360,314 L315,302 L275,316 Z"
              fill="url(#t2Dark)"
              stroke="#d97706"
              strokeWidth={selectedKey === "arc" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "arc" ? "0.9" : "0.5"}
            />
            {/* Angular crags left */}
            <path
              d="M240,305 L285,360 L218,345 Z"
              fill="#1d0c03"
              fillOpacity="0.8"
            />
            <path
              d="M285,360 L330,420 L250,452 L195,380 L218,345 Z"
              fill="#261204"
              fillOpacity="0.75"
            />

            {/* Sunlit Right Flank of Tier 2 */}
            <path
              d="M400,305 L400,454 L485,468 L565,452 L615,466 L650,455 L628,415 L605,375 L582,340 L560,305 L515,306 L465,316 L410,304 Z"
              fill="url(#t2Lit)"
              stroke="#fbbf24"
              strokeWidth={selectedKey === "arc" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "arc" ? "0.9" : "0.5"}
            />
            {/* Angular crags right */}
            <path
              d="M400,305 L445,365 L410,304 Z"
              fill="#fef08a"
              fillOpacity="0.25"
            />
            <path
              d="M445,365 L490,430 L485,468 L400,454 Z"
              fill="#d97706"
              fillOpacity="0.45"
            />
            <path
              d="M465,316 L515,306 L535,375 L490,430 L445,365 Z"
              fill="#fbbf24"
              fillOpacity="0.3"
            />
            <path
              d="M515,306 L560,305 L582,340 L545,410 L535,375 Z"
              fill="#b45309"
              fillOpacity="0.5"
            />
            <path
              d="M582,340 L605,375 L628,415 L580,440 L545,410 Z"
              fill="#78350f"
              fillOpacity="0.6"
            />

            {/* Stratified Crag Fissures Tier 2 */}
            <path
              d="M210,380 Q320,360 400,370 T590,375"
              stroke="#fef08a"
              strokeWidth="1.2"
              fill="none"
              strokeOpacity="0.35"
            />
            <path
              d="M180,425 Q300,410 400,418 T620,420"
              stroke="#f59e0b"
              strokeWidth="1.4"
              strokeDasharray="5 7"
              fill="none"
              strokeOpacity="0.4"
            />

            {/* Fissure Ledge dividing Tier 2 and Tier 3 */}
            <path
              d="M240,305 L275,316 L315,302 L360,314 L410,304 L465,316 L515,306 L560,305"
              stroke="#fbbf24"
              strokeWidth={selectedKey === "arc" || hoveredKey === "arc" ? "3" : "2"}
              fill="none"
              strokeOpacity="0.85"
            />
          </g>

          {/* ============================================================ */}
          {/* TIER 3: МИНИСТР (ВЕРХНИЕ СКАЛЫ И ОБРЫВЫ)                    */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer transition-all duration-300"
            onClick={() => onSelectTier("min")}
            onMouseEnter={() => setHoveredKey("min")}
            onMouseLeave={() => setHoveredKey(null)}
            filter={selectedKey === "min" || hoveredKey === "min" ? "url(#tierGlow)" : "url(#rockShadow)"}
            opacity={selectedKey && selectedKey !== "min" && hoveredKey !== "min" ? 0.75 : 1}
          >
            {/* Shaded Left Flank of Tier 3 */}
            <path
              d="M322,165 L305,200 L288,235 L262,270 L240,305 L275,316 L315,302 L360,314 L400,305 L400,165 L372,162 L348,172 Z"
              fill="url(#t3Dark)"
              stroke="#f59e0b"
              strokeWidth={selectedKey === "min" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "min" ? "0.9" : "0.5"}
            />
            {/* Sharp facets left */}
            <path
              d="M322,165 L350,215 L305,200 Z"
              fill="#220e03"
              fillOpacity="0.8"
            />
            <path
              d="M305,200 L350,215 L365,270 L288,235 Z"
              fill="#2d1304"
              fillOpacity="0.7"
            />
            <path
              d="M288,235 L365,270 L360,314 L262,270 Z"
              fill="#1a0b02"
              fillOpacity="0.85"
            />

            {/* Sunlit Right Flank of Tier 3 */}
            <path
              d="M400,165 L400,305 L410,304 L465,316 L515,306 L560,305 L538,268 L512,230 L495,195 L478,165 L458,172 L435,160 Z"
              fill="url(#t3Lit)"
              stroke="#fde047"
              strokeWidth={selectedKey === "min" ? "2.5" : "1.2"}
              strokeOpacity={selectedKey === "min" ? "0.9" : "0.5"}
            />
            {/* Sharp facets right */}
            <path
              d="M400,165 L435,220 L400,305 Z"
              fill="#fef08a"
              fillOpacity="0.35"
            />
            <path
              d="M400,165 L478,165 L495,195 L455,235 L435,220 Z"
              fill="#fde047"
              fillOpacity="0.4"
            />
            <path
              d="M435,220 L455,235 L475,295 L410,304 L400,305 Z"
              fill="#d97706"
              fillOpacity="0.5"
            />
            <path
              d="M495,195 L512,230 L538,268 L488,275 L455,235 Z"
              fill="#b45309"
              fillOpacity="0.6"
            />

            {/* Mountain Couloirs Tier 3 */}
            <path
              d="M280,245 Q350,225 400,230 T520,240"
              stroke="#fffbeb"
              strokeWidth="1.2"
              fill="none"
              strokeOpacity="0.4"
            />
            <path
              d="M260,285 Q340,265 400,272 T540,280"
              stroke="#fde047"
              strokeWidth="1.4"
              strokeDasharray="4 6"
              fill="none"
              strokeOpacity="0.45"
            />

            {/* Fissure Ledge dividing Tier 3 and Tier 4 */}
            <path
              d="M322,165 L348,172 L372,162 L400,168 L435,160 L458,172 L478,165"
              stroke="#fde047"
              strokeWidth={selectedKey === "min" || hoveredKey === "min" ? "3" : "2"}
              fill="none"
              strokeOpacity="0.9"
            />
          </g>

          {/* ============================================================ */}
          {/* TIER 4: КАНЦЛЕР (ВЕРШИНА / ПИК ГОРИЗОНТА)                   */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer transition-all duration-300"
            onClick={() => onSelectTier("cha")}
            onMouseEnter={() => setHoveredKey("cha")}
            onMouseLeave={() => setHoveredKey(null)}
            filter={selectedKey === "cha" || hoveredKey === "cha" ? "url(#tierGlow)" : "url(#rockShadow)"}
            opacity={selectedKey && selectedKey !== "cha" && hoveredKey !== "cha" ? 0.8 : 1}
          >
            {/* Shaded Left Flank of Peak */}
            <path
              d="M400,38 L385,65 L368,92 L345,125 L322,165 L348,172 L372,162 L400,166 Z"
              fill="url(#t4Dark)"
              stroke="#fbbf24"
              strokeWidth={selectedKey === "cha" ? "2.8" : "1.5"}
              strokeOpacity={selectedKey === "cha" ? "1" : "0.7"}
            />
            {/* Left peak facets */}
            <path
              d="M400,38 L380,95 L368,92 L385,65 Z"
              fill="#2e1405"
              fillOpacity="0.85"
            />
            <path
              d="M380,95 L398,135 L345,125 L368,92 Z"
              fill="#3a1a06"
              fillOpacity="0.8"
            />

            {/* Sunlit Right Flank of Peak */}
            <path
              d="M400,38 L400,166 L435,160 L458,172 L478,165 L455,125 L432,90 L415,62 Z"
              fill="url(#t4Lit)"
              stroke="#fef08a"
              strokeWidth={selectedKey === "cha" ? "2.8" : "1.5"}
              strokeOpacity={selectedKey === "cha" ? "1" : "0.7"}
            />
            {/* Right peak sunlit facets */}
            <path
              d="M400,38 L418,92 L400,120 L400,38 Z"
              fill="#ffffff"
              fillOpacity="0.45"
            />
            <path
              d="M418,92 L442,125 L400,150 L400,120 Z"
              fill="#fde047"
              fillOpacity="0.5"
            />
            <path
              d="M432,90 L455,125 L478,165 L435,160 L442,125 Z"
              fill="#f59e0b"
              fillOpacity="0.55"
            />

            {/* Glacial / Snow Caps on Summit */}
            <path
              d="M400,38 L392,62 L400,75 L408,58 Z"
              fill="url(#t4Snow)"
            />
            <path
              d="M392,62 L375,85 L385,92 L400,75 Z"
              fill="#ffffff"
              fillOpacity="0.75"
            />
            <path
              d="M400,75 L420,80 L428,95 L408,105 L400,75 Z"
              fill="#ffffff"
              fillOpacity="0.85"
            />

            {/* Sharp Mountain Ridge Spine (Arête) */}
            <path
              d="M400,38 L398,75 L402,115 L399,166"
              stroke="#fffbeb"
              strokeWidth="2.2"
              fill="none"
              strokeOpacity="0.9"
            />

            {/* Glowing Golden Apex Beacon / Crest Star at the Summit */}
            <g transform="translate(400, 32)">
              <circle cx="0" cy="0" r="16" fill="url(#summitAura)" opacity="0.8" />
              <circle cx="0" cy="0" r="4" fill="#ffffff" />
              {/* 8-point ray star */}
              <path
                d="M0,-14 L2,-4 L12,-2 L4,1 L6,11 L0,4 L-6,11 L-4,1 L-12,-2 L-2,-4 Z"
                fill="#fde047"
                opacity="0.95"
              />
            </g>
          </g>
        </svg>

        {/* ============================================================ */}
        {/* INTERACTIVE 3D GLASS BADGE OVERLAY (TRUE >= 14PX CSS SIZE)   */}
        {/* Positioned accurately over each mountain tier's center       */}
        {/* ============================================================ */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2">
          {/* Tier 4: Канцлер (Вершина) */}
          <div className="absolute top-[11%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => onSelectTier(tiers[0].key)}
              onMouseEnter={() => setHoveredKey(tiers[0].key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300 shadow-xl flex items-center gap-2 relative overflow-hidden cursor-pointer hover:scale-105 active:scale-95 ${
                selectedKey === "cha" || hoveredKey === "cha"
                  ? "liquid-bubble-gold border-amber-300 text-amber-950 shadow-[0_0_20px_rgba(253,224,71,0.65)]"
                  : "liquid-bubble-secondary border-amber-400/40 text-white hover:border-amber-300"
              }`}
            >
              <span className="liquid-bubble-glare" />
              <Crown className={`w-4 h-4 flex-shrink-0 ${selectedKey === "cha" || hoveredKey === "cha" ? "text-amber-950" : "text-amber-300"}`} />
              <span className="font-bold text-sm sm:text-base leading-none whitespace-nowrap">
                {tiers[0].role}
              </span>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-mono font-medium whitespace-nowrap border ${
                selectedKey === "cha" || hoveredKey === "cha"
                  ? "bg-black/20 text-amber-950 border-amber-900/30"
                  : "bg-black/50 text-amber-200 border-amber-400/30"
              }`}>
                {tiers[0].desc}
              </span>
            </button>
          </div>

          {/* Tier 3: Министр (Верхние скалы) */}
          <div className="absolute top-[34%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => onSelectTier(tiers[1].key)}
              onMouseEnter={() => setHoveredKey(tiers[1].key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300 shadow-xl flex items-center gap-2 relative overflow-hidden cursor-pointer hover:scale-105 active:scale-95 ${
                selectedKey === "min" || hoveredKey === "min"
                  ? "liquid-bubble-gold border-amber-300 text-amber-950 shadow-[0_0_20px_rgba(253,224,71,0.65)]"
                  : "liquid-bubble-secondary border-amber-400/40 text-white hover:border-amber-300"
              }`}
            >
              <span className="liquid-bubble-glare" />
              <Briefcase className={`w-4 h-4 flex-shrink-0 ${selectedKey === "min" || hoveredKey === "min" ? "text-amber-950" : "text-amber-300"}`} />
              <span className="font-bold text-sm sm:text-base leading-none whitespace-nowrap">
                {tiers[1].role}
              </span>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-mono font-medium whitespace-nowrap border ${
                selectedKey === "min" || hoveredKey === "min"
                  ? "bg-black/20 text-amber-950 border-amber-900/30"
                  : "bg-black/50 text-amber-200 border-amber-400/30"
              }`}>
                {tiers[1].desc}
              </span>
            </button>
          </div>

          {/* Tier 2: Архитектор (Горный массив) */}
          <div className="absolute top-[56%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => onSelectTier(tiers[2].key)}
              onMouseEnter={() => setHoveredKey(tiers[2].key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300 shadow-xl flex items-center gap-2 relative overflow-hidden cursor-pointer hover:scale-105 active:scale-95 ${
                selectedKey === "arc" || hoveredKey === "arc"
                  ? "liquid-bubble-gold border-amber-300 text-amber-950 shadow-[0_0_20px_rgba(253,224,71,0.65)]"
                  : "liquid-bubble-secondary border-amber-400/40 text-white hover:border-amber-300"
              }`}
            >
              <span className="liquid-bubble-glare" />
              <Cpu className={`w-4 h-4 flex-shrink-0 ${selectedKey === "arc" || hoveredKey === "arc" ? "text-amber-950" : "text-amber-300"}`} />
              <span className="font-bold text-sm sm:text-base leading-none whitespace-nowrap">
                {tiers[2].role}
              </span>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-mono font-medium whitespace-nowrap border ${
                selectedKey === "arc" || hoveredKey === "arc"
                  ? "bg-black/20 text-amber-950 border-amber-900/30"
                  : "bg-black/50 text-amber-200 border-amber-400/30"
              }`}>
                {tiers[2].desc}
              </span>
            </button>
          </div>

          {/* Tier 1: Резидент (Фундамент) */}
          <div className="absolute top-[78%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => onSelectTier(tiers[3].key)}
              onMouseEnter={() => setHoveredKey(tiers[3].key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300 shadow-xl flex items-center gap-2 relative overflow-hidden cursor-pointer hover:scale-105 active:scale-95 ${
                selectedKey === "res" || hoveredKey === "res"
                  ? "liquid-bubble-gold border-amber-300 text-amber-950 shadow-[0_0_20px_rgba(253,224,71,0.65)]"
                  : "liquid-bubble-secondary border-amber-400/40 text-white hover:border-amber-300"
              }`}
            >
              <span className="liquid-bubble-glare" />
              <Users className={`w-4 h-4 flex-shrink-0 ${selectedKey === "res" || hoveredKey === "res" ? "text-amber-950" : "text-amber-300"}`} />
              <span className="font-bold text-sm sm:text-base leading-none whitespace-nowrap">
                {tiers[3].role}
              </span>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-mono font-medium whitespace-nowrap border ${
                selectedKey === "res" || hoveredKey === "res"
                  ? "bg-black/20 text-amber-950 border-amber-900/30"
                  : "bg-black/50 text-amber-200 border-amber-400/30"
              }`}>
                {tiers[3].desc}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Level Strip below the mountain for quick navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full mt-4">
        {tiers.map((tItem) => {
          const isSelected = selectedKey === tItem.key;
          const isHovered = hoveredKey === tItem.key;
          const Icon = tItem.icon;
          return (
            <button
              key={tItem.key}
              type="button"
              onClick={() => onSelectTier(tItem.key)}
              onMouseEnter={() => setHoveredKey(tItem.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between hover:scale-[1.02] active:scale-95 ${
                isSelected
                  ? "liquid-bubble-gold text-amber-950 border-amber-400 shadow-[0_0_14px_rgba(253,224,71,0.5)]"
                  : "liquid-bubble-secondary border-white/10 text-zinc-300 hover:text-white hover:border-amber-400/40"
              }`}
            >
              <span className="liquid-bubble-glare" />
              <div className="relative z-10 flex items-center justify-between mb-1.5">
                <span className={`text-sm font-mono font-bold ${isSelected ? "text-amber-900" : "text-amber-300"}`}>
                  {tItem.levelLabel.split(" • ")[0]}
                </span>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-amber-950" : "text-amber-400"}`} />
              </div>
              <div className="relative z-10 min-w-0">
                <div className={`font-bold text-sm sm:text-base leading-snug whitespace-nowrap overflow-hidden text-ellipsis ${isSelected ? "text-amber-950" : "text-white"}`}>
                  {tItem.role}
                </div>
                <div className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isSelected ? "text-amber-900" : "text-zinc-400"}`}>
                  {tItem.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MountainHierarchy;
