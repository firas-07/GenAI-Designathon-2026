"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, where, updateDoc, doc, onSnapshot } from "firebase/firestore";
import Header from "@/components/Header";
import { Upload, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { triggerSystemAlert } from "@/lib/governance";

export default function AssessmentsPage() {
  const { profile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [weekModule, setWeekModule] = useState("Week 1");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [viewingSnapshots, setViewingSnapshots] = useState<any[] | null>(null);
  const [activeSnapshotWeek, setActiveSnapshotWeek] = useState<string>("Live");

  // Fetch Live Data with Real-time listeners
  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const batchSnap = await getDocs(batchQ);
        const allBatches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        
        const fireBatches = profile?.role === "Trainer" 
          ? allBatches.filter(b => b.trainer === profile.name)
          : allBatches;
        
        setLiveBatches(fireBatches);
        if (fireBatches.length > 0 && !selectedBatch) {
          setSelectedBatch(fireBatches[0].name);
        }

        if (selectedBatch) {
          const snapQ = query(
            collection(db, "assessment_snapshots"), 
            where("batch", "==", selectedBatch)
          );
          const snapShot = await getDocs(snapQ);
          const weeks = Array.from(new Set(snapShot.docs.map(d => d.data().week)));
          setAvailableWeeks(weeks);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();

    const candQ = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
    const unsubscribeCandidates = onSnapshot(candQ, (snapshot) => {
      const allCands = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const finalCands = allCands.filter(c => 
        c.email?.includes('@') && 
        c.batch === selectedBatch
      );
      setDisplayCandidates(finalCands);
    });

    return () => {
      unsubscribeCandidates();
    };
  }, [profile, selectedBatch]);

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
    
    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      return showToast("Please upload CSV or Excel format only", 'error');
    }

    setIsSaving(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      let performanceRecords: any[] = [];
      let lowPerformersCount = 0;

      try {
        if (isCSV) {
          const text = event.target?.result as string;
          const rows = text.split('\n').filter(row => row.trim() !== '');
          for (const row of rows.slice(1)) {
            const columns = row.split(',').map(s => s.trim());
            if (columns.length < 5) continue;
            const avgScore = Math.round((parseInt(columns[2]) + parseInt(columns[3]) + parseInt(columns[4])) / 3);
            performanceRecords.push({ 
              name: columns[0], 
              email: columns[1], 
              codingScore: parseInt(columns[2]) || 0, 
              apiScore: parseInt(columns[3]) || 0, 
              projectScore: parseInt(columns[4]) || 0, 
              avgScore 
            });
          }
        } else {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
          
          for (const row of jsonData.slice(1)) {
            if (row.length < 5) continue;
            const avgScore = Math.round((parseInt(row[2]) + parseInt(row[3]) + parseInt(row[4])) / 3);
            performanceRecords.push({ 
              name: row[0], 
              email: row[1], 
              codingScore: parseInt(row[2]) || 0, 
              apiScore: parseInt(row[3]) || 0, 
              projectScore: parseInt(row[4]) || 0, 
              avgScore 
            });
          }
        }

        await addDoc(collection(db, "assessment_logs"), {
          batch: selectedBatch,
          type: "Score Ingestion",
          module: weekModule,
          uploadedBy: profile?.name || "Trainer",
          recordsCount: performanceRecords.length,
          createdAt: new Date().toISOString()
        });

        await addDoc(collection(db, "file_logs"), {
          name: file.name,
          type: "Assessments",
          status: "Success",
          uploader: profile?.name || "Trainer",
          records: performanceRecords.length,
          batch: selectedBatch,
          timestamp: new Date().toISOString()
        });

        for (const record of performanceRecords) {
          const q = query(collection(db, "candidates"), where("email", "==", record.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const candidateDoc = querySnapshot.docs[0];
            const existing = candidateDoc.data();
            
            const finalCoding = record.codingScore > 0 ? record.codingScore : (existing.codingScore || 0);
            const finalApi = record.apiScore > 0 ? record.apiScore : (existing.apiScore || 0);
            const finalProject = record.projectScore > 0 ? record.projectScore : (existing.projectScore || 0);
            const finalAvg = Math.round((finalCoding + finalApi + finalProject) / 3);

            await updateDoc(doc(db, "candidates", candidateDoc.id), {
              name: record.name,
              avgScore: finalAvg,
              codingScore: finalCoding,
              apiScore: finalApi,
              projectScore: finalProject,
              lastAssessment: weekModule,
              batch: selectedBatch
            });

            await addDoc(collection(db, "assessment_snapshots"), {
              candidateId: candidateDoc.id,
              candidateEmail: record.email,
              name: record.name,
              batch: selectedBatch,
              week: weekModule,
              codingScore: record.codingScore,
              apiScore: record.apiScore,
              projectScore: record.projectScore,
              avgScore: record.avgScore,
              timestamp: new Date().toISOString()
            });
          } else {
            const newCandidateRef = await addDoc(collection(db, "candidates"), {
              email: record.email,
              name: record.name,
              batch: selectedBatch,
              avgScore: record.avgScore,
              codingScore: record.codingScore,
              apiScore: record.apiScore,
              projectScore: record.projectScore,
              lastAssessment: weekModule,
              createdAt: new Date().toISOString()
            });

            await addDoc(collection(db, "assessment_snapshots"), {
              candidateId: newCandidateRef.id,
              candidateEmail: record.email,
              name: record.name,
              batch: selectedBatch,
              week: weekModule,
              codingScore: record.codingScore,
              apiScore: record.apiScore,
              projectScore: record.projectScore,
              avgScore: record.avgScore,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (lowPerformersCount > 0) {
          await triggerSystemAlert({
            title: "Performance Redline Triggered",
            description: `${lowPerformersCount} candidates in ${selectedBatch} scored below the 60% threshold in ${weekModule}.`,
            severity: "High"
          });
        }

        setIsSaving(false);
        showToast(`Successfully processed ${performanceRecords.length} student scores!`);
      } catch (err) {
        console.error("Error updating scores:", err);
        showToast("Error updating candidate records", 'error');
        setIsSaving(false);
      }
    };
    if (isCSV) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
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

  const handleViewSnapshot = async (week: string) => {
    if (week === "Live") {
      setViewingSnapshots(null);
      setActiveSnapshotWeek("Live");
      return;
    }

    try {
      const q = query(
        collection(db, "assessment_snapshots"),
        where("batch", "==", selectedBatch),
        where("week", "==", week)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(d => d.data());
      setViewingSnapshots(records);
      setActiveSnapshotWeek(week);
    } catch (err) {
      console.error("Error loading snapshot:", err);
    }
  };

  const displayedList = viewingSnapshots || displayCandidates;

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
          {profile?.role === "Trainer" && (
            <div className="glass-card p-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Upload Scores</p>
              <div className="space-y-5">
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1 whitespace-nowrap">
                      Target Batch
                    </label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="h-11 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select a batch...</option>
                      {liveBatches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1 whitespace-nowrap">
                      Week Reference
                    </label>
                    <input
                      type="text"
                      value={weekModule}
                      onChange={(e) => setWeekModule(e.target.value)}
                      placeholder="e.g. Week 1"
                      className="h-11 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <input type="file" id="scoreUpload" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                <button onClick={() => document.getElementById('scoreUpload')?.click()} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#3B82F6", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)" }}>
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Upload Scores CSV
                </button>
              </div>
            </div>
          )}

          <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} className="text-teal-400" />
              <p className="text-base font-bold text-white uppercase tracking-wider text-xs">Score Distribution</p>
            </div>
            <div className="flex-1 min-h-[200px]" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
          <div className="px-6 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assessment Score Sheet</p>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <span className="text-[9px] text-zinc-500 uppercase font-bold mr-2">History:</span>
              <button 
                onClick={() => handleViewSnapshot("Live")}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${activeSnapshotWeek === "Live" ? "bg-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.4)]" : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700"}`}
              >
                LIVE VIEW
              </button>
              {availableWeeks.sort().map(week => (
                <button 
                  key={week}
                  onClick={() => handleViewSnapshot(week)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all whitespace-nowrap ${activeSnapshotWeek === week ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700"}`}
                >
                  {week.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Coding</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">API</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Overall</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {displayedList.map((c: any, i: number) => (
                  <tr key={c.id || i} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{c.name}</span>
                        <span className="text-[10px] text-zinc-500">{c.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.codingScore || 0}%</td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.apiScore || 0}%</td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-400">{c.projectScore || 0}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-400">{c.avgScore || 0}%</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[9px] text-teal-400 uppercase tracking-tighter">
                          {c.lastAssessment || c.week || "Latest"}
                        </span>
                      </div>
                    </td>
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
