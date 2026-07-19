import { useState } from 'react';
import { Send, X, ChevronDown, FileText } from 'lucide-react';
import { adminFetch } from '../hooks/useD1Query';

interface Template { id: string; name: string; subject: string; body: string; }
interface EmailComposerProps {
  toEmail: string;
  enquiryId: string;
  toName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EmailComposer({ toEmail, enquiryId, toName, onSuccess, onCancel }: EmailComposerProps) {
  const [subject, setSubject] = useState(`Following up on your SpotCLM inquiry`);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const loadTemplates = async () => {
    if (templates.length) { setShowTemplates(!showTemplates); return; }
    try {
      const data = await adminFetch('/email') as { templates: Template[] };
      setTemplates(data.templates || []);
      setShowTemplates(true);
    } catch { /* ignore */ }
  };

  const applyTemplate = (tpl: Template) => {
    setSubject(tpl.subject);
    setBody(tpl.body.replace('{{name}}', toName || toEmail.split('@')[0]));
    setShowTemplates(false);
  };

  const send = async () => {
    if (!body.trim()) { setError('Message body is required'); return; }
    setSending(true);
    setError(null);
    try {
      await adminFetch('/email', {
        method: 'POST',
        body: JSON.stringify({ enquiryId, toEmail, cc, bcc, subject, replyBody: body }),
      });
      setSent(true);
      onSuccess?.();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <Send className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-emerald-400 font-semibold">Email sent successfully!</p>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white transition-colors">Close</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Compose Reply</h3>
        {onCancel && <button onClick={onCancel}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>}
      </div>

      {/* To field */}
      <div>
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">To</label>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-300">
          {toName ? `${toName} <${toEmail}>` : toEmail}
        </div>
      </div>

      {/* From field */}
      <div>
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">From</label>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-500">
          SpotCLM &lt;info@spotclm.com&gt;
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* CC field */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">CC (Optional)</label>
          <input
            value={cc}
            onChange={e => setCc(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
            placeholder="comma-separated emails"
          />
        </div>

        {/* BCC field */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">BCC (Optional)</label>
          <input
            value={bcc}
            onChange={e => setBcc(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
            placeholder="comma-separated emails"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Subject</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
        />
      </div>

      {/* Template picker */}
      <div className="relative">
        <button
          onClick={loadTemplates}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Use template
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
        </button>
        {showTemplates && templates.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl z-10">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div>
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Message</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors resize-none font-mono"
          placeholder="Write your reply here..."
        />
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={send}
        disabled={sending}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
      >
        <Send className="w-4 h-4" />
        {sending ? 'Sending...' : 'Send Email'}
      </button>
    </div>
  );
}
