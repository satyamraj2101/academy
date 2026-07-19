import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: number; // percentage
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  loading?: boolean;
}

const colorMap = {
  indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-100 text-indigo-600',
  emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-600',
  amber: 'from-amber-50 to-amber-100/50 border-amber-100 text-amber-600',
  rose: 'from-rose-50 to-rose-100/50 border-rose-100 text-rose-600',
  sky: 'from-sky-50 to-sky-100/50 border-sky-100 text-sky-600',
  violet: 'from-violet-50 to-violet-100/50 border-violet-100 text-violet-600',
};

export function StatCard({ label, value, sub, icon, trend, color = 'indigo', loading }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border bg-gradient-to-br ${colors} p-5 overflow-hidden shadow-sm`}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-white border border-current/20 shadow-sm ${colorMap[color].split(' ').pop()}`}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              trend >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}
