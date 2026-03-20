import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Minus, GraduationCap, Info, X, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function AcademicFingerprint({ userId }) {
  const [fingerprint, setFingerprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);

  const ALL_POSSIBLE_BADGES = [
    { title: "Growth Mindset", description: "Significant upward performance trend.", color: "#a855f7" },
    { title: "Consistent Achiever", description: "Maintained high-level performance.", color: "#3b82f6" },
    { title: "Resilient Learner", description: "Navigated academic fluctuations.", color: "#f59e0b" },
    { title: "High Honor", description: "Exceptional academic excellence (90%+).", color: "#0ea5e9" },
    { title: "Distinguished Scholar", description: "Outstanding performance (80%+).", color: "#10b981" },
    { title: "Commendable Student", description: "Solid academic foundation (70%+).", color: "#6366f1" },
    { title: "Persistent Scholar", description: "Long-term dedication to studies.", color: "#ec4899" },
    { title: "Continuous Learner", description: "Maintaining active educational goals.", color: "#06b6d4" },
    { title: "Emerging Scholar", description: "Beginning a promising academic path.", color: "#8b5cf6" }
  ];

  useEffect(() => {
    if (userId) {
      setLoading(true);
      axios.get(`${API_BASE}/api/profile/academic_fingerprint/${userId}`)
        .then(res => {
          setFingerprint(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load academic fingerprint", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px] animate-pulse">
        <Sparkles className="w-8 h-8 text-indigo-400 mb-3 opacity-50" />
        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Analyzing Academic Trajectory...</p>
      </div>
    );
  }

  // If no fingerprint data at all, show empty state
  if (!fingerprint || (!fingerprint.badges?.length && !fingerprint.trajectory?.length)) {
    return (
      <div className="glass-card p-6 border border-white/[0.05] flex flex-col items-center justify-center opacity-50 grayscale">
        <GraduationCap className="w-8 h-8 text-slate-500 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Academic Fingerprint Unavailable</p>
        <p className="text-[9px] text-slate-600 mt-1 italic">Add education records to generate AI insights.</p>
      </div>
    );
  }

  // Calculate generic trend icon for the trajectory
  let trajectoryTrendIcon = <Minus className="w-5 h-5 text-slate-400" />;
  if (fingerprint.trajectory && fingerprint.trajectory.length >= 2) {
    const start = fingerprint.trajectory[0];
    const end = fingerprint.trajectory[fingerprint.trajectory.length - 1];
    if (end > start + 5) trajectoryTrendIcon = <TrendingUp className="w-5 h-5 text-emerald-400" />;
    else if (end < start - 5) trajectoryTrendIcon = <TrendingDown className="w-5 h-5 text-rose-400" />;
  }

  return (
    <div className="glass-card p-6 border-t-4 border-t-indigo-500 overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h3 className="text-lg font-black flex items-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-400" />
            AI Academic Fingerprint
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">{fingerprint.message || 'Academic trajectory detected.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.08] hover:bg-indigo-500/20 hover:text-indigo-400 transition-all text-slate-400"
            title="What do these badges mean?"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-8 p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/[0.1] shadow-2xl relative z-20"
          >
            <button onClick={() => setShowLegend(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all text-slate-500"><X className="w-5 h-5" /></button>

            <div className="text-center mb-8">
              <h4 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Master Achievement Matrix</h4>
              <p className="text-xs text-slate-500 font-medium">Complete academic milestones to unlock these elite blockchain badges.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ALL_POSSIBLE_BADGES.map((b, i) => {
                const isEarned = fingerprint.badges?.some(eb => eb.title === b.title);
                return (
                  <div key={i} className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 ${isEarned ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      {isEarned && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-xs font-black text-white mb-2 tracking-tight">{b.title}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{b.description}</p>
                    <div className="mt-4 pt-4 border-t border-white/[0.05]">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isEarned ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {isEarned ? 'Unlocked' : 'Requirement Unmet'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {ALL_POSSIBLE_BADGES
          .filter(possibleBadge => fingerprint.badges?.some(b => b.title === possibleBadge.title))
          .map((possibleBadge, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col p-5 rounded-2xl bg-white/[0.04] border border-white/[0.1] shadow-xl transition-all duration-500 relative overflow-hidden group hover:bg-white/[0.06] hover:-translate-y-1"
              style={{ borderLeft: `4px solid ${possibleBadge.color}` }}
            >
              <div className="absolute top-0 right-0 p-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 opacity-60" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 shadow-lg"
                style={{ backgroundColor: `${possibleBadge.color}20`, color: possibleBadge.color }}>
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="font-black text-base mb-1.5 text-white tracking-tight">{possibleBadge.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{possibleBadge.description}</p>

              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/[0.05] transition-all"></div>
            </motion.div>
          ))
        }

        {/* Helper if NO badges are earned yet but they have some trajectory data */}
        {(!fingerprint.badges || fingerprint.badges.length === 0) && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/[0.1] rounded-3xl">
            <Sparkles className="w-8 h-8 text-slate-600 mb-3 opacity-30" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Awaiting First Milestone</p>
            <p className="text-[10px] text-slate-600 mt-1">Add more educational achievements to unlock your first badge.</p>
          </div>
        )}
      </div>
    </div>
  );
}
