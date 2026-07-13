import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { Send, Paperclip, FileText, CheckCheck, Check } from 'lucide-react';

interface ChatConsoleProps {
  instructorId: string;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({ instructorId }) => {
  const { user } = useAuthStore();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Get or Create Conversation
  const { isLoading: isLoadingConv } = useQuery({
    queryKey: ['chat-conversation', user?.id, instructorId],
    queryFn: async () => {
      const res = await api.post('conversations/', { instructor: instructorId });
      setActiveConversationId(res.data.id);
      return res.data;
    },
    enabled: !!instructorId && !!user?.id
  });

  // 2. Fetch Messages for this conversation (polls every 4 seconds)
  const { data: messages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['chat-messages', user?.id, activeConversationId],
    queryFn: async () => {
      const res = await api.get(`messages/?conversation=${activeConversationId}`);
      return res.data.results || res.data;
    },
    enabled: !!activeConversationId && !!user?.id,
    refetchInterval: 4000
  });

  // 3. Mark read mutation on Mount / Message fetch
  const readMutation = useMutation({
    mutationFn: async () => {
      if (activeConversationId) {
        await api.post(`conversations/${activeConversationId}/mark-read/`);
      }
    }
  });

  useEffect(() => {
    if (messages.length > 0) {
      // Trigger mark read
      readMutation.mutate();
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('conversation', activeConversationId || '');
      formData.append('content', typedMessage);
      if (selectedFile) {
        formData.append('attachment', selectedFile);
      }

      await api.post('messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    onSuccess: () => {
      setTypedMessage('');
      setSelectedFile(null);
      refetchMessages();
    },
    onError: () => {
      toast.error('Failed to send message.');
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() && !selectedFile) return;
    sendMessageMutation.mutate();
  };

  if (isLoadingConv) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-xs text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
        <span>Opening chat session...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-3xl bg-slate-50/50 dark:bg-slate-900/10 overflow-hidden h-[400px] text-xs">
      {/* Chat header */}
      <div className="bg-white dark:bg-slate-900 p-3 border-b flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
        <span>Conversation with Course Instructor</span>
        <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" title="Connected"></span>
      </div>

      {/* Messages console area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m: any) => {
          const isMe = m.sender === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in`}>
              <div className={`max-w-[75%] rounded-2xl p-3 space-y-1.5 ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-900 border rounded-bl-none text-slate-850 dark:text-slate-205'}`}>
                {!isMe && <p className="font-bold text-[9px] text-slate-450 dark:text-slate-400">{m.sender_name}</p>}
                
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                
                {/* File Attachment */}
                {m.attachment && (
                  <div className="mt-1 pt-1.5 border-t border-white/20 flex items-center gap-1.5 text-[10px]">
                    <FileText className="h-3.5 w-3.5" />
                    <a 
                      href={`${api.defaults.baseURL?.replace('/api/v1/', '')}${m.attachment}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={`font-semibold hover:underline ${isMe ? 'text-white' : 'text-brand-600'}`}
                    >
                      Download Attachment
                    </a>
                  </div>
                )}

                {/* Timestamp & read receipts */}
                <div className="flex items-center justify-end gap-1 text-[8px] text-right text-slate-300">
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    m.is_read ? (
                      <span title="Read"><CheckCheck className="h-3 w-3 text-emerald-300" /></span>
                    ) : (
                      <span title="Sent"><Check className="h-3 w-3 text-slate-300" /></span>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>

        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-light leading-relaxed">
            Start the conversation by asking your instructor a question!
          </div>
        )}
      </div>

      {/* Input controls footer */}
      <form onSubmit={handleSend} className="bg-white dark:bg-slate-900 border-t p-3 space-y-2">
        {selectedFile && (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border">
            <span className="text-[10px] text-slate-550 font-bold truncate max-w-[200px]">{selectedFile.name}</span>
            <button 
              type="button" 
              onClick={() => setSelectedFile(null)} 
              className="text-[9px] font-bold text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <label className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-slate-400 flex items-center justify-center shrink-0">
            <Paperclip className="h-4 w-4" />
            <input 
              type="file" 
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }} 
              className="hidden" 
            />
          </label>
          <Input
            placeholder="Type your message..."
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            className="text-xs flex-1 py-1"
          />
          <Button 
            type="submit" 
            size="sm" 
            className="shrink-0 flex items-center justify-center p-2.5"
            isLoading={sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
