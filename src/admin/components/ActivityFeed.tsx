import { motion, AnimatePresence } from 'motion/react';
import { Eye, MousePointerClick, FileText, MessageCircle, BrainCircuit, Globe } from 'lucide-react';

interface Event {
  event_type: string;
  page?: string;
  email?: string;
  created_at: string;
}

const eventConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  page_view: { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-sky-600 bg-sky-50', label: 'Page View' },
  cta_click: { icon: <MousePointerClick className="w-3.5 h-3.5" />, color: 'text-violet-600 bg-violet-50', label: 'CTA Click' },
  form_submit: { icon: <FileText className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-50', label: 'Form Submit' },
  form_open: { icon: <FileText className="w-3.5 h-3.5" />, color: 'text-amber-600 bg-amber-50', label: 'Form Opened' },
  chat_start: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-indigo-600 bg-indigo-50', label: 'Chat Started' },
  assessment_run: { icon: <BrainCircuit className="w-3.5 h-3.5" />, color: 'text-rose-600 bg-rose-50', label: 'Assessment Run' },
  lang_switch: { icon: <Globe className="w-3.5 h-3.5" />, color: 'text-slate-600 bg-slate-100', label: 'Language Switch' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function ActivityFeed({ events = [], loading }: { events: Event[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return <p className="text-sm text-slate-500 text-center py-6">No activity yet</p>;
  }

  return (
    <AnimatePresence initial={false}>
      <div className="space-y-2">
        {events.map((event, i) => {
          const cfg = eventConfig[event.event_type] || {
            icon: <Eye className="w-3.5 h-3.5" />,
            color: 'text-slate-600 bg-slate-100',
            label: event.event_type,
          };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3"
            >
              <div className={`p-1.5 rounded-lg ${cfg.color} shrink-0`}>{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {cfg.label}
                  {event.page && <span className="text-slate-500 font-medium"> · {event.page}</span>}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {event.email ? event.email : 'Anonymous'} · {timeAgo(event.created_at)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}
