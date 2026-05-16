"use client";
import Header from "@/components/Header";
import { FileText, Download, FileSpreadsheet, Filter, CheckCircle2, FileDown, X, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

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

  const handleReportDownload = async (reportName: string) => {
    if (!selectedBatch) return;
    setPreviewTitle(reportName);
    
    try {
      let data: any[] = [];
      const candQ = query(collection(db, "candidates"), where("batch", "==", selectedBatch));
      const candSnap = await getDocs(candQ);
      const candidates = candSnap.docs.map(d => d.data());

      if (reportName.includes("Attendance")) {
        if (reportName.includes("Absentee")) {
          // Only show those with attendance < 100
          data = candidates
            .filter(c => (c.attendance || 0) < 100)
            .map(c => ({ "Name": c.name, "Attendance": `${c.attendance || 0}%`, "Status": "NEEDS REVIEW" }));
        } else {
          const q = query(collection(db, "attendance_logs"), where("batch", "==", selectedBatch));
          const snap = await getDocs(q);
          data = snap.docs.map(d => {
            const dt = d.data();
            return { "Date": dt.timestamp, "Uploader": dt.uploader, "Status": dt.status };
          });
        }
      } 
      else if (reportName.includes("Score") || reportName.includes("Performance") || reportName.includes("Scorecard")) {
        data = candidates.map(c => ({ "Name": c.name, "Coding": `${c.codingScore || 0}%`, "API": `${c.apiScore || 0}%`, "Project": `${c.projectScore || 0}%`, "Avg": `${c.avgScore || 0}%` }));
      }
      else if (reportName.includes("Topper") || reportName.includes("Merit")) {
        data = candidates
          .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
          .slice(0, 5)
          .map((c, i) => ({ "Rank": i+1, "Name": c.name, "Score": `${c.avgScore}%`, "Grade": (c.avgScore || 0) > 90 ? "A+" : "A" }));
      }
      else {
        data = [
          { "Metric": "Batch Name", "Value": selectedBatch },
          { "Metric": "Total Enrolled", "Value": candidates.length },
          { "Metric": "High Risk Count", "Value": candidates.filter(c => c.risk === "HIGH").length },
          { "Metric": "Avg Score", "Value": `${Math.round(candidates.reduce((s,c)=>s+(c.avgScore||0),0)/(candidates.length||1))}%` }
        ];
      }

      if (data.length === 0) {
        data = [{ "Status": "No specific records found for this criteria." }];
      }

      setPreviewData(data);
    } catch (err) {
      console.error("Preview Error:", err);
    }
  };

  const finalDownload = () => {
    if (!previewData) return;
    const headers = Object.keys(previewData[0]).join(",") + "\n";
    const rows = previewData.map(row => Object.values(row).join(",")).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBatch}_${previewTitle.replace(/ /g, "_")}.csv`;
    a.click();
    setPreviewData(null);
  };

  const handleGenerateAIReport = async () => {
    if (!selectedBatch) return;
    setIsGenerating(true);
    setReportResult(null);

    try {
      // 1. Fetch live data for the batch
      const q = query(collection(db, "candidates"), where("batch", "==", selectedBatch));
      const snap = await getDocs(q);
      const candidates = snap.docs.map(d => d.data());
      
      const avgPerf = candidates.reduce((s, c) => s + (c.avgScore || 0), 0) / (candidates.length || 1);
      const avgAtt = candidates.reduce((s, c) => s + (c.attendance || 0), 0) / (candidates.length || 1);
      const highRiskCount = candidates.filter(c => c.risk === "HIGH" || c.status === "AT RISK").length;

      setBatchStats({
        count: candidates.length,
        avgPerf: Math.round(avgPerf),
        avgAtt: Math.round(avgAtt),
        highRiskCount
      });

      // 2. Call AI for Analysis
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate a professional Executive Master Report for training batch "${selectedBatch}". 
            Stats: 
            - Total Candidates: ${candidates.length}
            - Average Performance: ${Math.round(avgPerf)}%
            - Average Attendance: ${Math.round(avgAtt)}%
            - High-Risk Candidates: ${highRiskCount}
            
            Provide a 3-paragraph summary: 
            1. Overall health 
            2. Specific risk analysis 
            3. Recommended interventions. 
            Keep it professional and data-driven.`
          }],
          userRole: "Training Coordinator",
          currentPath: "/reports"
        })
      });

      const data = await response.json();
      setReportResult(data.content);
    } catch (err) {
      console.error("Report Error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = () => {
    // Generate a simple CSV for the batch
    const headers = "Name,Email,Attendance,AvgScore,Risk\n";
    const rows = "Aarav Patel,aarav@maverick.ai,100,85,LOW\nDiya Sharma,diya@maverick.ai,100,92,LOW\nRohan Gupta,rohan@maverick.ai,0,38,HIGH\n"; // In real app, map over candidates
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBatch}_Report.csv`;
    a.click();
  };

  const handlePrint = () => {
    // Basic Markdown to HTML conversion for the print preview
    const cleanReport = reportResult
      ? reportResult
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
          .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Italic
          .replace(/^# (.*$)/gm, '<h2>$1</h2>')    // H1
          .replace(/^## (.*$)/gm, '<h3>$1</h3>')   // H2
      : "";

    const printContent = `
      <html>
        <head>
          <title>Executive Report - ${selectedBatch}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #14b8a6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .stats { display: flex; gap: 40px; margin-bottom: 30px; }
            .stat-item { flex: 1; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            .stat-value { font-size: 20px; font-weight: bold; }
            .report-body { line-height: 1.8; font-size: 14px; white-space: pre-line; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            h2, h3 { color: #14b8a6; margin-top: 25px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Maverick AI: Executive Master Report</h1>
            <p>Batch: ${selectedBatch} | Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="stats">
            <div class="stat-item"><p class="stat-label">Avg Performance</p><p class="stat-value">${batchStats?.avgPerf}%</p></div>
            <div class="stat-item"><p class="stat-label">Attendance</p><p class="stat-value">${batchStats?.avgAtt}%</p></div>
            <div class="stat-item"><p class="stat-label">High Risk Candidates</p><p class="stat-value">${batchStats?.highRiskCount}</p></div>
          </div>
          <div class="report-body">${cleanReport}</div>
          <div class="footer">
            Generated by Maverick AI Performance Engine. This document is for internal governance use only.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(printContent);
    win?.document.close();
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      <Header title="Reports & Downloads" subtitle="Generate and export system-wide performance data" />
      <div className="p-8 space-y-8 fade-in">

        {/* Data Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className="rounded-[24px] max-w-4xl w-full p-8 relative overflow-hidden border border-white/10 shadow-2xl" style={{ background: "rgba(11, 22, 50, 0.95)" }}>
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setPreviewData(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <FileText className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Report Preview: {previewTitle}</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{selectedBatch}</p>
                </div>
              </div>

              <div className="max-h-[400px] overflow-auto mb-8 rounded-xl border border-white/5 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      {Object.keys(previewData[0]).map(key => (
                        <th key={key} className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-4 text-sm text-zinc-300 font-medium">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setPreviewData(null)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-zinc-400 font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={finalDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/20"
                >
                  <Download size={18} />
                  Confirm & Download CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Report Modal */}
        {reportResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className="rounded-[24px] max-w-2xl w-full p-8 relative overflow-hidden border border-teal-500/30 shadow-2xl" style={{ background: "rgba(11, 22, 50, 0.95)" }}>
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setReportResult(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
                  <Sparkles className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Master Report: {selectedBatch}</h3>
                  <p className="text-xs text-teal-400 font-bold uppercase tracking-widest">Generated by Maverick AI Co-Pilot</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg Score</p>
                  <p className="text-xl font-bold text-white">{batchStats?.avgPerf}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Attendance</p>
                  <p className="text-xl font-bold text-white">{batchStats?.avgAtt}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Risks</p>
                  <p className="text-xl font-bold text-red-400">{batchStats?.highRiskCount}</p>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto mb-8 pr-2 custom-scrollbar">
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line leading-loose">
                  {reportResult}
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all border border-white/10"
                >
                  <FileText size={18} />
                  Save as PDF
                </button>
                <button 
                  onClick={downloadCSV}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/20"
                >
                  <Download size={18} />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Filters */}
        <div className="rounded-[16px] p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
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
              className="bg-[#0B1221] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-teal-500 transition-all min-w-[240px]"
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
            <div key={cat.id} className="rounded-[16px] p-6 group hover:border-white/[0.1] transition-all" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
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
                  <button 
                    key={report} 
                    onClick={() => handleReportDownload(report)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group/item"
                  >
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
        <div className="rounded-[24px] p-8 relative overflow-hidden group border border-white/[0.04]" style={{ background: "rgba(11, 22, 50, 0.6)" }}>
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 rounded-3xl bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-600/30">
                <Sparkles className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">AI-Powered Master Report</h2>
                <p className="text-zinc-400 text-sm max-w-md">Generate a deep-dive performance analysis of this batch using Maverick AI. Analyzes trends, identifies risks, and suggests interventions.</p>
              </div>
            </div>
            <button 
              onClick={handleGenerateAIReport}
              disabled={isGenerating}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-teal-600 text-white font-bold text-sm shadow-xl shadow-black/20 hover:bg-teal-500 hover:scale-105 active:scale-95 transition-all whitespace-nowrap flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing Data...
                </>
              ) : (
                "Generate Master Report"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




