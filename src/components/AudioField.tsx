import React, { useState, useRef } from 'react';
import { Mic, Square, X, Loader2, Terminal, Eye, Edit3, Copy, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { NeuronSphereCanvas } from './NeuronSphereCanvas';
import CustomAudioPlayer from './CustomAudioPlayer';
import { AlgorithmCloud } from './AlgorithmCloud';
import { AlgorithmItem } from '@/data/algorithmsData';
import { getOrGenerateUID } from '@/lib/uidHelper';

interface AudioFieldProps {
  value: string;
  onChange: (text: string) => void;
  onAudioReady?: (audioUrl: string, blob: Blob) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minHeight?: string;
  accentColor?: string;
  showPlayer?: boolean;
  selectedAlgoId?: string | null;
  onSelectAlgorithm?: (algo: AlgorithmItem) => void;
  viewMode?: 'edit' | 'markdown';
  onViewModeChange?: (mode: 'edit' | 'markdown') => void;
}

export const AudioField: React.FC<AudioFieldProps> = ({
  value,
  onChange,
  onAudioReady,
  placeholder = 'Опишите вашу нишу (например: оптовые поставки, недвижимость, онлайн-школа, автосервис) или продиктуйте голосом...',
  label = 'Ввод параметров бизнеса',
  disabled = false,
  minHeight = '120px',
  accentColor = '#E7C768',
  showPlayer = true,
  selectedAlgoId,
  onSelectAlgorithm,
  viewMode: controlledViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'edit' | 'markdown'>('edit');
  const currentViewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const setViewMode = (mode: 'edit' | 'markdown') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    setInternalViewMode(mode);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const hasMarkdownContent = /^(#|\*|-|\d+\.|>|```)/m.test(value) || value.includes('## ') || value.includes('### ') || value.length > 400;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(localUrl);
        if (onAudioReady) onAudioReady(localUrl, audioBlob);

        await handleSTTUpload(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access note:', err?.name || err?.message || err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied') || err?.name === 'PermissionDeniedError') {
        setErrorMessage('Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера или введите текст вручную.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMessage('Микрофон не обнаружен на устройстве. Подключите гарнитуру или введите текст вручную.');
      } else {
        setErrorMessage('Не удалось запустить запись с микрофона. Разрешите доступ в браузере или введите текст вручную.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSTTUpload = async (blob: Blob) => {
    setIsSTTLoading(true);
    setErrorMessage(null);

    try {
      const uid = getOrGenerateUID();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;

          const res = await fetch('/api/voice/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64,
              mime_type: blob.type || 'audio/webm',
              uid,
            }),
          });

          const data = await res.json();
          setIsSTTLoading(false);

          if (data.success && data.text) {
            const newText = data.text.trim();
            onChange(newText);
            if (data.audio_url) {
              setRecordedAudioUrl(data.audio_url);
            }
          } else {
            setErrorMessage('Распознавание речи не дало результата. Повторите запись четче или введите текст вручную.');
          }
        } catch (postErr) {
          setIsSTTLoading(false);
          setErrorMessage('Ошибка сети при отправке голосового сообщения.');
        }
      };
    } catch (e: any) {
      setIsSTTLoading(false);
      setErrorMessage('Ошибка обработки аудиопотока.');
    }
  };

  const handleClear = () => {
    onChange('');
    setRecordedAudioUrl(null);
    setErrorMessage(null);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl bg-black/60 backdrop-blur-2xl border border-amber-400/35 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all space-y-3 font-sans text-sm">
      {/* Top Header Bar: Title, Mode switcher, Char counter & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-400/25">
        <div className="flex items-center gap-2 font-mono">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            {label}:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* View mode toggle (Markdown Preview / Edit) */}
          {(hasMarkdownContent || value.length > 200) && !isRecording && (
            <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-amber-400/30">
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm transition-all cursor-pointer ${
                  currentViewMode === 'markdown'
                    ? 'bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 text-amber-200 border border-amber-400/40 font-medium shadow-[0_0_10px_rgba(231,199,104,0.2)]'
                    : 'text-amber-200/70 hover:text-white'
                }`}
                title="Форматированное отображение ТЗ (заголовки, списки, акценты)"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Оформление ТЗ</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm transition-all cursor-pointer ${
                  currentViewMode === 'edit'
                    ? 'bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 text-amber-200 border border-amber-400/40 font-medium shadow-[0_0_10px_rgba(231,199,104,0.2)]'
                    : 'text-amber-200/70 hover:text-white'
                }`}
                title="Редактировать текст"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Текст</span>
              </button>
            </div>
          )}

          {/* Copy button in markdown mode */}
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-amber-400/30 transition-all cursor-pointer shadow-sm active:scale-95 text-sm"
              title="Скопировать техническое задание"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
          )}

          {/* Clear button */}
          {(value.length > 0 || recordedAudioUrl) && !isRecording && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-amber-400/30 transition-all cursor-pointer shadow-sm active:scale-95 text-sm whitespace-nowrap"
              title="Очистить поле ввода"
            >
              <X className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Row: Left = Neural Sphere Voice Input Button, Right = Content Area */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 py-1">
        {/* Left Side: Neural Sphere Voice Input Button (1.5x size) */}
        <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5 self-center sm:self-start">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled || isSTTLoading}
            className={`group relative flex items-center justify-center w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] rounded-full border-0 bg-transparent transition-all cursor-pointer overflow-hidden shrink-0 active:scale-95 focus:outline-none ${
              isRecording
                ? 'shadow-[0_0_25px_rgba(231,199,104,0.7)] animate-pulse'
                : 'hover:shadow-[0_0_18px_rgba(231,199,104,0.4)]'
            }`}
            title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
          >
            {/* Spinning 3D Neural Sphere Canvas filling the circular container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <NeuronSphereCanvas
                isRecording={isRecording}
                size={80}
                pointCount={56}
                color={accentColor}
                lineColor="rgba(231, 199, 104, 0.45)"
                glowColor="rgba(231, 199, 104, 0.75)"
              />
            </div>

            {/* Centered 1.5x Microphone / Stop Icon inside Neural Sphere */}
            <div className="relative z-10 flex items-center justify-center pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {isRecording ? (
                <Square className="w-6 h-6 fill-amber-300 text-amber-300 drop-shadow" />
              ) : (
                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 group-hover:scale-110 transition-transform drop-shadow" />
              )}
            </div>
          </button>

          {/* Live Recording / Processing Status under the sphere */}
          {isRecording && (
            <span className="flex items-center gap-1.5 text-sm text-amber-300 font-mono font-bold animate-pulse px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {formatTimer(recordingSeconds)}
            </span>
          )}

          {isSTTLoading && (
            <span className="flex items-center gap-1.5 text-sm text-amber-300 font-medium px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 whitespace-nowrap">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              Обработка...
            </span>
          )}
        </div>

        {/* Right Side: Markdown Preview or Editable Textarea */}
        <div className="flex-1 w-full min-w-0">
          {currentViewMode === 'markdown' && value.trim() ? (
            <div className="relative group/view">
              <div
                style={{ minHeight }}
                className="w-full max-h-[440px] overflow-y-auto rounded-xl bg-black/40 border border-amber-400/30 p-4 leading-relaxed font-sans text-sm sm:text-base text-zinc-100 space-y-2 select-text"
              >
                <Markdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent mt-3 mb-2 pb-1 border-b border-amber-400/30 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base sm:text-lg font-bold text-amber-300 mt-3 mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{children}</span>
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm sm:text-base font-semibold text-amber-200 mt-2 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-zinc-200 text-sm sm:text-base leading-relaxed mb-2 last:mb-0">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 space-y-1 mb-2.5 text-zinc-200 text-sm sm:text-base marker:text-amber-400">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-zinc-200 text-sm sm:text-base marker:text-amber-400">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed pl-1">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-amber-300">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-amber-200/90">
                        {children}
                      </em>
                    ),
                    hr: () => (
                      <hr className="my-3 border-amber-400/25 border-dashed" />
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-amber-400/70 pl-3 py-1 my-2 bg-amber-400/10 rounded-r-lg text-amber-100 italic text-sm">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {value}
                </Markdown>
              </div>

              {/* Floating quick edit button */}
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 hover:text-white border border-amber-400/40 text-xs font-medium transition-all shadow-md flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer"
                title="Переключиться в режим редактирования"
              >
                <Edit3 className="w-3 h-3" />
                <span>Редактировать</span>
              </button>
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || isRecording}
              placeholder={isRecording ? 'Говорите в микрофон, идет запись голоса...' : placeholder}
              style={{ minHeight }}
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-amber-200/50 focus:outline-none resize-y leading-relaxed font-sans border-0 ring-0 p-1"
            />
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-black/70 border border-amber-400/40 text-amber-200 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Audio Player for recorded voice */}
      {showPlayer && recordedAudioUrl && !isRecording && (
        <div className="pt-1">
          <CustomAudioPlayer audioUrl={recordedAudioUrl} title="Записанное голосовое сообщение" />
        </div>
      )}

      {/* Integrated Algorithm Cloud / Cards below the input */}
      {onSelectAlgorithm && (
        <div className="pt-2 border-t border-amber-400/20">
          <AlgorithmCloud
            selectedId={selectedAlgoId}
            searchQuery={value}
            onSelect={onSelectAlgorithm}
          />
        </div>
      )}
    </div>
  );
};

export default AudioField;

