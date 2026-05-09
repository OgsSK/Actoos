/**
 * VoiceRecorder Component
 * Records audio with 1-minute max duration
 * iOS Safari compatible version
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Send, Loader2, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

const MAX_DURATION = 60; // 1 minute max

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Detect iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const VoiceRecorder = ({ onSend, onCancel, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [recordingError, setRecordingError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = async () => {
    try {
      setRecordingError(null);
      
      // Simple audio constraints - iOS doesn't like complex ones
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // On iOS, don't specify mimeType - let browser choose
      let options = {};
      
      // On non-iOS, try webm
      if (!isIOS()) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create blob with recorded chunks
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) {
          setRecordingError('Aucune donnée audio enregistrée');
          return;
        }
        
        // Use the actual mime type from recorder
        const mimeType = mediaRecorder.mimeType || 'audio/mp4';
        const blob = new Blob(chunks, { type: mimeType });
        
        if (blob.size < 100) {
          setRecordingError('Enregistrement vide');
          return;
        }
        
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsPreviewing(true);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingError('Erreur d\'enregistrement');
      };

      // Start with timeslice - important for iOS
      mediaRecorder.start(1000);
      
      setIsRecording(true);
      setDuration(0);

      // Start timer with limit check
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Microphone error:', error);
      if (error.name === 'NotAllowedError') {
        setRecordingError('Microphone non autorisé');
      } else {
        setRecordingError('Impossible d\'accéder au microphone');
      }
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
  }, []);

  // Play/Pause preview
  const togglePlayback = async () => {
    if (!audioRef.current) return;
    
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
      setRecordingError('Impossible de lire l\'audio');
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Cancel and reset
  const handleCancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewing(false);
    setIsRecording(false);
    setDuration(0);
    setIsPlaying(false);
    setRecordingError(null);
    if (onCancel) onCancel();
  };

  // Send audio
  const handleSend = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      await onSend(audioBlob, duration);
      handleCancel();
    } catch (error) {
      console.error('Error sending audio:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Error state
  if (recordingError) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
        <span className="text-red-600 text-sm flex-1">{recordingError}</span>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Réessayer
        </Button>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 font-medium text-sm">REC</span>
        </div>
        <span className="text-red-500 font-mono">
          {formatTime(duration)} / {formatTime(MAX_DURATION)}
        </span>
        <div className="flex-1" />
        <Button
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="gap-1"
        >
          <Square className="w-4 h-4 fill-current" />
          Stop
        </Button>
      </div>
    );
  }

  // Preview state
  if (isPreviewing && audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          preload="auto"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayback}
          className="h-9 w-9 p-0 rounded-full flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
        
        <span className="text-sm text-emerald-700 font-mono">
          {formatTime(duration)}
        </span>
        
        <div className="flex-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSending}
          className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending}
          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              OK
            </>
          )}
        </Button>
      </div>
    );
  }

  // Default state
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startRecording}
      disabled={disabled}
      className="h-10 w-10 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600"
      title="Message vocal"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};

export default VoiceRecorder;
