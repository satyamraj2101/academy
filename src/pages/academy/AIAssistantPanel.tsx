import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, ClipboardCheck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { academyAPI } from '../../academy/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PracticeQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface AIAssistantPanelProps {
  lessonId: string;
  lessonTitle: string;
}

export function AIAssistantPanel({ lessonId, lessonTitle }: AIAssistantPanelProps) {
  const [mode, setMode] = useState<'chat' | 'quiz_me'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "I'm your AI learning assistant. I'm here to help you master this lesson. Ask me anything about the content, but remember, I'll guide you to the answer rather than just giving it away."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[] | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [generatingPractice, setGeneratingPractice] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response: any = await academyAPI.ai.ask(userMessage, lessonId);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Oops, something went wrong: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizMe = async () => {
    setGeneratingPractice(true);
    setPracticeQuestions(null);
    setPracticeAnswers({});
    try {
      const response: any = await academyAPI.ai.quizMe(lessonId, 3);
      setPracticeQuestions(response.questions || []);
    } catch (err: any) {
      setPracticeQuestions([]);
    } finally {
      setGeneratingPractice(false);
    }
  };

  useEffect(() => {
    if (mode === 'quiz_me' && practiceQuestions === null && !generatingPractice) {
      handleQuizMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-900/60 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-raised">
      {/* Header */}
      <div className="px-4 py-3 bg-indigo-600 dark:bg-slate-800 border-b border-indigo-700 dark:border-slate-800 flex items-center gap-2">
        <div className="p-1.5 bg-indigo-500 dark:bg-slate-800 rounded-md">
          <Sparkles className="w-4 h-4 text-indigo-50" />
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">AI Learning Assistant</h3>
          <p className="text-[11px] text-indigo-200">Expert Tutor for {lessonTitle}</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex border-b border-slate-200/50 dark:border-slate-800/50">
        <button
          onClick={() => setMode('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${mode === 'chat' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Bot className="w-3.5 h-3.5" /> Ask
        </button>
        <button
          onClick={() => setMode('quiz_me')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${mode === 'quiz_me' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" /> Quiz Me
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
 msg.role === 'user' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
 }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] rounded-card px-4 py-2.5 text-sm ${
 msg.role === 'user'
 ? 'bg-indigo-600 text-white rounded-tr-sm'
 : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
 }`}>
                  <ReactMarkdown className="prose dark:prose-invert max-w-none text-sm prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100" remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-card rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 pb-6 lg:pb-3 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this lesson..."
                disabled={isLoading}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <p className="text-xs text-slate-400">Practice questions — these are just for you and don't affect your real quiz scores.</p>
          {generatingPractice ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              <p className="text-sm">Generating practice questions...</p>
            </div>
          ) : practiceQuestions && practiceQuestions.length > 0 ? (
            <>
              {practiceQuestions.map((q, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{i + 1}. {q.question_text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const selected = practiceAnswers[i] === opt;
                      const revealed = !!practiceAnswers[i];
                      const isCorrect = opt === q.correct_answer;
                      return (
                        <button
                          key={oi}
                          onClick={() => !revealed && setPracticeAnswers(prev => ({ ...prev, [i]: opt }))}
                          disabled={revealed}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
 revealed && isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
 revealed && selected && !isCorrect ? 'bg-red-50 border-red-300 text-red-800' :
 selected ? 'bg-slate-100 border-slate-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
 }`}
                        >
                          {revealed && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          {revealed && selected && !isCorrect && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {practiceAnswers[i] && q.explanation && (
                    <p className="text-[11px] text-slate-500 mt-2">{q.explanation}</p>
                  )}
                </div>
              ))}
              <button
                onClick={handleQuizMe}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> New Practice Questions
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400 mb-4">Couldn't generate practice questions.</p>
              <button onClick={handleQuizMe} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">Try Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
