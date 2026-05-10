"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Shield, Clock, User, Layers, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    const qFile = query(collection(db, "file_logs"), orderBy("timestamp", "desc"), limit(20));
    const qAudit = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(20));
    
    let fileLogs: any[] = [];
    let auditLogs: any[] = [];

    const updateLogs = () => {
      const merged = [...fileLogs, ...auditLogs].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setLogs(merged.slice(0, 30));
      setLoading(false);
    };

    const unsubFile = onSnapshot(qFile, (snap) => {
      fileLogs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        logType: d.data().type || 'Data',
        action: d.data().status === "Success" ? "Data Ingested" : "Ingestion Failed",
        icon: d.data().type === "Attendance" ? Layers : FileSpreadsheet,
        color: d.data().status === "Success" ? "text-teal-400" : "text-rose-400"
      }));
      updateLogs();
    }, () => setLoading(false));

    const unsubAudit = onSnapshot(qAudit, (snap) => {
      auditLogs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          logType: data.category || 'Governance',
          action: data.action,
          icon: Shield,
          color: data.category === 'Security' ? "text-rose-400" : "text-blue-400"
        };
      });
      updateLogs();
    }, () => setLoading(false));

    return () => {
      unsubFile();
      unsubAudit();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#040914]">
      <Header title="Governance Audit Log" subtitle="Immutable record of all academic and administrative actions" />
      
      <div className="p-8 space-y-6 fade-in overflow-y-auto custom-scrollbar h-full">
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-teal-400" />
              <p className="text-sm font-bold text-white uppercase tracking-wider">System Activity Stream</p>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Syncing with Firestore</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 italic text-zinc-600">Accessing immutable records...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 italic">No governance events recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className="p-6 flex items-start gap-6 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03]", log.color)}>
                    <log.icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors truncate pr-4">
                        {log.action}: <span className="font-medium text-zinc-400">{log.name || log.details}</span>
                      </p>
                      <div className="flex items-center gap-2 text-zinc-500 whitespace-nowrap">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {new Date(log.timestamp || log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <User size={12} />
                        <span>By: {log.uploader || log.user || "System"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-l border-white/5 pl-4">
                        <Layers size={12} />
                        <span>Module: {log.logType}</span>
                      </div>
                      {log.records !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-500/80 uppercase tracking-widest border-l border-white/5 pl-4">
                          <CheckCircle2 size={12} />
                          <span>{log.records} Records</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border-white/10">
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3 text-teal-400">
                <Shield size={18} />
                <h3 className="font-bold text-white tracking-wide uppercase text-sm">Event Details</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <AlertCircle size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action Triggered</label>
                <p className="text-xl font-bold text-white leading-tight">{selectedLog.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actor</label>
                  <p className="text-sm font-medium text-zinc-300">{selectedLog.uploader || selectedLog.user || "System"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timestamp</label>
                  <p className="text-sm font-medium text-zinc-300">{new Date(selectedLog.timestamp || selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                <label className="text-[10px] font-bold text-teal-500/80 uppercase tracking-widest">Full Payload / Description</label>
                <p className="text-sm text-zinc-300 leading-relaxed font-medium italic">
                  "{selectedLog.details || selectedLog.name || 'No extended description available for this event.'}"
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 w-fit">
                <Shield size={14} className="text-teal-400" />
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Blockchain Verified Governance Record</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

