import React, { useId, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, Wand2, Cpu, ChevronDown, Undo2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { PromptImprover } from '../PromptImprover';
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
  const inputId = useId();
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [beforeAi, setBeforeAi] = useState<string | null>(null); // the text before the last applied AI change, for Undo

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

  const changeWithAi = async () => {
    if (!value.trim() || instruction.trim().length < 3) return;
    setIsEditing(true);
    setAiFeedback(null);
    try {
      const data = await adminFetch('/academy/lesson-ai-edit', {
        method: 'POST',
        body: JSON.stringify({ content: value, instruction }),
      }) as any;
      if (data.unavailable) { toast.error(data.unavailable); return; }
      if (!data.changes?.length) { toast.error('The AI made no change', 'Try wording the request more specifically.'); return; }
      setAiFeedback({ correctedText: data.revised, issues: [], improvements: [], changeNotes: data.changes, fromRequest: true });
      setPreviewMode('corrected');
    } catch (err: any) {
      toast.error(err.message || 'Error contacting the AI editor');
    } finally {
      setIsEditing(false);
    }
  };

  const applyAiFixes = () => {
    if (aiFeedback?.correctedText) {
      setBeforeAi(value);
      onChange(aiFeedback.correctedText);
      if (aiFeedback.fromRequest) setInstruction('');
      setAiFeedback(null);
      setPreviewMode('original');
    }
  };

  const undoAi = () => {
    if (beforeAi === null) return;
    onChange(beforeAi);
    setBeforeAi(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Ask the AI for a specific change */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <label htmlFor={`ai-change-${inputId}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Wand2 className="w-4 h-4" aria-hidden="true" /> Ask AI to change this lesson
        </label>
        <p className="text-xs text-slate-600 mt-0.5">Say what you want in plain words. You see the result first and nothing changes until you click Apply.</p>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <textarea
            id={`ai-change-${inputId}`}
            rows={2}
            value={instruction}
            maxLength={1500}
            onChange={e => setInstruction(e.target.value)}
            placeholder="For example: make the example about contract renewals, shorten the intro, explain it for beginners"
            className="flex-1 min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-200 resize-y"
          />
          <button
            type="button"
            onClick={changeWithAi}
            disabled={isEditing || !value.trim() || instruction.trim().length < 3}
            className="sm:self-start min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {isEditing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
            {isEditing ? 'Changing…' : 'Change it'}
          </button>
        </div>
        <PromptImprover kind="edit_request" text={instruction} onApply={v => { if (typeof v.improved === 'string') setInstruction(v.improved); }} />
        {beforeAi !== null && !aiFeedback && (
          <p className="mt-2 text-xs font-semibold text-emerald-700 flex flex-wrap items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> AI change applied.
            <button type="button" onClick={undoAi} className="min-h-[36px] underline text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo</button>
          </p>
        )}
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
        {/* Editor Pane */}
        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Markdown & LaTeX Input</span>
              <div className="relative shrink-0">
                <Cpu className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  title="Choose AI model"
                  className="appearance-none bg-white border border-slate-200 text-slate-600 rounded-lg pl-7 pr-6 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-400"
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
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isBeautifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {isBeautifying ? 'Formatting...' : 'Beautify'}
              </button>
              <button
                onClick={checkWithAi}
                disabled={isChecking || !value.trim()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
              <span className="text-xs font-medium text-slate-500">Live Preview</span>
              {aiFeedback?.correctedText && (
                <div className="flex bg-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode('original')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
 previewMode === 'original' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
 }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setPreviewMode('corrected')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
 previewMode === 'corrected' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
 }`}
                  >
                    Corrected
                  </button>
                </div>
              )}
            </div>
            {aiFeedback?.correctedText && previewMode === 'corrected' && (
              <button
                onClick={applyAiFixes}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
              >
                Apply Fixes <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className={`flex-1 overflow-y-auto p-4 prose prose-slate max-w-none ${previewMode === 'corrected' ? 'bg-slate-100 border-t-2 border-indigo-400' : ''}`}>
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-800">AI Suggestions</h3>
          </div>
          
          {aiFeedback.fromRequest ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">What the AI changed</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                {aiFeedback.changeNotes.map((n: string, i: number) => <li key={i}>{n}</li>)}
              </ul>
              <p className="text-xs text-slate-500">Check the Corrected preview on the right, then click Apply Fixes to use it, or keep editing to ignore it.</p>
            </div>
          ) : aiFeedback.issues?.length > 0 ? (
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
