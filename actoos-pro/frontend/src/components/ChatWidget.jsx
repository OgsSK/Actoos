/**
 * ChatWidget - Real-time chat between Admin and Technicians
 * 
 * Migrated to use Supabase directly
 * Supports text messages and voice notes
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeEvents, EventType } from '../hooks/useRealtimeEvents';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, Send, X, User, Clock, ChevronLeft, Loader2, Pencil, Check, XCircle, Mic 
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { VoiceRecorder } from './VoiceRecorder';
import { AudioPlayer } from './AudioPlayer';

// Chat Button with unread badge
export const ChatButton = ({ onClick, unreadCount = 0 }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative h-9 px-3"
      data-testid="chat-button"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Chat
      {unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

// Floating Chat Button (for mobile/tech app)
export const FloatingChatButton = ({ onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-transform active:scale-95"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      data-testid="floating-chat-button"
    >
      <MessageCircle className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Format date for message grouping
const formatMessageDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, 'dd MMMM yyyy', { locale: fr });
};

// Format time for individual messages
const formatMessageTime = (dateStr) => {
  return format(new Date(dateStr), 'HH:mm');
};

// Check if message is within 15-minute edit window
const isEditable = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now - created) / 1000 / 60;
  return diffMinutes <= 15;
};

// Single Message Component with Edit capability and Voice support
const ChatMessage = ({ message, isOwn, showSender, onEdit, editingId, onSaveEdit, onCancelEdit, editValue, setEditValue }) => {
  const canEdit = isOwn && isEditable(message.created_at) && message.message_type !== 'voice';
  const isEditing = editingId === message.id;
  const isVoiceMessage = message.message_type === 'voice';
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-2 relative ${
          isOwn 
            ? 'bg-emerald-600 text-white rounded-br-md' 
            : 'bg-slate-100 text-slate-900 rounded-bl-md'
        }`}
      >
        {showSender && !isOwn && (
          <p className="text-xs font-medium text-emerald-600 mb-1">
            {message.sender_name}
          </p>
        )}
        
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 text-sm rounded border-2 border-emerald-400 text-slate-900 resize-none bg-white"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium flex items-center gap-1"
                title="Annuler"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={() => onSaveEdit(message.id, editValue)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium flex items-center gap-1"
                title="Enregistrer"
              >
                <Check className="w-4 h-4" />
                OK
              </button>
            </div>
          </div>
        ) : isVoiceMessage ? (
          <>
            {/* Voice message with audio player */}
            <div className="flex items-center gap-2 mb-1">
              <Mic className={`w-4 h-4 ${isOwn ? 'text-emerald-100' : 'text-emerald-500'}`} />
              <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-slate-500'}`}>
                Message vocal
              </span>
            </div>
            <AudioPlayer 
              src={message.audio_url} 
              duration={message.audio_duration}
              isOwn={isOwn}
            />
            <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
              <span className="text-xs">
                {formatMessageTime(message.created_at)}
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
              <span className="text-xs">
                {formatMessageTime(message.created_at)}
              </span>
              {message.is_edited && (
                <span className="text-xs italic">(modifié)</span>
              )}
            </div>
          </>
        )}
        
        {/* Edit button - only visible on hover for own editable text messages */}
        {canEdit && !isEditing && (
          <button
            onClick={() => onEdit(message)}
            className={`absolute -top-2 -right-2 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${
              isOwn ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'bg-white hover:bg-slate-100 text-slate-600'
            }`}
            title="Modifier (15 min max)"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

// Conversation List (for Admin view)
const ConversationList = ({ conversations, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p>Aucun technicien</p>
        <p className="text-sm mt-1">Ajoutez des techniciens à votre entreprise</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {conversations.map((conv) => (
        <button
          key={conv.user_id}
          onClick={() => onSelect(conv)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors"
          data-testid={`conversation-${conv.user_id}`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900 truncate">{conv.user_name}</p>
              {conv.last_message_at && (
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {formatMessageTime(conv.last_message_at)}
                </span>
              )}
            </div>
            {conv.last_message ? (
              <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Aucun message</p>
            )}
          </div>
          {conv.unread_count > 0 && (
            <Badge className="bg-emerald-500 text-white flex-shrink-0">
              {conv.unread_count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
};

// Message Thread View
const MessageThread = ({ 
  conversation, 
  messages, 
  onSend,
  onSendVoice,
  onEdit, 
  onBack, 
  loading,
  sendingMessage,
  editingId,
  editValue,
  setEditValue,
  onSaveEdit,
  onCancelEdit
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (!isRecordingMode) {
      inputRef.current?.focus();
    }
  }, [isRecordingMode]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;
    onSend(newMessage.trim());
    setNewMessage('');
  };

  const handleVoiceSend = async (audioBlob, duration) => {
    await onSendVoice(audioBlob, duration);
    setIsRecordingMode(false);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
          <User className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{conversation.user_name}</p>
          <p className="text-xs text-slate-500 capitalize">{conversation.role}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Aucun message</p>
            <p className="text-sm mt-1">Envoyez le premier message !</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500">
                  {date}
                </span>
              </div>
              {msgs.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  isOwn={msg.sender_id === conversation.currentUserId}
                  showSender={idx === 0 || msgs[idx - 1]?.sender_id !== msg.sender_id}
                  onEdit={onEdit}
                  editingId={editingId}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input area - switches between text and voice */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {isRecordingMode ? (
          <VoiceRecorder 
            onSend={handleVoiceSend}
            onCancel={() => setIsRecordingMode(false)}
            disabled={sendingMessage}
          />
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1"
              disabled={sendingMessage}
              data-testid="chat-input"
            />
            
            {/* Mic button - always visible, activates voice recording */}
            <button
              type="button"
              onClick={() => {
                if (!sendingMessage && !newMessage.trim()) {
                  setIsRecordingMode(true);
                }
              }}
              disabled={sendingMessage || newMessage.trim().length > 0}
              className={`h-10 w-10 p-0 rounded-full flex-shrink-0 flex items-center justify-center border-0 outline-none touch-manipulation ${
                newMessage.trim().length > 0 || sendingMessage
                  ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' 
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 active:bg-emerald-100'
              }`}
              title="Message vocal"
              data-testid="voice-record-btn"
            >
              <Mic className="w-5 h-5" />
            </button>
            
            {/* Send button - always visible */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className={`h-10 px-4 rounded-lg flex-shrink-0 flex items-center justify-center font-medium touch-manipulation ${
                !newMessage.trim() || sendingMessage
                  ? 'bg-emerald-300 cursor-not-allowed text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
              }`}
              data-testid="send-message-btn"
            >
              {sendingMessage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Main Chat Widget Component
export const ChatWidget = ({ isOpen, onClose, isTech = false }) => {
  const { api, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Edit message state
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Load conversations from Supabase
  const loadConversations = useCallback(async () => {
    if (!user?.entreprise_id) return;
    
    try {
      setLoading(true);
      
      // For admin: show all technicians
      // For tech: show admin only
      let query = supabase
        .from('users')
        .select('id, nom, prenom, email, role')
        .eq('entreprise_id', user.entreprise_id)
        .neq('id', user.id);
      
      // Admin sees technicians, tech sees admins
      if (user.role === 'admin') {
        query = query.eq('role', 'technicien');
      } else {
        query = query.eq('role', 'admin');
      }
      
      const { data: users, error } = await query.order('nom');
      
      if (error) throw error;
      
      // Get last message for each user (optional - for display)
      const conversationsWithLastMessage = await Promise.all(
        (users || []).map(async (u) => {
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('content, created_at, sender_id')
            .or(`and(sender_id.eq.${u.id},recipient_id.eq.${user.id}),and(sender_id.eq.${user.id},recipient_id.eq.${u.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Count unread messages from this user
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', u.id)
            .eq('recipient_id', user.id)
            .eq('is_read', false);
          
          return {
            user_id: u.id,
            user_name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email,
            user_role: u.role,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            unread_count: unreadCount || 0
          };
        })
      );
      
      // Show ALL users (technicians for admin), not just those with messages
      // Sort by last message time (those with messages first)
      const sorted = conversationsWithLastMessage.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
      
      setConversations(sorted);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.entreprise_id, user?.id, user?.role]);

  // Load messages for a conversation from Supabase
  const loadMessages = useCallback(async (userId) => {
    if (!user?.id) return;
    
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);
        
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user?.id]);

  // Load unread count from Supabase
  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user?.id]);

  // Send message via Supabase
  const handleSendMessage = async (content) => {
    if (!selectedConversation || !user?.id) return;
    
    try {
      setSendingMessage(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.user_id,
          content,
          entreprise_id: user.entreprise_id,
          is_read: false,
          message_type: 'text',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add message to list
      setMessages(prev => [...prev, data]);
      
      // Update conversation list
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSendingMessage(false);
    }
  };

  // Send voice message via Supabase Storage
  const handleSendVoice = async (audioBlob, duration) => {
    if (!selectedConversation || !user?.id) return;
    
    try {
      setSendingMessage(true);
      
      // Determine correct file extension based on MIME type
      const mimeType = audioBlob.type || 'audio/mp4';
      let extension = 'mp4'; // Default for iOS
      
      if (mimeType.includes('webm')) {
        extension = 'webm';
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
      } else if (mimeType.includes('wav')) {
        extension = 'wav';
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) {
        extension = 'mp4';
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `voice_${timestamp}.${extension}`;
      
      console.log('Upload info:', { mimeType, extension, fileName, blobSize: audioBlob.size });
      
      // Convert Blob to File for better compatibility
      const audioFile = new File([audioBlob], fileName, { 
        type: mimeType,
        lastModified: Date.now()
      });
      
      console.log('File created:', { name: audioFile.name, size: audioFile.size, type: audioFile.type });
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, audioFile, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erreur d'upload: ${uploadError.message || 'Erreur inconnue'}`);
      }
      
      console.log('Upload success:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      const audioUrl = urlData.publicUrl;
      console.log('Audio URL:', audioUrl);
      
      // Create message in database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.user_id,
          content: '🎤 Message vocal',
          entreprise_id: user.entreprise_id,
          is_read: false,
          message_type: 'voice',
          audio_url: audioUrl,
          audio_duration: Math.round(duration),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      console.log('Message insert result:', { data, error });
      
      if (error) {
        // If columns don't exist, try without voice-specific columns
        if (error.message?.includes('column')) {
          console.warn('Voice columns missing, trying basic insert');
          const { data: basicData, error: basicError } = await supabase
            .from('chat_messages')
            .insert({
              sender_id: user.id,
              recipient_id: selectedConversation.user_id,
              content: `🎤 Message vocal (${Math.round(duration)}s) - ${audioUrl}`,
              entreprise_id: user.entreprise_id,
              is_read: false,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (basicError) throw basicError;
          setMessages(prev => [...prev, basicData]);
        } else {
          throw error;
        }
      } else {
        // Add message to list
        setMessages(prev => [...prev, data]);
      }
      
      // Update conversation list
      loadConversations();
      
      toast.success('Message vocal envoyé');
      console.log('=== VOICE UPLOAD SUCCESS ===');
    } catch (error) {
      console.error('=== VOICE UPLOAD ERROR ===');
      console.error('Error details:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du message vocal');
    } finally {
      setSendingMessage(false);
    }
  };

  // Start editing a message
  const handleStartEdit = (message) => {
    setEditingId(message.id);
    setEditValue(message.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save edited message via Supabase
  const handleSaveEdit = async (messageId, newContent) => {
    if (!newContent.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }
    
    try {
      // Try to update with is_edited fields
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: newContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);
      
      // If error, try without is_edited fields (columns may not exist)
      if (error) {
        console.warn('Edit with is_edited failed, trying content only:', error.message);
        const { error: fallbackError } = await supabase
          .from('chat_messages')
          .update({ content: newContent.trim() })
          .eq('id', messageId)
          .eq('sender_id', user.id);
        
        if (fallbackError) throw fallbackError;
      }
      
      // Update message in local state (always mark as edited locally for UI)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent.trim(), is_edited: true, edited_at: new Date().toISOString() }
          : msg
      ));
      
      setEditingId(null);
      setEditValue('');
      toast.success('Message modifié');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  // Handle real-time chat messages
  const { isConnected } = useRealtimeEvents({
    enabled: isOpen,
    showToasts: false,
    onInterventionChange: null,
    onDevisChange: null,
    onFactureChange: null,
    onSyncRequired: null,
  });

  // Listen for chat_message event manually via the hook
  useEffect(() => {
    // Initial load when chat opens
    if (isOpen) {
      loadConversations();
      loadUnreadCount();
    }
    // Note: We don't poll anymore to avoid scroll issues
    // Real-time updates will be handled by Supabase subscriptions
  }, [isOpen, loadConversations, loadUnreadCount]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!isOpen || !user?.id || !user?.entreprise_id) return;
    
    // Create a unique channel name to avoid conflicts
    const channelName = `chat_${user.entreprise_id}_${user.id}_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `entreprise_id=eq.${user.entreprise_id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          
          // Check if this message is relevant to the current user
          const isForMe = newMsg.recipient_id === user.id;
          const isFromMe = newMsg.sender_id === user.id;
          
          if (!isForMe && !isFromMe) return;
          
          // If we have a conversation open, add the message if it's part of it
          if (selectedConversation) {
            const isInCurrentConversation = 
              (newMsg.sender_id === selectedConversation.user_id && newMsg.recipient_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.recipient_id === selectedConversation.user_id);
            
            if (isInCurrentConversation) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              
              // Mark as read if it's for me and I'm viewing this conversation
              if (isForMe) {
                supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', newMsg.id)
                  .then(() => {});
              }
            }
          }
          
          // Refresh unread count if message is for me
          if (isForMe) {
            loadUnreadCount();
          }
          
          // Refresh conversation list for last message preview
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `entreprise_id=eq.${user.entreprise_id}`,
        },
        (payload) => {
          // Update message in list (for edits)
          const updatedMsg = payload.new;
          setMessages(prev => prev.map(m => 
            m.id === updatedMsg.id ? updatedMsg : m
          ));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Chat Realtime] Connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Chat Realtime] Error connecting');
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id, user?.entreprise_id, selectedConversation?.user_id, loadUnreadCount, loadConversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.user_id);
    }
  }, [selectedConversation, loadMessages]);

  // Auto-select conversation for tech (they only have one - admin)
  useEffect(() => {
    if (isTech && conversations.length > 0 && !selectedConversation) {
      setSelectedConversation({
        ...conversations[0],
        currentUserRole: 'tech',
        currentUserId: user?.id
      });
    }
  }, [isTech, conversations, selectedConversation, user?.id]);

  const handleSelectConversation = (conv) => {
    setSelectedConversation({
      ...conv,
      currentUserRole: user?.role || 'admin',
      currentUserId: user?.id
    });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    setEditingId(null);
    setEditValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Messagerie
            {isConnected && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full ml-2" title="Connecté" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {selectedConversation ? (
            <MessageThread
              conversation={selectedConversation}
              messages={messages}
              onSend={handleSendMessage}
              onSendVoice={handleSendVoice}
              onEdit={handleStartEdit}
              onBack={isTech ? onClose : handleBack}
              loading={messagesLoading}
              sendingMessage={sendingMessage}
              editingId={editingId}
              editValue={editValue}
              setEditValue={setEditValue}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          ) : (
            <ConversationList
              conversations={conversations}
              onSelect={handleSelectConversation}
              loading={loading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to get unread count with real-time updates
export const useChatUnread = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      
      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      // Silently fail
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  // Real-time subscription for unread count
  useEffect(() => {
    if (!user?.id || !user?.entreprise_id) return;
    
    const channelName = `unread_${user.id}_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // New message received, increment count immediately
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Message was marked as read, refresh count
          if (payload.new?.is_read === true && payload.old?.is_read === false) {
            loadUnread();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.entreprise_id, loadUnread]);

  return { unreadCount, refreshUnread: loadUnread };
};

export default ChatWidget;
