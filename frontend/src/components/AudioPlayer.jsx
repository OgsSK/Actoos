/**
 * AudioPlayer Component
 * Compact audio player for chat voice messages
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ src, duration: initialDuration, isOwn = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [error, setError] = useState(false);
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlayback = () => {
    if (!audioRef.current || error) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center gap-2 py-1 ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
        <span className="text-xs">Audio indisponible</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isOwn 
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Progress bar and time */}
      <div className="flex-1 space-y-1">
        {/* Waveform-style progress bar */}
        <div 
          className={`h-6 rounded flex items-center gap-0.5 cursor-pointer ${
            isOwn ? 'bg-emerald-700/30' : 'bg-slate-200'
          }`}
          onClick={handleSeek}
        >
          {/* Generate fake waveform bars */}
          {Array.from({ length: 20 }).map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            const height = 8 + Math.sin(i * 0.8) * 6 + Math.random() * 4;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isActive
                    ? isOwn ? 'bg-white' : 'bg-emerald-500'
                    : isOwn ? 'bg-emerald-100/40' : 'bg-slate-300'
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
        
        {/* Time display */}
        <div className={`flex justify-between text-xs ${isOwn ? 'text-emerald-100' : 'text-slate-500'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
