import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { Send, Paperclip, FileText, CheckCheck, Check, MessageSquare } from 'lucide-react';

export const InstructorInbox: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Conversations list
  const { data: conversations = [], refetch: refetchConversations } = useQuery<any[]>({
    queryKey: ['instructor-conversations'],
    queryFn: async () => {
      const res = await api.get('conversations/');
      return res.data.results || res.data;
    },
    refetchInterval: 6000
  });

  // 2. Fetch Messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['instructor-messages', selectedConvId],
    queryFn: async () => {
      const res = await api.get(`messages/?conversation=${selectedConvId}`);
      return res.data.results || res.data;
    },
    enabled: !!selectedConvId,
    refetchInterval: 4000
  });

  // 3. Mark Read Mutation
  const readMutation = useMutation({
    mutationFn: async (convId: string) => {
      await api.post(`conversations/${convId}/mark-read/`);
    },
    onSuccess: () => {
      refetchConversations();
    }
  });

  useEffect(() => {
    if (selectedConvId) {
      readMutation.mutate(selectedConvId);
    }
  }, [selectedConvId, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('conversation', selectedConvId || '');
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
      refetchConversations();
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

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px] border rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-xs">
      {/* Left panel: active student chats list */}
      <div className="border-r flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/30">
        <div className="p-4 border-b font-bold text-slate-800 dark:text-slate-200">
          Student Chats
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
          {conversations.map((c: any) => {
            const isActive = c.id === selectedConvId;
            return (
              <div 
                key={c.id} 
                onClick={() => setSelectedConvId(c.id)}
                className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-all ${isActive ? 'bg-slate-100/60 dark:bg-slate-950/40' : ''}`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">{c.student_name}</span>
                  <span className="text-[9px] text-slate-400">{new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-500 truncate max-w-[180px]">{c.last_message_preview || <em>No messages yet</em>}</p>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="text-center py-16 text-slate-400 font-light">
              No students have started a chat session with you yet.
            </div>
          )}
        </div>
      </div>

      {/* Right panel: message details console */}
      <div className="md:col-span-2 flex flex-col h-full justify-between bg-slate-50/30 dark:bg-slate-950/5">
        {selectedConvId && selectedConv ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-4 border-b font-bold text-slate-800 dark:text-slate-250 flex justify-between items-center shadow-sm">
              <span>Chatting with {selectedConv.student_name}</span>
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m: any) => {
                const isMe = m.sender === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-2xl space-y-1.5 shadow-sm ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-900 border rounded-bl-none text-slate-850 dark:text-slate-205'}`}>
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

                      {/* Timestamp & double checkmarks */}
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
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="bg-white dark:bg-slate-900 border-t p-4 space-y-2.5">
              {selectedFile && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border text-[10px]">
                  <span className="text-slate-550 font-bold truncate max-w-[250px]">{selectedFile.name}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedFile(null)} 
                    className="font-bold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex gap-2.5">
                <label className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-slate-400 flex items-center justify-center shrink-0">
                  <Paperclip className="h-4.5 w-4.5" />
                  <input 
                    type="file" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }} 
                    className="hidden" 
                  />
                </label>
                <Input
                  placeholder="Type your response to this student..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="text-xs flex-1 py-1.5"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="shrink-0 flex items-center justify-center py-2.5 px-4"
                  isLoading={sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 font-light p-6">
            <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
            <p>Select a student conversation from the list to view chat logs and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
};
