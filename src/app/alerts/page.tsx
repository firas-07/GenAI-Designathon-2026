"use client";
import Header from "@/components/Header";
import { Bell, AlertTriangle, Info, CheckCircle2, Clock, Filter, Settings, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";

const severityConfig = {
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", label: "Critical", icon: AlertTriangle },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", label: "Warning", icon: Clock },
  low: { color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", label: "Info", icon: Info },
};

const typeConfig = {
  attendance: { label: "Attendance", color: "#3B82F6" },
  risk: { label: "Risk", color: "#ef4444" },
  assessment: { label: "Assessment", color: "#f59e0b" },
  feedback: { label: "Feedback", color: "#10b981" },
  system: { label: "System", color: "#60A5FA" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for system alerts
    const q = query(collection(db, "system_alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(alertData);
      setLoading(false);
    }, (error) => {
      console.error("Alerts listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      <Header 
        title="Risk & Governance Feed" 
        subtitle="Real-time monitoring of system events and candidate risk triggers" 
      />
      
      <div className="p-6 max-w-[1400px] w-full fade-in ml-2">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Live Monitoring Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
            >
              <Settings size={14} />
              Manage Governance Rules
              <ExternalLink size={12} className="opacity-50" />
            </Link>
          </div>
        </div>

        {/* Alerts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-500">
              <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-medium">Syncing with Governance Engine...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-600 border border-dashed border-white/5 rounded-3xl">
              <CheckCircle2 size={40} className="text-emerald-500/20" />
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-400">System Healthy</p>
                <p className="text-xs">No active risk alerts or governance triggers detected.</p>
              </div>
            </div>
          ) : (
            alerts.map((alert) => {
              const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
              const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.system;
              const Icon = severity.icon;

              return (
                <div 
                  key={alert.id}
                  className="group relative overflow-hidden rounded-2xl border transition-all hover:translate-x-1"
                  style={{ 
                    background: "rgba(11, 22, 50, 0.2)",
                    borderColor: severity.border
                  }}
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Severity Indicator */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: severity.bg }}
                    >
                      <Icon size={20} style={{ color: severity.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: type.color }}>
                            {type.label}
                          </span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-xs text-zinc-500 font-medium">
                            {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Just now"}
                          </span>
                        </div>
                        <div 
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter"
                          style={{ background: severity.bg, color: severity.color }}
                        >
                          {severity.label}
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100">{alert.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{alert.message}</p>
                    </div>

                    {/* Action Button */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={alert.link || (alert.type === 'feedback' ? '/feedback' : '/audit')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all block"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                  
                  {/* Subtle Accent Bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: severity.color }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
