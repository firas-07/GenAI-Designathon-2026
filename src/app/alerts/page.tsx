"use client";
import Header from "@/components/Header";
import { Bell, AlertTriangle, Info, CheckCircle2, Clock, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const severityConfig = {
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", label: "Critical", icon: AlertTriangle },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", label: "Warning", icon: Clock },
  low: { color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", label: "Info", icon: Info },
};

const typeConfig = {
  attendance: { label: "Attendance", color: "#14b8a6" },
  risk: { label: "Risk", color: "#ef4444" },
  assessment: { label: "Assessment", color: "#f59e0b" },
  feedback: { label: "Feedback", color: "#10b981" },
  system: { label: "System", color: "#2dd4bf" },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState("all");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const q = query(collection(db, "system_alerts"), orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLiveAlerts(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAlerts();
  }, []);

  const visible = liveAlerts.filter(a =>
    (filter === "all" || a.severity === filter || a.type === filter) &&
    !dismissed.includes(a.id)
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Alerts & Notifications" subtitle="Real-time governance and system monitoring" />
      <div className="p-8 space-y-6 fade-in">

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(["high", "medium", "low"] as const).map(s => {
            const cfg = severityConfig[s];
            const count = liveAlerts.filter(a => a.severity === s).length;
            return (
              <div key={s} className="glass-card p-5 metric-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <cfg.icon size={22} style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{cfg.label} Alerts</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "high", "medium", "low", "attendance", "risk", "assessment", "feedback"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm border ${
                filter === f ? "bg-teal-500/20 border-teal-500/50 text-indigo-300" : "bg-[#0c0c0e] border-white/5 text-zinc-500"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="space-y-4">
          {visible.map(a => {
            const cfg = severityConfig[a.severity as keyof typeof severityConfig] || severityConfig.low;
            const type = typeConfig[a.type as keyof typeof typeConfig] || typeConfig.system;
            return (
              <div key={a.id} className="glass-card p-5 transition-all relative overflow-hidden"
                style={{ borderLeft: `4px solid ${cfg.color}` }}>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 text-white">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <cfg.icon size={20} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-white/[0.06]">{type.label}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-relaxed">{a.message}</p>
                      <p className="text-[10px] mt-2 flex items-center gap-1.5 font-medium text-zinc-500">
                        <Clock size={12} />
                        {a.timestamp
                          ? new Date(typeof a.timestamp === "object" ? a.timestamp.seconds * 1000 : a.timestamp).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setDismissed(d => [...d, a.id])}
                    className="text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-wider bg-white/5 text-zinc-400 hover:bg-white/10 transition-all">
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && !loading && (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="text-white font-bold text-lg">Platform Health: Optimal</p>
              <p className="text-xs mt-1 text-zinc-500 font-medium uppercase tracking-wider">No active alerts found in the database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




