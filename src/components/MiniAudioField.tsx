import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { NeuronSphereCanvas } from './NeuronSphereCanvas';
import { getOrGenerateUID } from '@/lib/uidHelper';

interface MiniAudioFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  onBlur?: () => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

export const MiniAudioField: React.FC<MiniAudioFieldProps> = ({
  value,
  onChange,
  placeholder = 'Введите текст или продиктуйте...',
  onEnter,
  className = '',
  disabled = false,
  id,
  onBlur,
  required = false,
  multiline = false,
  rows = 3,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const toggleRecord = async () => {
    if (disabled) return;
    setStatusMessage(null);
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          try {
            const uid = getOrGenerateUID();
            const res = await fetch('/api/voice/stt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio_base64: reader.result,
                mime_type: 'audio/webm',
                uid,
              }),
            });
            const data = await res.json();
            if (data?.text) {
              const recognized = data.text.trim();
              if (value && value.trim()) {
                onChange(`${value.trim()} ${recognized}`);
              } else {
                onChange(recognized);
              }
            }
          } catch (e) {
            console.warn('ProTalk STT mini network error', e);
          } finally {
            setLoading(false);
          }
        };
      };

      rec.start();
      setIsRecording(true);
    } catch (e: any) {
      console.warn('Microphone access note:', e?.name || e?.message || e);
      setStatusMessage('Разрешите микрофон');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const containerStyle = className
    ? className
    : 'rounded-xl border border-amber-400/35 bg-black/70 backdrop-blur-xl px-3 py-1 focus-within:border-amber-300 transition-all';

  return (
    <div className={`relative flex ${multiline ? 'items-start' : 'items-center'} justify-between gap-2.5 w-full ${containerStyle}`}>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          placeholder={isRecording ? 'Слушаю вас...' : placeholder}
          disabled={disabled || isRecording}
          className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-amber-200/50 focus:outline-none border-0 ring-0 p-0 font-sans resize-y min-h-[50px]"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
          placeholder={isRecording ? 'Слушаю вас...' : placeholder}
          disabled={disabled || isRecording}
          className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-amber-200/50 focus:outline-none border-0 ring-0 p-0 font-sans"
        />
      )}

      {/* Voice Input with Mini Neural Sphere Animation */}
      <div className={`flex items-center gap-1.5 shrink-0 ${multiline ? 'pt-0.5' : ''}`}>
        {statusMessage && (
          <span className="text-sm text-amber-300 bg-black/80 px-2 py-0.5 rounded-lg border border-amber-400/30 whitespace-nowrap">
            {statusMessage}
          </span>
        )}

        {loading ? (
          <div className="w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] flex items-center justify-center rounded-full bg-black/40 border border-amber-400/30">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleRecord}
            disabled={disabled}
            className={`group relative flex items-center justify-center w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] rounded-full border-0 bg-transparent transition-all cursor-pointer overflow-hidden shrink-0 active:scale-95 focus:outline-none ${
              isRecording
                ? 'shadow-[0_0_15px_rgba(231,199,104,0.7)] animate-pulse'
                : 'hover:shadow-[0_0_10px_rgba(231,199,104,0.4)]'
            }`}
            title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
          >
            {/* Spinning 3D Neural Sphere Canvas at 40px (exact 2x smaller than 80px) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <NeuronSphereCanvas
                isRecording={isRecording}
                size={40}
                pointCount={36}
                color="#E7C768"
                lineColor="rgba(231, 199, 104, 0.45)"
                glowColor="rgba(231, 199, 104, 0.75)"
              />
            </div>

            {/* Centered Microphone / Stop Icon inside Neural Sphere */}
            <div className="relative z-10 flex items-center justify-center pointer-events-none drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
              {isRecording ? (
                <Square className="w-3.5 h-3.5 fill-amber-300 text-amber-300 drop-shadow" />
              ) : (
                <Mic className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform drop-shadow" />
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default MiniAudioField;
