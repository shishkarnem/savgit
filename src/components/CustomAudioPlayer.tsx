import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface CustomAudioPlayerProps {
  audioUrl: string;
  title?: string;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  audioUrl,
  title = 'Голосовая запись',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDuration = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          if (isMounted && decoded.duration) {
            setDuration(decoded.duration);
          }
        }
      } catch (e) {
        // Fallback handled by audio element metadata
      }
    };

    fetchDuration();
    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-black/75 border border-amber-400/30 backdrop-blur-2xl shadow-xl text-white">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <div className="flex items-center gap-2 sm:hidden text-sm font-medium text-amber-200">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>{title}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        <div className="hidden sm:flex items-center justify-between text-sm">
          <span className="text-amber-100 font-medium">{title}</span>
          <span className="text-amber-200/80 font-mono text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />

        <div className="flex justify-between sm:hidden text-sm text-amber-200/80 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomAudioPlayer;
