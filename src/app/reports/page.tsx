"use client";
import Header from "@/components/Header";
import { FileText, Download, FileSpreadsheet, Filter, CheckCircle2, FileDown } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

const reportCategories = [
  { 
    id: "attendance", 
    title: "Attendance Reports", 
    icon: CheckCircle2, 
    color: "#10b981",
    description: "Detailed daily attendance records and cutoff compliance logs.",
    reports: ["Batch-wise Attendance", "Monthly Consolidated Log", "Absentee Exception Report"]
  },
  { 
    id: "assessments", 
    title: "Assessment Scores", 
    icon: FileSpreadsheet, 
    color: "#3B82F6",
    description: "All assessment tracks: Sprint Reviews, API, Coding, and Projects.",
    reports: ["Sprint Assessment Scorecard", "Consolidated Score Sheet", "Component-wise Performance"]
  },
  { 
    id: "toppers", 
    title: "Topper & Merit List", 
    icon: FileText, 
    color: "#f59e0b",
    description: "Identifies top performers across batches based on Admin criteria.",
    reports: ["Batch-wise Topper List", "Overall Performance Leaderboard", "Top 10% Merit Report"]
  },
  { 
    id: "summary", 
    title: "Consolidated Batch", 
    icon: FileDown, 
    color: "#60A5FA",
    description: "High-level summary of candidate status transitions and offers.",
    reports: ["Discontinued Candidate List", "Offered / Onboarded Report", "Full Batch Lifecycle Summary"]
  },
];

export default function ReportsPage() {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [liveBatches, setLiveBatches] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setLiveBatches(data);
      if (data.length > 0 && !selectedBatch) setSelectedBatch(data[0].name);
    }, (error) => {
      console.error("Batch Sync Error:", error);
    });
    return () => unsubscribe();
  }, [selectedBatch]);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Reports & Downloads" subtitle="Generate and export system-wide performance data" />
      <div className="p-8 space-y-8 fade-in">

        {/* Global Filters */}
        <div className="glass-card p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Filter size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Report Context</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Select target batch for specific reports</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <select 
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-teal-500 transition-all min-w-[240px]"
            >
              {liveBatches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
              {liveBatches.length === 0 && <option>No active batches</option>}
            </select>
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 rounded-xl border border-white/[0.08]">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Format:</span>
              <button className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-teal-600">Excel</button>
              <button className="text-[10px] font-bold text-zinc-500 px-2 py-0.5 rounded">PDF</button>
            </div>
          </div>
        </div>

        {/* Categories (BRD 5.7) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportCategories.map(cat => (
            <div key={cat.id} className="glass-card p-6 group hover:border-white/[0.1] transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" 
                    style={{ background: `${cat.color}22`, color: cat.color }}>
                    <cat.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{cat.title}</h3>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mt-0.5">{cat.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {cat.reports.map(report => (
                  <button key={report} className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800 transition-all group/item">
                    <span className="text-xs font-semibold text-zinc-300 group-hover/item:text-white transition-colors">{report}</span>
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-zinc-500 group-hover/item:text-teal-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Bulk Download */}
        <div className="glass-card p-8 bg-gradient-to-br from-teal-600/10 to-teal-700/10 border-white/[0.08] relative overflow-hidden group">
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 rounded-3xl bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-600/30">
                <FileDown className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Consolidated Batch Performance</h2>
                <p className="text-zinc-400 text-sm max-w-md">Download the entire audit-ready history for this batch, including attendance, scores, and feedback summaries.</p>
              </div>
            </div>
            <button className="w-full md:w-auto px-8 py-4 rounded-2xl bg-teal-600 text-white font-bold text-sm shadow-xl shadow-black/20 hover:bg-teal-500 hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              Generate Master Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




