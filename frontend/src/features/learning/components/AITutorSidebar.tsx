import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Sparkles, Send, User, Brain } from 'lucide-react';
import { toast } from '../../../store/toastStore';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AITutorSidebarProps {
  courseId: string;
  lessonId: string;
}

export const AITutorSidebar: React.FC<AITutorSidebarProps> = ({ courseId, lessonId: _lessonId }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I am your AI Study Tutor. Ask me anything about this course, and I will answer grounded in the lesson materials!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages list changes
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Append user query to chat state
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${api.defaults.baseURL}ai/tutor/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('skillsphere-token')}`
        },
        body: JSON.stringify({
          course_id: courseId,
          prompt: userMessage,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('AI gateway error. Limit reached or server offline.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('ReadableStream not supported.');

      // Append empty model message placeholder
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      let done = false;
      let modelText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.session_id) {
                  setSessionId(data.session_id);
                } else if (data.text) {
                  modelText += data.text;
                  setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { role: 'model', content: modelText };
                    return next;
                  });
                }
              } catch (e) {
                // Ignore parse failures on partial SSE packets
              }
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to get tutor response.');
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an issue connecting to the AI Gateway.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[450px] sm:h-[550px] flex flex-col overflow-hidden border-slate-200/60 dark:border-slate-800/40 bg-white dark:bg-slate-900 rounded-2xl shadow-lg">
      <div className="p-4 border-b dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Brain className="h-5 w-5 text-brand-600 animate-pulse" />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">AI Active Tutor</span>
        </div>
        <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950/20 px-2 py-0.5 rounded-full font-bold">RAG Enabled</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-scale-in`}>
            <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350'}`}>
              {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1].content === '' && (
          <div className="flex gap-2 max-w-[85%] items-center animate-pulse">
            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Brain className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium flex items-center gap-1.5">
              <span>Thinking</span>
              <span className="flex gap-1 items-center pt-1.5">
                <span className="w-1.5 h-1.5 bg-slate-450 dark:bg-slate-550 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-450 dark:bg-slate-550 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-450 dark:bg-slate-550 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t dark:border-slate-850 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Django ORM questions, summarize..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
        />
        <Button size="sm" type="submit" disabled={loading} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
};
