"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { 
  FileText, CheckCircle2, AlertCircle, Clock, Search, 
  HardDrive, User, ArrowUpRight, ShieldCheck,
  FileSpreadsheet, Database, ExternalLink, RefreshCcw, X, Plus, 
  ArrowRight, ShieldAlert, FileUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

interface FileLog {
  id: string;
  name: string;
  type: "Attendance" | "Assessments" | "Candidates";
  status: "Success" | "Partial" | "Failed";
  uploader: string;
  records: number;
  timestamp: string;
  batch: string;
  errorCount?: number;
}

const MetricCard = ({ label, value, icon: Icon, color, subText }: any) => (
  <div className="glass-card p-6 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={64} style={{ color }} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
        <span className="text-[10px] font-medium text-zinc-400">{subText}</span>
      </div>
    </div>
  </div>
);

export default function FileMonitoringPage() {
  const [logs, setLogs] = useState<FileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileLog | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "file_logs"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      const fileLogs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as FileLog[];

      setLogs(fileLogs);
    } catch (error) {
      console.error("Error fetching file logs:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "All" || log.type === filter;
    const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         log.batch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Reset page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const successCount = logs.filter(l => l.status === "Success").length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;
  const totalRecords = logs.reduce((acc, log) => acc + (log.records || 0), 0);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#040914]">
      <Header title="File Monitoring & Governance" subtitle="Centralized audit trail for all data ingestion and Excel uploads" />
      
      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-24">
        
        {/* Governance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Total Files" value={logs.length} icon={FileSpreadsheet} color="#3B82F6" subText="Real-time sync" />
          <MetricCard label="Success Rate" value={`${successRate}%`} icon={ShieldCheck} color="#10B981" subText="Validation health" />
          <MetricCard label="Records Ingested" value={totalRecords} icon={Database} color="#8B5CF6" subText="Committed to cloud" />
          <MetricCard label="Active Staff" value={new Set(logs.map(l => l.uploader)).size} icon={User} color="#F59E0B" subText="Unique uploaders" />
        </div>

        {/* Filters & Tools */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
            {["All", "Attendance", "Assessments"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                  filter === t ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search filenames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button onClick={fetchLogs} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all">
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Upload Logs Table */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <HardDrive size={18} className="text-blue-400" />
              <p className="text-sm font-bold text-white uppercase tracking-wider">Data Ingestion History</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Sync: Production Firestore</span>
              <div className="h-4 w-px bg-white/10" />
              <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">
                Showing {Math.min(filteredLogs.length, (currentPage - 1) * recordsPerPage + 1)}-{Math.min(filteredLogs.length, currentPage * recordsPerPage)} of {filteredLogs.length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0c0c0e] border-b border-white/5">
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">File Name</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Type</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Uploader</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Timestamp</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Records</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">Syncing ingestion logs...</td></tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">No real files found in history.</td></tr>
                ) : paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                          <FileText size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{log.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{log.batch}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-400 font-medium">{log.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-300">{log.uploader}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      <span className="text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-white font-bold">{log.records}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        log.status === "Success" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-400"
                      )}>
                        <CheckCircle2 size={10} />
                        {log.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0c0c0e] flex items-center justify-between">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Page <span className="text-zinc-300">{currentPage}</span> of <span className="text-zinc-300">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        currentPage === i + 1 ? "bg-blue-500 w-4" : "bg-zinc-700"
                      )} 
                    />
                  ))}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Data Hygiene Notice */}
        <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={24} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-widest mb-1">Production Governance</p>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
              This log is synced directly with your Firestore collections. Every Attendance and Assessment record is treated as a unique file transaction. Automated reconciliation runs every 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
