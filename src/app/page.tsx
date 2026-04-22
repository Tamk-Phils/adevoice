'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Loader2, Sparkles, User, Bot, Command, Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Define quantum computing in simple terms',
  'Write a professional email for a project pitch',
  'Help me debug a React useEffect hook',
  'Summarise the latest trends in AI for 2024',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isAudioPlayingRef = useRef(false);
  const lastProcessedSentenceIndexRef = useRef(0);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // ──────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────
  const performSubmit = async (userText: string) => {
    const userMsg: Message = { role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], model: 'gemma:2b' }),
      });

      if (!res.ok) throw new Error();
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      lastProcessedSentenceIndexRef.current = 0;
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const d = JSON.parse(line);
            if (d.message?.content) {
              aiContent += d.message.content;
              setMessages((prev) => {
                const n = [...prev];
                n[n.length - 1].content = aiContent;
                return n;
              });

              // Process sentences for TTS
              if (isVoiceEnabled) {
                const remainingText = aiContent.slice(lastProcessedSentenceIndexRef.current);
                // Trigger on punctuation OR if we have > 60 chars and see a space (fallback)
                const sentenceEndRegex = /[^.!?]+[.!?]+|[^.!?]{60,}(?=\s)/g;
                const sentences = remainingText.match(sentenceEndRegex);
                
                if (sentences) {
                  for (const sentence of sentences) {
                    const trimmed = sentence.trim();
                    if (trimmed.length > 3) {
                      handleTTS(trimmed);
                      lastProcessedSentenceIndexRef.current += sentence.length;
                    }
                  }
                } else if (remainingText.split(' ').length > 15) {
                  // Fallback: trigger after 15 words if no punctuation found yet
                  handleTTS(remainingText.trim());
                  lastProcessedSentenceIndexRef.current += remainingText.length;
                }
              }
            }
            if (d.done) break;
          } catch { /* skip */ }
        }
      }

      // Handle any remaining text after stream ends
      if (isVoiceEnabled) {
        const finalFragment = aiContent.slice(lastProcessedSentenceIndexRef.current).trim();
        if (finalFragment.length > 0) {
          handleTTS(finalFragment);
        }
      }
    } catch {
      const msg = 'Error connecting to Ade engine.';
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isAudioPlayingRef.current = false;
      return;
    }

    isAudioPlayingRef.current = true;
    const url = audioQueueRef.current.shift()!;
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      playNextInQueue();
    };

    audio.play().catch(err => {
      console.error('Playback error:', err);
      playNextInQueue();
    });
  };

  const handleTTS = async (text: string) => {
    setIsTtsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      audioQueueRef.current.push(url);
      if (!isAudioPlayingRef.current) {
        playNextInQueue();
      }
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsTtsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSTT = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      // Ensure we provide a filename for the blob
      formData.append('audio', blob, 'recording.wav');

      const res = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error();
      const { text } = await res.json();
      if (text) {
        performSubmit(text);
      }
    } catch (err) {
      console.error('STT error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    performSubmit(text);
  };

  const handleSuggestion = (s: string) => {
    if (isLoading) return;
    performSubmit(s);
  };

  return (
    <div className="ade-root">
      {/* ── HEADER ── */}
      <header className="ade-header">
        <div className="ade-logo">
          <div className="ade-logo-icon">
            <Sparkles size={22} color="white" fill="white" />
          </div>
          <div>
            <div className="ade-logo-text">Ade v2.0</div>
            <div className="ade-logo-sub">Neural Intelligence Layer</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
             className={`px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all duration-300 ${
               isVoiceEnabled 
                 ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                 : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300'
             }`}
             title={isVoiceEnabled ? 'Disable Voice Mode' : 'Enable Voice Mode'}
           >
             {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
             <span className="text-[10px] font-bold uppercase tracking-wider">
               {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
             </span>
           </button>

           <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 uppercase tracking-widest flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
             Local Edge
           </div>
        </div>
      </header>

      {/* ── MESSAGES ── */}
      <div className="ade-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Command size={80} />
            </div>
            <h1 className="empty-title">Welcome to Ade</h1>
            <p className="empty-sub">
              Experience the future of private, fast, and fully local intelligence. 
              What shall we create today?
            </p>
            <div className="suggestion-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            <div className={`msg-avatar ${m.role === 'user' ? 'user-av' : 'ai-av'}`}>
              {m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
            </div>
            <div className="msg-body">
              <div className="msg-bubble">
                {m.role === 'assistant' ? (
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="msg-row assistant">
            <div className="msg-avatar ai-av">
              <Loader2 size={18} className="animate-spin" />
            </div>
            <div className="msg-body">
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ── */}
      <div className="ade-input-area">
        <form onSubmit={handleSubmit} className="input-frame">
          <textarea
            ref={textareaRef}
            className="ade-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Search neural paths or message Ade..."
            rows={1}
          />

          {isRecording && (
            <div className="voice-visualizer">
              <div className="vis-bar" />
              <div className="vis-bar" />
              <div className="vis-bar" />
              <div className="vis-bar" />
              <div className="vis-bar" />
            </div>
          )}

          <button
            type="button"
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={isLoading || (!input.trim() && !isRecording)}
          >
            {isLoading
              ? <Loader2 size={20} className="animate-spin" />
              : <Send size={20} />}
          </button>
        </form>

        <p className="ade-footer">Private · Secured · Locally Hosted Intelligence</p>
      </div>
    </div>
  );
}
