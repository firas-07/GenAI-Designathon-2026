"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc } from "firebase/firestore";
import Header from "@/components/Header";
import { Upload, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function AssessmentsPage() {
  const { profile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [assessmentType, setAssessmentType] = useState("Coding Assessment");
  const [weekModule, setWeekModule] = useState("Week 6");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);

  // Fetch Live Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const batchSnap = await getDocs(batchQ);
        const fireBatches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLiveBatches(fireBatches);
        if (fireBatches.length > 0) setSelectedBatch(fireBatches[0].name);

        const candQ = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
        const candSnap = await getDocs(candQ);
        const fireCands = candSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setDisplayCandidates(fireCands);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateGrade = (score: number) => {
    if (score >= 85) return "A";
    if (score >= 70) return "B";
    if (score >= 55) return "C";
    return "F";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) return showToast("Please upload CSV format only", 'error');

    setIsSaving(true);
    setTimeout(async () => {
      try {
        await addDoc(collection(db, "assessment_logs"), {
          batch: selectedBatch,
          type: assessmentType,
          module: weekModule,
          uploadedBy: profile?.name || "Trainer",
          createdAt: new Date().toISOString()
        });
        setIsSaving(false);
        showToast(`Successfully uploaded ${assessmentType} for ${weekModule}!`);
      } catch (err) {
        showToast("Error uploading scores", 'error');
        setIsSaving(false);
      }
    }, 1500);
  };

  const topPerformers = [...displayCandidates].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)).slice(0, 5);

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const avgCoding = avg(displayCandidates.map(c => c.codingScore || 0));
  const avgApi = avg(displayCandidates.map(c => c.apiScore || 0));
  const avgProject = avg(displayCandidates.map(c => c.projectScore || 0));
  const avgOverall = avg(displayCandidates.map(c => c.avgScore || 0));

  const radarData = [
    { subject: "Coding", value: avgCoding },
    { subject: "API", value: avgApi },
    { subject: "Project", value: avgProject },
  ];

  const scoreColor = (s: number) => s >= 80 ? "#10b981" : s >= 60 ? "#5eead4" : s >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header title="Assessment Tracking" subtitle="Upload and monitor coding, API, and project scores" />
      {toast && (
        <div className={`fixed top-6 right-6 z-[10001] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
      <div className="p-8 space-y-6 fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Avg Coding", value: `${avgCoding}%`, color: "#3B82F6" },
            { label: "Avg API", value: `${avgApi}%`, color: "#60A5FA" },
            { label: "Avg Project", value: `${avgProject}%`, color: "#10b981" },
            { label: "Avg Overall", value: `${avgOverall}%`, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="glass-card p-5 metric-card">
              <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Upload Scores</p>
            <div className="space-y-4">
              <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                {liveBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <select value={assessmentType} onChange={e => setAssessmentType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                <option>Coding Assessment</option>
                <option>API Design Exam</option>
                <option>Project Milestone</option>
              </select>
              <input type="text" value={weekModule} onChange={e => setWeekModule(e.target.value)} placeholder="Week / Module" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              <input type="file" id="scoreUpload" hidden accept=".csv" onChange={handleFileUpload} />
              <button onClick={() => document.getElementById('scoreUpload')?.click()} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "#3B82F6" }}>
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Upload CSV
              </button>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} className="text-teal-400" />
              <p className="text-base font-bold text-white uppercase tracking-wider text-xs">Score Distribution</p>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#82A0CE", fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                  <Tooltip contentStyle={{ background: "#0B1221", border: "1px solid rgba(20, 184, 166,0.3)", borderRadius: 8, color: "#fff" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-5">
              <Trophy size={18} className="text-amber-400" />
              <p className="text-base font-bold text-white uppercase tracking-wider text-xs">Top Performers</p>
            </div>
            <div className="space-y-4">
              {topPerformers.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-zinc-300 text-zinc-600' : 'bg-teal-500/20 text-teal-400'}`}>{i + 1}</div>
                    <span className="text-sm font-semibold text-zinc-300">{c.name}</span>
                  </div>
                  <span className="text-xs font-bold text-teal-400">{c.avgScore || 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <p className="text-base font-bold text-white uppercase tracking-wider text-xs">Assessment Score Sheet</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  {["Candidate", "Coding", "API", "Project", "Overall", "Grade"].map(h => <th key={h} className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4"><p className="text-sm font-bold text-white">{c.name}</p></td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.codingScore || 0}%</td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.apiScore || 0}%</td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.projectScore || 0}%</td>
                    <td className="px-6 py-4 text-xs font-bold text-teal-400">{c.avgScore || 0}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white ${ (c.avgScore || 0) >= 85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-500/20 text-teal-400' }`}>Grade {calculateGrade(c.avgScore || 0)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}




