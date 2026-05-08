"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import type { BatchStatus } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { Plus, Search, Users, CheckCircle2, Calendar, CheckSquare, Activity } from "lucide-react";

const statusBadge = (s: BatchStatus) => {
  const map: Record<BatchStatus, string> = {
    Running: "badge-running", Planned: "badge-planned",
    Completed: "badge-completed", Closed: "badge-closed"
  };
  return map[s];
};

export default function BatchesPage() {
  const { profile } = useAuth();
  const [displayBatches, setDisplayBatches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Form State
  const [newBatchName, setNewBatchName] = useState("");
  const [newTrainer, setNewTrainer] = useState("Arjun Mehta");

  // Fetch from Firestore on Load (BRD 6.2 Persistence)
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const firestoreBatches = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        setDisplayBatches(firestoreBatches);
      } catch (error) {
        console.error("Error fetching batches:", error);
      }
    };
    fetchBatches();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = displayBatches.filter(b => {
    // BRD 4.1: Trainer sees ONLY their assigned batches (matched by trainer name)
    if (profile?.role === "Trainer") {
      if (b.trainer !== profile.name) return false;
    }
    return (filterStatus === "All" || b.status === filterStatus) &&
           b.name.toLowerCase().includes(search.toLowerCase());
  });

  const [selectedBatch, setSelectedBatch] = useState<typeof displayBatches[0] | null>(null);

  const handleCreateBatch = async () => {
    if (!newBatchName) return showToast("Please enter a batch name", 'error');
    
    setIsSaving(true);
    try {
      const newBatchData = {
        batchId: `B26-${String(displayBatches.length + 1).padStart(3, '0')}`,
        name: newBatchName,
        status: "Running" as const,
        trainer: newTrainer,
        avgAttendance: 0,
        avgScore: 0,
        enrolled: 0,
        capacity: 25,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "2026-08-08",
        coordinator: profile?.name || "Admin",
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "batches"), newBatchData);
      
      setDisplayBatches([{ id: docRef.id, ...newBatchData }, ...displayBatches]);
      setIsSaving(false);
      setShowCreateModal(false);
      setNewBatchName("");
      showToast("Batch created successfully and saved to Database!");
    } catch (error) {
      console.error("Error adding batch:", error);
      showToast("Failed to save to database", 'error');
      setIsSaving(false);
    }
  };



  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header title="Batch Management" subtitle="Create, track, and manage all training batches" />
      
      {/* UI Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[10001] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
      
      {/* Batch Detail Slide-over */}
      {selectedBatch && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBatch(null)} />
          <div className="relative w-full max-w-xl bg-[#09090b] border-l border-white/[0.08] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 to-transparent">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedBatch.name}</h2>
                <p className="text-xs text-teal-400 font-bold uppercase tracking-widest mt-1">{selectedBatch.id} • {selectedBatch.status}</p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="w-10 h-10 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                  <p className="text-xl font-bold text-white">{selectedBatch.avgAttendance}%</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Attendance</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xl font-bold text-white">{selectedBatch.avgScore}%</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Avg Score</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xl font-bold text-white">{selectedBatch.enrolled}/{selectedBatch.capacity}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Enrolled</p>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-zinc-800/20 border border-zinc-800">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={16} className="text-teal-400" />
                    Batch Governance
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Primary Trainer</span>
                      <span className="text-xs font-semibold text-white">{selectedBatch.trainer}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Training Window</span>
                      <span className="text-xs font-semibold text-white">{selectedBatch.startDate} → {selectedBatch.endDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Coordinator</span>
                      <span className="text-xs font-semibold text-white">{selectedBatch.coordinator}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-800/20 border border-zinc-800">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-amber-400" />
                    Operational Health
                  </h4>
                  <div className="space-y-4">
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${selectedBatch.avgAttendance}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium">Weekly compliance is stable. No alerts triggered in the last 48 hours.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-zinc-800 grid grid-cols-2 gap-4">
              <button className="py-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Edit Batch</button>
              <button className="py-3 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20">Send Batch Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-card p-8 w-full max-w-md border-white/[0.1] shadow-2xl animate-in fade-in duration-200 my-auto">
            <h3 className="text-xl font-bold text-white mb-2">Create New Training Batch</h3>
            <p className="text-xs text-zinc-500 mb-6 uppercase tracking-widest font-bold">BRD Section 5.1 Compliance</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. AWS Cloud B2" 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Assigned Trainer</label>
                <select 
                  value={newTrainer}
                  onChange={(e) => setNewTrainer(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                >
                  <option>Arjun Mehta</option>
                  <option>Sneha Rao</option>
                  <option>Vikram Nair</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Start Date</label>
                  <input type="date" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">End Date</label>
                  <input type="date" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Cancel</button>
              <button onClick={handleCreateBatch} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSaving ? "Creating..." : "Save Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 space-y-6 fade-in h-full overflow-y-auto pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181b]/50 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#18181b]/50 p-1 rounded-xl border border-white/[0.06]">
            {["All", "Running", "Planned", "Completed", "Closed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? "bg-teal-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all"
            style={{ background: "#14b8a6" }}>
            <Plus size={18} /> Create Batch
          </button>
        </div>
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: displayBatches.length, color: "#14b8a6" },
            { label: "Running", value: displayBatches.filter(b => b.status === "Running").length, color: "#10b981" },
            { label: "Planned", value: displayBatches.filter(b => b.status === "Planned").length, color: "#3b82f6" },
            { label: "Completed", value: displayBatches.filter(b => ["Completed","Closed"].includes(b.status)).length, color: "#2dd4bf" },
          ].map(c => (
            <div key={c.label} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${c.color}22`, color: c.color }}>{c.value}</div>
              <p className="text-sm font-medium" style={{ color: "#71717a" }}>{c.label} Batches</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map(b => (
            <div key={b.id} 
              onClick={() => setSelectedBatch(b)}
              className="glass-card p-6 metric-card cursor-pointer flex flex-col h-full hover:border-white/[0.1] transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-base font-bold text-white">{b.name}</p>
                  <p className="text-xs mt-1" style={{ color: "#52525b" }}>ID: {b.batchId || b.id} · {b.coordinator}</p>
                </div>
                <span className={`${statusBadge(b.status as BatchStatus)} px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0`}>{b.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: (b.avgAttendance || 0) < 70 && (b.avgAttendance || 0) > 0 ? "#ef4444" : (b.avgAttendance || 0) === 0 ? "#3f3f46" : (b.avgAttendance || 0) < 80 ? "#f59e0b" : "#22c55e" }}>
                    {b.avgAttendance || 0}%
                  </p>
                  <p className="text-xs" style={{ color: "#52525b" }}>Attendance</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: (b.avgScore || 0) === 0 ? "#3f3f46" : (b.avgScore || 0) < 60 ? "#ef4444" : "#14b8a6" }}>
                    {b.avgScore || 0}%
                  </p>
                  <p className="text-xs" style={{ color: "#52525b" }}>Avg Score</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold text-white">{b.enrolled || 0}/{b.capacity || 0}</p>
                  <p className="text-xs" style={{ color: "#52525b" }}>Enrolled</p>
                </div>
              </div>
              <div className="mb-auto">
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "#52525b" }}>
                    <span>Capacity fill</span><span>{b.capacity > 0 ? Math.round((b.enrolled || 0) / b.capacity * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${b.capacity > 0 ? ((b.enrolled || 0) / b.capacity) * 100 : 0}%` }} /></div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs" style={{ color: "#52525b" }}>
                  <span>Trainer: {b.trainer}</span>
                  <span className="font-medium text-teal-400">{b.startDate} → {b.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




