import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight, Wand2, Cpu, ChevronDown } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { adminFetch } from '../../hooks/useD1Query';
import { useGeminiModels } from '../../hooks/useGeminiModels';
import { toast } from '../../../lib/toast';

interface MarkdownAiEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function MarkdownAiEditor({ value, onChange, placeholder }: MarkdownAiEditorProps) {
  const { models, selectedModel, setSelectedModel } = useGeminiModels();
  const [isChecking, setIsChecking] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'corrected'>('original');

  const checkWithAi = async () => {
    if (!value.trim()) return;

    setIsChecking(true);
    setAiFeedback(null);
    try {
      const data = await adminFetch('/academy/gemini-check', {
        method: 'POST',
        body: JSON.stringify({ content: value, model: selectedModel }),
      }) as any;
      setAiFeedback(data);
      if (data.correctedText) {
        setPreviewMode('corrected');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error contacting AI checker');
    } finally {
      setIsChecking(false);
    }
  };

  const beautifyWithAi = async () => {
    if (!value.trim()) return;

    setIsBeautifying(true);
    setAiFeedback(null);
    try {
      const data = await adminFetch('/academy/gemini-beautify', {
        method: 'POST',
        body: JSON.stringify({ content: value, model: selectedModel }),
      }) as any;
      if (data.beautified) {
        setAiFeedback({ correctedText: data.beautified, issues: [], improvements: [] });
        setPreviewMode('corrected');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error contacting AI formatter');
    } finally {
      setIsBeautifying(false);
    }
  };

  const applyAiFixes = () => {
    if (aiFeedback?.correctedText) {
      onChange(aiFeedback.correctedText);
      setAiFeedback(null);
      setPreviewMode('original');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
        {/* Editor Pane */}
        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Markdown & LaTeX Input</span>
              <div className="relative shrink-0">
                <Cpu className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  title="Choose AI model"
                  className="appearance-none bg-white border border-slate-200 text-slate-600 rounded-lg pl-7 pr-6 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-400"
                >
                  {models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={beautifyWithAi}
                disabled={isBeautifying || !value.trim()}
                title="Reformat this content's markdown/LaTeX structure with AI"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isBeautifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {isBeautifying ? 'Formatting...' : 'Beautify'}
              </button>
              <button
                onClick={checkWithAi}
                disabled={isChecking || !value.trim()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isChecking ? 'Analyzing...' : 'Check with AI'}
              </button>
            </div>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Type markdown or LaTeX here..."}
            className="flex-1 w-full p-4 resize-none focus:outline-none text-slate-700 font-mono text-sm"
          />
        </div>

        {/* Preview Pane */}
        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
              {aiFeedback?.correctedText && (
                <div className="flex bg-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode('original')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                      previewMode === 'original' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setPreviewMode('corrected')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${
                      previewMode === 'corrected' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Corrected
                  </button>
                </div>
              )}
            </div>
            {aiFeedback?.correctedText && previewMode === 'corrected' && (
              <button
                onClick={applyAiFixes}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                Apply Fixes <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className={`flex-1 overflow-y-auto p-4 prose prose-slate max-w-none ${previewMode === 'corrected' ? 'bg-indigo-50/30 border-t-2 border-indigo-400' : ''}`}>
            {value || aiFeedback?.correctedText ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {previewMode === 'corrected' ? aiFeedback.correctedText : value}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-400 italic">Preview will appear here...</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Feedback Panel */}
      {aiFeedback && (
        <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">AI Suggestions</h3>
          </div>
          
          {aiFeedback.issues?.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Issues Found
              </h4>
              <ul className="space-y-2">
                {aiFeedback.issues.map((issue: any, i: number) => (
                  <li key={i} className="bg-rose-50 rounded-lg p-3 text-sm">
                    <p className="text-rose-800 font-medium">{issue.description}</p>
                    <p className="text-rose-600 mt-1">Suggestion: {issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4" /> No spelling, grammar, or formatting issues found!
            </div>
          )}

          {aiFeedback.improvements?.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-semibold text-indigo-600">Ideas to Improve Content</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                {aiFeedback.improvements.map((imp: string, i: number) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
