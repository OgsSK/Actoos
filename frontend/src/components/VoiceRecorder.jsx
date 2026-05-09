/**
 * VoiceRecorder Component
 * Records audio with 1-minute max duration
 * Shows preview before sending
 * Supports iOS Safari and Chrome/Firefox
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

// Get the best supported mime type for the browser
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
    ''  // Let browser choose default
  ];
  
  for (const type of types) {
    if (type === '' || MediaRecorder.isTypeSupported(type)) {
      console.log('Using audio format:', type || 'browser default');
      return type;
    }
  }
  return '';
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
      console.log('=== STARTING RECORDING ===');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        } 
      });
      
      console.log('Got audio stream:', stream.getAudioTracks()[0].label);
      streamRef.current = stream;
      
      // Get best supported format
      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder with options
      const options = mimeType ? { mimeType } : {};
      console.log('MediaRecorder options:', options);
      
      const mediaRecorder = new MediaRecorder(stream, options);
      console.log('MediaRecorder created, actual mimeType:', mediaRecorder.mimeType);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Created blob, size:', blob.size, 'type:', blob.type);
        
        if (blob.size < 1000) {
          console.error('Blob too small, recording may have failed');
          setRecordingError('Enregistrement trop court ou vide');
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
        console.error('MediaRecorder error:', event.error);
        setRecordingError('Erreur d\'enregistrement');
      };

      // Start recording - collect data every 250ms for better compatibility
      mediaRecorder.start(250);
      console.log('Recording started');
      
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setRecordingError('Impossible d\'accéder au microphone');
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Auto-stop at max duration
  useEffect(() => {
    if (duration >= MAX_DURATION && isRecording) {
      stopRecording();
    }
  }, [duration, isRecording, stopRecording]);

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
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Cancel and reset
  const handleCancel = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewing(false);
    setDuration(0);
    setIsPlaying(false);
    setRecordingError(null);
    if (onCancel) onCancel();
  };

  // Send audio
  const handleSend = async () => {
    if (!audioBlob) return;
    
    console.log('Sending audio, blob size:', audioBlob.size);
    setIsSending(true);
    try {
      await onSend(audioBlob, duration);
      handleCancel(); // Reset after successful send
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
        <span className="text-red-600 text-sm">{recordingError}</span>
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
          <span className="text-red-600 font-medium">Enregistrement...</span>
        </div>
        <span className="text-red-500 font-mono text-lg">
          {formatTime(duration)} / {formatTime(MAX_DURATION)}
        </span>
        <div className="flex-1" />
        <Button
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="gap-2"
        >
          <Square className="w-4 h-4 fill-current" />
          Arrêter
        </Button>
      </div>
    );
  }

  // Preview state
  if (isPreviewing && audioUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          className="hidden"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayback}
          className="h-10 w-10 p-0 rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
        
        <div className="flex-1">
          <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-100"
              style={{ width: isPlaying ? '100%' : '0%' }}
            />
          </div>
          <span className="text-sm text-emerald-700 mt-1">
            {formatTime(duration)}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSending}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Envoyer
        </Button>
      </div>
    );
  }

  // Default state - show mic button
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startRecording}
      disabled={disabled}
      className="h-10 w-10 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600"
      title="Enregistrer un message vocal"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};

export default VoiceRecorder;
