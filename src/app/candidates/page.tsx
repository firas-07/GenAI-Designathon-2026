"use client";
import Header from "@/components/Header";
import { Search, Plus, Upload, X, Loader2, Trash2, Activity, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";

export default function CandidatesPage() {
  const { profile } = useAuth();
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("All Risk");
  const [filterBatch, setFilterBatch] = useState("All Batches");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Live Candidates
        const candQ = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
        const candSnap = await getDocs(candQ);
        const fireCands = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setDisplayCandidates(fireCands);

        // Fetch Live Batches for Dropdowns
        const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const batchSnap = await getDocs(batchQ);
        const fireBatches = batchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setLiveBatches(fireBatches);
        
        // Default the new candidate batch to the latest live batch if available
        if (fireBatches.length > 0) setNewBatch(fireBatches[0].name);
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

  const handleAddCandidate = async () => {
    if (!newName || !newEmail) return showToast("Please fill all fields", 'error');
    setIsSaving(true);
    try {
      const newCandData = {
        name: newName,
        email: newEmail,
        batch: newBatch,
        attendance: 0,
        avgScore: 0,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "candidates"), newCandData);
      setDisplayCandidates([{ id: docRef.id, ...newCandData }, ...displayCandidates]);
      setIsSaving(false);
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      showToast("Candidate enrolled successfully!");
    } catch (error) {
      showToast("Database error", 'error');
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      return showToast("Please use .csv format only. Excel files must be 'Save As CSV'.", 'error');
    }

    setIsSaving(true);
    showToast("Parsing CSV and Enrolling Candidates...", 'success');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // Skip header
      
      let count = 0;
      const newCands = [];

      for (const line of lines) {
        const [name, email, batch] = line.split(",").map(s => s.trim());
        if (name && email && batch) {
          const candData = {
            name, email, batch,
            attendance: 100, avgScore: 0, status: "ACTIVE", risk: "LOW",
            createdAt: new Date().toISOString()
          };
          const docRef = await addDoc(collection(db, "candidates"), candData);
          newCands.push({ id: docRef.id, ...candData });
          count++;
        }
      }

      setDisplayCandidates(prev => [...newCands, ...prev]);
      setIsSaving(false);
      showToast(`Successfully enrolled ${count} candidates via Bulk Upload!`);
    };
    reader.readAsText(file);
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      // Only delete if it's a Firestore ID (longer than typical mock IDs)
      if (id.length > 5) {
        await deleteDoc(doc(db, "candidates", id));
      }
      setDisplayCandidates(prev => prev.filter(c => c.id !== id));
      showToast("Entry removed successfully");
    } catch (error) {
      showToast("Error deleting entry", 'error');
    }
  };

  const filtered = displayCandidates.filter(c => {
    if (profile?.role === "Trainer") {
      if (c.batch !== profile.name && c.trainer !== profile.name) return false;
    }
    return (filterRisk === "All Risk" || c.risk === filterRisk.toUpperCase().replace(" RISK", "")) &&
           (filterBatch === "All Batches" || c.batch === filterBatch) &&
           (c.name.toLowerCase().includes(search.toLowerCase()) || 
            c.email.toLowerCase().includes(search.toLowerCase()));
  });

  const getCalculatedRisk = (attendance: number, score: number) => {
    if (attendance < 60 || (score > 0 && score < 50)) return "HIGH";
    if (attendance < 75 || (score > 0 && score < 70)) return "MEDIUM";
    return "LOW";
  };

  const riskColor = (r: string) => {
    const map: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };
    return map[r?.toUpperCase()] || "#5271A3";
  };

  const stats = {
    total: displayCandidates.length,
    highRisk: displayCandidates.filter(c => getCalculatedRisk(c.attendance, c.avgScore) === "HIGH").length,
    offered: displayCandidates.filter(c => c.status === "OFFERED").length,
    discontinued: displayCandidates.filter(c => c.status === "DISCONTINUED").length
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-card p-8 w-full max-w-md border-white/[0.1] shadow-2xl animate-in fade-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Enroll New Candidate</h3>
            <p className="text-xs text-zinc-500 mb-6 uppercase tracking-widest font-bold">BRD Section 5.1 Compliance</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Rahul Sharma" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="rahul@example.com" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Assign to Batch</label>
                <select value={newBatch} onChange={e => setNewBatch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500">
                  {liveBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Cancel</button>
              <button onClick={handleAddCandidate} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isSaving ? "Saving..." : "Enroll Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Deep-Dive Slide-over */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCandidate(null)} />
          <div className="relative w-full max-w-xl h-full bg-[#0c0c0e] border-l border-white/[0.08] backdrop-blur-2xl shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500 overflow-y-auto">
            
            {/* Header */}
            <div className="p-8 border-b border-white/5 relative">
              <button onClick={() => setSelectedCandidate(null)} className="absolute top-8 right-8 text-zinc-400 hover:text-white transition-all"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${riskColor(selectedCandidate.risk)}, ${riskColor(selectedCandidate.risk)}88)` }}>
                  {selectedCandidate.name.split(" ").map((n:any) => n[0]).join("")}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCandidate.name}</h2>
                  <p className="text-teal-400 font-medium">{selectedCandidate.batch}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest badge-${selectedCandidate.status.toLowerCase().replace(/ /g, "-")}`}>{selectedCandidate.status}</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest badge-${(selectedCandidate.risk || "LOW").toLowerCase()}`}>{selectedCandidate.risk || "LOW"} RISK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 pb-32">
              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-6 border-white/[0.06]">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Overall Attendance</p>
                  <div className="flex items-end gap-2">
                    <h4 className="text-3xl font-bold text-white">{selectedCandidate.attendance}%</h4>
                    <p className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
                      <Activity size={12} /> +2%
                    </p>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${selectedCandidate.attendance}%` }} />
                  </div>
                </div>
                <div className="glass-card p-6 border-white/[0.06]">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Average Score</p>
                  <div className="flex items-end gap-2">
                    <h4 className="text-3xl font-bold text-white">{selectedCandidate.avgScore}%</h4>
                    <p className="text-xs text-teal-400 mb-1 flex items-center gap-1">
                      Target: 80%
                    </p>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${selectedCandidate.avgScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Assessment Timeline */}
              <div className="glass-card p-6 border-white/[0.06]">
                <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar size={16} className="text-teal-400" /> Recent Assessments
                </h4>
                <div className="space-y-4">
                  {[
                    { name: "Frontend Fundamentals", score: 82, date: "2 days ago" },
                    { name: "React State Management", score: 45, date: "1 week ago" },
                    { name: "Database Design", score: 70, date: "2 weeks ago" }
                  ].map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">{a.name}</p>
                        <p className="text-[10px] text-zinc-500">{a.date}</p>
                      </div>
                      <span className={`text-xs font-bold ${a.score >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{a.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="p-6 rounded-2xl bg-teal-600/10 border border-white/[0.08]">
                <h4 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-2">
                  <Activity size={16} /> Maverick AI Insight
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Candidate is showing strong performance in theoretical modules but struggling with practical state management. Suggest pairing with a Peer Mentor for the upcoming Project Phase.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button className="flex-1 py-3.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20">Send Performance Alert</button>
                <button className="flex-1 py-3.5 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Download Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Header title="Candidate Management" subtitle="Track and manage all enrolled candidates" />
      <div className="p-8 space-y-6 fade-in h-full overflow-y-auto pb-24">
        {toast && (
          <div className={`fixed top-5 right-5 p-4 rounded-xl text-xs font-bold shadow-2xl z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
              {toast.message}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Candidates", value: stats.total, color: "#3B82F6" },
            { label: "High Risk", value: stats.highRisk, color: "#ef4444" },
            { label: "Offered", value: stats.offered, color: "#10b981" },
            { label: "Discontinued", value: stats.discontinued, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${s.color}22`, color: s.color }}>{s.value}</div>
              <p className="text-sm font-medium" style={{ color: "#82A0CE" }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-wrap">
            <div className="relative w-full lg:w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5271A3" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..."
                className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none w-full"
                style={{ background: "rgba(24, 24, 27,0.7)", border: "1px solid rgba(255,255,255,0.06)", color: "#e4e4e7" }} />
            </div>
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-xl text-xs outline-none bg-[#0B1221]/70 border border-white/[0.06] text-[#94a3b8]">
                {["All Risk", "High Risk", "Medium Risk", "Low Risk"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs outline-none bg-[#0B1221]/70 border border-white/[0.06] text-[#94a3b8]">
              <option value="All Batches">All Batches</option>
              {liveBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              id="csvUpload" 
              hidden 
              accept=".csv" 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => document.getElementById('csvUpload')?.click()}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-all disabled:opacity-50">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
              Upload CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all"
              style={{ background: "#3B82F6" }}>
              <Plus size={16} /> Add Candidate
            </button>
          </div>
        </div>

        <div className="glass-card overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                {["Candidate", "Batch", "Attendance", "Avg Score", "Status", "Risk Level", "Action"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#5271A3" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg,${riskColor(c.risk)}88,${riskColor(c.risk)}44)` }}>
                        {c.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{c.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium" style={{ color: "#82A0CE" }}>{c.batch || c.batchName}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs min-w-[32px]" style={{ color: (c.attendance || 0) < 60 ? "#ef4444" : (c.attendance || 0) < 75 ? "#f59e0b" : "#10b981" }}>
                        {c.attendance || 0}%
                      </span>
                      <div className="w-16 progress-bar">
                        <div className="progress-fill" style={{ width: `${c.attendance || 0}%`, background: (c.attendance || 0) < 60 ? "#ef4444" : (c.attendance || 0) < 75 ? "#f59e0b" : "#10b981" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-sm" style={{ color: (c.avgScore || 0) < 50 ? "#ef4444" : (c.avgScore || 0) < 65 ? "#f59e0b" : "#5eead4" }}>
                      {c.avgScore || 0}%
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider badge-${(c.status || "ACTIVE").toLowerCase().replace(/ /g, "-")}`}>{c.status || "ACTIVE"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider badge-${getCalculatedRisk(c.attendance, c.avgScore).toLowerCase()}`}>{getCalculatedRisk(c.attendance, c.avgScore)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCandidate(c); }}
                        className="text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all hover:opacity-80 bg-teal-500/15 text-teal-400">View</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(c.id); }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-zinc-500 font-medium">No candidates matching the current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}




