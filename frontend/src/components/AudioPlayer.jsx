/**
 * AudioPlayer Component
 * Compact audio player for chat voice messages
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00';
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
  const [errorMsg, setErrorMsg] = useState('');
  
  const audioRef = useRef(null);

  // Debug: log the src
  useEffect(() => {
    console.log('AudioPlayer src:', src);
    console.log('AudioPlayer initialDuration:', initialDuration);
  }, [src, initialDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      console.error('Audio error:', e, audio.error);
      setError(true);
      setErrorMsg(audio.error?.message || 'Erreur audio');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('Audio can play');
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      console.log('Audio load start');
      setIsLoading(true);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Try to load the audio
    audio.load();

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

  const togglePlayback = async () => {
    if (!audioRef.current || error) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError(true);
      setErrorMsg('Lecture impossible');
    }
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
  const displayDuration = duration || initialDuration || 0;

  if (error) {
    return (
      <div className={`flex items-center gap-2 py-1 ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
        <span className="text-xs">Audio indisponible</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio 
        ref={audioRef} 
        src={src} 
        preload="auto"
        className="hidden" 
      />
      
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
          {/* Generate waveform bars */}
          {Array.from({ length: 20 }).map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            // Use deterministic height based on index
            const height = 8 + Math.sin(i * 0.8) * 6 + (i % 3) * 2;
            
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
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
