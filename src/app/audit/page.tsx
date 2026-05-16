"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { 
  Shield, Clock, User, Layers, CheckCircle2, 
  AlertCircle, FileSpreadsheet, Brain, Zap, Search, Filter 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const qFile = query(collection(db, "file_logs"), orderBy("timestamp", "desc"), limit(20));
    const qAudit = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(20));
    const qAlerts = query(collection(db, "system_alerts"), orderBy("timestamp", "desc"), limit(20));
    
    let fileLogs: any[] = [];
    let auditLogs: any[] = [];
    let systemAlerts: any[] = [];

    const updateLogs = () => {
      const merged = [...fileLogs, ...auditLogs, ...systemAlerts].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setLogs(merged.slice(0, 40));
      setLoading(false);
    };

    const unsubFile = onSnapshot(qFile, (snap) => {
      fileLogs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        category: 'Data Ingestion',
        icon: FileSpreadsheet,
        accent: "blue"
      }));
      updateLogs();
    }, () => setLoading(false));

    const unsubAudit = onSnapshot(qAudit, (snap) => {
      auditLogs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        category: d.data().category || 'Governance',
        icon: Shield,
        accent: "indigo"
      }));
      updateLogs();
    }, () => setLoading(false));

    const unsubAlerts = onSnapshot(qAlerts, (snap) => {
      systemAlerts = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        category: 'AI Detection',
        action: d.data().title,
        details: d.data().message,
        user: "Maverick AI",
        icon: Brain,
        accent: "teal"
      }));
      updateLogs();
    }, () => setLoading(false));

    return () => {
      unsubFile();
      unsubAudit();
      unsubAlerts();
    };
  }, []);

  const filteredLogs = logs.filter(l => 
    (l.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.details || l.message || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#040914]">
      <Header title="Governance Ledger" subtitle="Immutable blockchain-style audit trail of all platform activity" />
      
      <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-teal-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search logs by action or details..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-bold text-zinc-400 hover:text-white transition-all">
              <Filter size={14} /> Filter Categories
            </button>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Live Sync Active</span>
            </div>
          </div>
        </div>

        {/* Timeline Table */}
        <div className="flex-1 glass-card border-white/[0.05] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-white/[0.05] bg-white/[0.01] grid grid-cols-12 gap-4">
            <div className="col-span-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Timestamp / Event ID</div>
            <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Actor</div>
            <div className="col-span-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Action & Details</div>
            <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Category</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <RefreshCw size={32} className="animate-spin text-teal-500/50" />
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Scanning Secure Ledger...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-700 italic text-sm">No matching records found.</div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {filteredLogs.map((log, idx) => {
                  const Icon = log.icon || Shield;
                  return (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/[0.02] transition-all cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <div className="col-span-3 flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                          log.accent === "blue" ? "bg-blue-500/10 text-blue-400" : 
                          log.accent === "teal" ? "bg-teal-500/10 text-teal-400" : "bg-indigo-500/10 text-indigo-400"
                        )}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white mb-0.5">
                            {new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-500 truncate uppercase">ID: {log.id.slice(0, 12)}</p>
                        </div>
                      </div>

                      {/* Actor */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                            <User size={12} className="text-zinc-400" />
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-300 truncate">
                            {log.user || log.uploader || log.uploadedBy || "System"}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="col-span-5">
                        <p className="text-sm font-bold text-zinc-100 group-hover:text-teal-400 transition-colors">
                          {log.action || log.title || "Operation Execution"}
                        </p>
                        <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
                          {log.details || log.message || log.name || "No additional payload recorded."}
                        </p>
                      </div>

                      {/* Category Badge */}
                      <div className="col-span-2 text-right">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
                          log.accent === "blue" ? "bg-blue-500/5 border-blue-500/20 text-blue-400" :
                          log.accent === "teal" ? "bg-teal-500/5 border-teal-500/20 text-teal-400" : "bg-indigo-500/5 border-indigo-500/20 text-indigo-400"
                        )}>
                          {log.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-400">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-widest uppercase text-base">Immutable Record</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Verified Governance Event</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
              >
                <Zap size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Actor</label>
                  <p className="text-base font-bold text-white flex items-center gap-2">
                    <User size={14} className="text-teal-500" />
                    {selectedLog.user || selectedLog.uploader || "System Agent"}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Timestamp</label>
                  <p className="text-base font-bold text-white flex items-center justify-end gap-2">
                    <Clock size={14} className="text-teal-500" />
                    {new Date(selectedLog.timestamp || selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action Executed</label>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-lg font-bold text-teal-400 leading-tight">
                    {selectedLog.action || selectedLog.title}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Detailed Payload</label>
                <div className="p-6 rounded-2xl bg-[#0B1221] border border-white/[0.05] shadow-inner">
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium italic">
                    "{selectedLog.details || selectedLog.message || selectedLog.name || 'No extended metadata available for this operation.'}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/10">
                  <Zap size={14} className="text-teal-500/50" />
                  <span className="text-[10px] font-bold text-teal-500/60 uppercase tracking-widest">Governance Security: High</span>
                </div>
                <p className="text-[10px] font-mono text-zinc-600">HASH: {selectedLog.id}</p>
              </div>
            </div>

            <div className="px-8 py-5 bg-white/[0.01] border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-8 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-teal-900/20 transition-all"
              >
                Close Record View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const RefreshCw = ({ className, size }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

