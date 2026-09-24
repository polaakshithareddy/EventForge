import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { copilotChat } from '../api/ai';
import { getOrgEvents } from '../api/events';
import useAuthStore from '../store/authStore';
import {
  FiSend,
  FiX,
  FiZap,
  FiTrash2,
  FiMessageSquare,
  FiCheck,
  FiCopy,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  'Recommend a 3-tier ticket pricing strategy',
  'Draft an attendee launch announcement email',
  'Suggest 4 high-value sponsorship deliverables',
  'Create an organizer day-of-event checklist',
];

export default function AiCopilotModal({ isOpen, onClose, initialEventId = '' }) {
  const { isAuthenticated } = useAuthStore();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [inputValue, setInputValue] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your **EventForge AI Copilot**. I can help you formulate agendas, generate marketing copy, structure ticket tiers, or draft sponsor proposals. What would you like to build?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  // Sync initialEventId if prop changes
  useEffect(() => {
    if (initialEventId) setSelectedEventId(initialEventId);
  }, [initialEventId]);

  // Fetch organizer events for context selector
  const { data: eventsData } = useQuery({
    queryKey: ['org-events-for-ai'],
    queryFn: () => getOrgEvents({ limit: 20 }),
    enabled: isAuthenticated && isOpen,
  });
  const orgEvents = eventsData?.data?.events || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const chatMutation = useMutation({
    mutationFn: (msg) =>
      copilotChat({
        message: msg,
        eventId: selectedEventId || undefined,
        history: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    onSuccess: (res) => {
      const reply =
        res.data?.response ||
        res.response ||
        res.data?.data?.response ||
        'I am ready to assist with your next question.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'AI Copilot encountered an error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing that query. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    },
  });

  const handleSendMessage = (textToSend = null) => {
    const text = (textToSend || inputValue).trim();
    if (!text || chatMutation.isPending) return;

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    chatMutation.mutate(text);
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I assist you with your conference or event?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:h-[88vh] sm:max-w-lg sm:rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-primary-900 to-purple-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <FiZap className="text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  EventForge AI Copilot
                  <span className="rounded-full bg-emerald-500/80 px-2 py-0.2 text-[10px] font-semibold text-white">
                    Live
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-200">
                  Intelligent Event Planning & Generative Strategy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={handleClearChat}
                className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition"
                title="Clear Conversation"
              >
                <FiTrash2 className="text-sm" />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition"
                title="Close"
              >
                <FiX className="text-base" />
              </button>
            </div>
          </div>

          {/* Context Selector */}
          {orgEvents.length > 0 && (
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10 text-xs">
              <span className="text-indigo-200 text-[11px]">Context:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="flex-1 rounded-md bg-white/10 border border-white/20 px-2 py-1 text-xs text-white focus:outline-none focus:bg-primary-950"
              >
                <option value="" className="text-gray-900">
                  General Event Planning
                </option>
                {orgEvents.map((ev) => (
                  <option key={ev._id} value={ev._id} className="text-gray-900">
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 text-xs">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`group relative max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-primary-600 text-white rounded-br-xs'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, idx)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                      title="Copy response"
                    >
                      {copiedIndex === idx ? (
                        <FiCheck className="text-emerald-600 text-xs" />
                      ) : (
                        <FiCopy className="text-xs" />
                      )}
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 px-1">{msg.timestamp}</span>
              </div>
            );
          })}

          {chatMutation.isPending && (
            <div className="flex items-center gap-2 text-gray-500 bg-white border border-gray-200 rounded-2xl p-3 max-w-[70%]">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-600" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-600 [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-600 [animation-delay:0.4s]" />
              </div>
              <span className="text-[11px] text-gray-400 italic">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-gray-100 bg-white p-2.5">
          <span className="text-[10px] font-semibold text-gray-400 px-1 uppercase tracking-wider block mb-1">
            Quick Prompts
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={chatMutation.isPending}
                className="flex-shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-200 bg-white p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about agendas, marketing, pricing..."
              disabled={chatMutation.isPending}
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs focus:border-primary-500 focus:outline-none disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || chatMutation.isPending}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow hover:bg-primary-700 transition disabled:opacity-40"
            >
              <FiSend className="text-xs" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
