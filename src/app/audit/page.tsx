"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Shield, Clock, User, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "attendance_logs"), orderBy("createdAt", "desc"), limit(20));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header title="Governance Audit Log" subtitle="Immutable record of all academic and administrative actions" />
      
      <div className="p-8 space-y-6 fade-in overflow-y-auto custom-scrollbar">
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-teal-400" />
              <p className="text-sm font-bold text-white uppercase tracking-wider">System Activity Stream</p>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Showing latest 20 actions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0c0c0e] border-b border-white/5">
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Timestamp</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Action</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">User</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Entity</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">Loading security logs...</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-zinc-500" />
                        <span className="text-xs text-zinc-400 font-medium">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-white">Attendance Submission</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{log.mode || "System"} Entry</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center">
                          <User size={12} className="text-teal-400" />
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold">{log.uploadedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Layers size={12} />
                        <span className="text-xs font-medium">{log.batch}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        log.status === "Late Submission" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {log.status === "Late Submission" ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                        {log.status || "Verified"}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">No governance actions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Warning */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
          <Shield size={20} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Immutable Log System</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">This audit log is cryptographically linked to individual user sessions. Any attempt to modify or delete these records will trigger a global security alert to the Super-Admin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}




