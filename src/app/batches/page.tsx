"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import type { BatchStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/governance";
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, where, deleteDoc, doc, getDoc } from "firebase/firestore";
import { Plus, Search, Users, CheckCircle2, Calendar, CheckSquare, Activity, Trash2, Bell } from "lucide-react";

const statusBadge = (s: BatchStatus) => {
  const map: Record<BatchStatus, string> = {
    Running: "badge-running",
    Completed: "badge-completed",
    Closed: "badge-closed",
    Planned: "badge-planned"
  };
  return map[s] || "badge-closed";
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
  const [trainers, setTrainers] = useState<any[]>([]);
  const [newTrainer, setNewTrainer] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("2026-08-08");
  const [capacity, setCapacity] = useState(25);
  const [isEditing, setIsEditing] = useState(false);
  const [editBatchId, setEditBatchId] = useState("");

  const [weights, setWeights] = useState({ sprint: 20, api: 20, coding: 30, project: 30 });

  // Real-time Data Subscriptions
  useEffect(() => {
    // Fetch Weights
    getDoc(doc(db, "settings", "governance")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setWeights({
          sprint: d.sprintWeight || 20,
          api: d.apiWeight || 20,
          coding: d.codingWeight || 30,
          project: d.projectWeight || 30
        });
      }
    });

    // We need both candidates and batches to calculate live enrollment counts and averages
    const unsubCands = onSnapshot(collection(db, "candidates"), (candSnap) => {
      const allCands = candSnap.docs.map(d => d.data());
      
      let batchesQuery = query(collection(db, "batches"), orderBy("createdAt", "desc"));
      
      // RBAC Filter (BRD 4.1)
      if (profile?.role === "Trainer") {
        const { where } = require("firebase/firestore");
        batchesQuery = query(collection(db, "batches"), where("trainer", "==", profile.name), orderBy("createdAt", "desc"));
      }

      const unsubBatches = onSnapshot(batchesQuery, (batchSnap) => {
        const firestoreBatches = batchSnap.docs.map(doc => {
          const data = doc.data();
          const batchCands = allCands.filter((c: any) => c.batch === data.name);
          
          const actualCount = batchCands.length;
          const avgAttendance = actualCount > 0 
            ? Math.round(batchCands.reduce((acc: number, c: any) => acc + (c.attendance || 0), 0) / actualCount)
            : 0;
          
          // Weighted Average Score (BRD 5.8)
          const avgScore = actualCount > 0 
            ? Math.round(batchCands.reduce((acc: number, c: any) => {
                const s = c.scores || {};
                const weighted = (
                  ((s.sprint || 0) * weights.sprint) +
                  ((s.api || 0) * weights.api) +
                  ((s.coding || 0) * weights.coding) +
                  ((s.project || 0) * weights.project)
                ) / 100;
                return acc + (weighted || c.avgScore || 0);
              }, 0) / actualCount)
            : 0;
          
          return { 
            id: doc.id, 
            ...data,
            enrolled: actualCount,
            attendance: avgAttendance,
            avgScore: avgScore
          };
        });
        setDisplayBatches(firestoreBatches);
      });

      return () => unsubBatches();
    });

    // Fetch trainers from users collection
    const fetchTrainers = async () => {
      const q = query(collection(db, "users"), where("role", "==", "Trainer"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data().name);
      setTrainers(list);
      if (list.length > 0) setNewTrainer(list[0]);
    };
    fetchTrainers();

    return () => unsubCands();
  }, [profile]);

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

  const handleSaveBatch = async () => {
    if (!newBatchName) return showToast("Please enter a batch name", 'error');
    
    setIsSaving(true);
    try {
      const batchData = {
        name: newBatchName,
        trainer: newTrainer,
        capacity: Number(capacity),
        startDate,
        endDate,
        updatedAt: new Date().toISOString()
      };

      if (isEditing) {
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "batches", editBatchId), batchData);
        showToast("Batch updated successfully!");
      } else {
        const newBatchData = {
          ...batchData,
          batchId: `B26-${String(displayBatches.length + 1).padStart(3, '0')}`,
          status: "Running" as const,
          avgAttendance: 0,
          avgScore: 0,
          enrolled: 0,
          coordinator: profile?.name || "Admin",
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "batches"), newBatchData);
        showToast("Batch created successfully!");
      }
      
      setIsSaving(false);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error("Error saving batch:", error);
      showToast("Failed to save to database", 'error');
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewBatchName("");
    if (trainers.length > 0) setNewTrainer(trainers[0]);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("2026-08-08");
    setCapacity(25);
    setIsEditing(false);
    setEditBatchId("");
  };

  const openEditModal = (batch: any) => {
    setNewBatchName(batch.name);
    setNewTrainer(batch.trainer);
    setStartDate(batch.startDate);
    setEndDate(batch.endDate);
    setCapacity(batch.capacity);
    setEditBatchId(batch.id);
    setIsEditing(true);
    setShowCreateModal(true);
    setSelectedBatch(null);
  };

  const handleTriggerFeedback = async (batchId: string, batchName: string) => {
    try {
      const { updateDoc, doc, collection, query, where, getDocs } = await import("firebase/firestore");
      
      // 1. Update Batch feedback status
      await updateDoc(doc(db, "batches", batchId), {
        feedbackStatus: "Active",
        feedbackTriggeredAt: new Date().toISOString()
      });

      // 2. Fetch candidates registered in this batch
      const q = query(collection(db, "candidates"), where("batch", "==", batchName));
      const snap = await getDocs(q);
      
      console.log(`[Feedback Dispatch] Found ${snap.size} candidates in batch ${batchName} to email.`);

      // 3. Loop and send actual emails to each candidate
      let successCount = 0;
      const emailPromises = snap.docs.map(async (candidateDoc) => {
        const c = candidateDoc.data();
        const emailAddress = c.email || "designathon-student@maverick.com"; // safe fallback
        try {
          const res = await fetch("/api/email/send-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: emailAddress,
              recipientName: c.name || "Student",
              subject: `Feedback Survey: ${batchName} Cohort`,
              messageBody: `Please take 2 minutes to provide feedback on your training module in ${batchName}. Your response will help us maintain our rigorous training excellence.\n\nClick the link below to complete the evaluation:\n${window.location.origin}/feedback`,
              type: "feedback"
            })
          });
          if (res.ok) successCount++;
        } catch (mailErr) {
          console.error(`Failed to send feedback email to ${emailAddress}:`, mailErr);
        }
      });
      await Promise.all(emailPromises);

      // 4. Log to Governance activity ledger
      await logActivity({
        action: "Communication",
        category: "Governance",
        details: `[FEEDBACK TRIGGERED] Survey launched for ${batchName}. Dispatched actual email surveys to ${successCount}/${snap.size} students via feedback channel (service_3ypywql).`,
        user: profile?.name || "Coordinator"
      });
      
      showToast(`Feedback collection started! Surveys dispatched to ${successCount} candidates.`);
    } catch (err) {
      console.error("Feedback error:", err);
      showToast("Failed to initiate feedback", "error");
    }
  };

  const handleGraduateBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Are you sure you want to GRADUATE ${batchName}? This will mark all candidates as completed and lock the batch.`)) return;
    
    setIsSaving(true);
    try {
      const { updateDoc, doc, collection, query, where, getDocs, addDoc } = await import("firebase/firestore");
      
      // 1. Update Batch Status
      await updateDoc(doc(db, "batches", batchId), {
        status: "Completed",
        updatedAt: new Date().toISOString()
      });

      // 2. Graduate all candidates in this batch
      const q = query(collection(db, "candidates"), where("batch", "==", batchName));
      const snap = await getDocs(q);
      
      const promises = snap.docs.map(d => 
        updateDoc(doc(db, "candidates", d.id), {
          status: "COMPLETED",
          risk: "LOW",
          updatedAt: new Date().toISOString()
        })
      );
      await Promise.all(promises);

      // 3. Log to Audit (BRD 5.1 & 5.6)
      await logActivity({
        action: "Batch Graduated",
        category: "Governance",
        details: `Batch ${batchName} successfully completed. ${snap.size} candidates graduated and moved to alumni status.`,
        user: profile?.name || "Coordinator"
      });

      showToast(`Batch ${batchName} graduated successfully!`);
      setSelectedBatch((prev: any) => prev ? { ...prev, status: "Completed" } : null);
      setIsSaving(false);
    } catch (error) {
      console.error("Error graduating batch:", error);
      showToast("Failed to graduate batch", "error");
      setIsSaving(false);
    }
  };


  const handleDeleteBatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "batches", id));
      setSelectedBatch(null);
      showToast("Batch deleted successfully");
    } catch (error) {
      console.error("Error deleting batch:", error);
      showToast("Failed to delete batch", "error");
    }
  };


  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header 
        title={profile?.role === "Trainer" ? "My Batches" : "Batch Management"} 
        subtitle={profile?.role === "Trainer" ? "Track and manage your assigned training sessions" : "Create, track, and manage all training batches"} 
      />
      
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
          <div className="relative w-full max-w-xl bg-[#040914] border-l border-white/[0.08] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 to-transparent">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedBatch.name}</h2>
                <p className="text-xs text-teal-400 font-bold uppercase tracking-widest mt-1">{selectedBatch.id} • {selectedBatch.status}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedBatch.status === "Running" && profile?.role !== "Trainer" && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleTriggerFeedback(selectedBatch.id, selectedBatch.name)}
                      className="px-4 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Bell size={14} /> Launch Feedback
                    </button>
                    <button 
                      onClick={() => handleGraduateBatch(selectedBatch.id, selectedBatch.name)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Graduate Batch
                    </button>
                  </div>
                )}
                <button onClick={() => setSelectedBatch(null)} className="w-10 h-10 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
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

            {profile?.role !== "Trainer" && (
              <div className="p-8 border-t border-zinc-800 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => openEditModal(selectedBatch)}
                  className="py-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Edit Batch
                </button>
                {profile?.role === "Training Coordinator" ? (
                  <button 
                    onClick={() => handleDeleteBatch(selectedBatch.id)}
                    className="py-3 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Delete Batch
                  </button>
                ) : (
                  <button className="py-3 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20">Send Batch Alert</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-card p-8 w-full max-w-md border-white/[0.1] shadow-2xl animate-in fade-in duration-200 my-auto">
            <h3 className="text-xl font-bold text-white mb-2">Create New Training Batch</h3>
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
              {profile?.role !== "Trainer" ? (
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Assign Trainer</label>
                  <select 
                    value={newTrainer}
                    onChange={(e) => setNewTrainer(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                  >
                    {trainers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {trainers.length === 0 && <option disabled>No trainers found</option>}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Assign Trainer</label>
                  <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-400">
                    {profile.name} (You)
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Batch Capacity</label>
                <input 
                  type="number" 
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500" 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="flex-1 py-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Cancel</button>
              <button onClick={handleSaveBatch} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSaving ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Batch" : "Save Batch")}
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
              className="w-full bg-[#0B1221]/50 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0B1221]/50 p-1 rounded-xl border border-white/[0.06]">
            {["All", "Running", "Completed", "Closed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? "bg-teal-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {s}
              </button>
            ))}
          </div>
          {profile?.role === "Training Coordinator" && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all"
              style={{ background: "#3B82F6" }}>
              <Plus size={18} /> Create Batch
            </button>
          )}
        </div>
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: displayBatches.length, color: "#3B82F6" },
            { label: "Running", value: displayBatches.filter(b => b.status === "Running").length, color: "#10b981" },
            { label: "Completed", value: displayBatches.filter(b => ["Completed","Closed"].includes(b.status)).length, color: "#60A5FA" },
          ].map(c => (
            <div key={c.label} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${c.color}22`, color: c.color }}>{c.value}</div>
              <p className="text-sm font-medium" style={{ color: "#82A0CE" }}>{c.label} Batches</p>
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
                  <p className="text-xs mt-1" style={{ color: "#5271A3" }}>ID: {b.batchId || b.id} · {b.coordinator}</p>
                </div>
                <span className={`${statusBadge(b.status as BatchStatus)} px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0`}>{b.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: (b.avgAttendance || 0) < 70 && (b.avgAttendance || 0) > 0 ? "#ef4444" : (b.avgAttendance || 0) === 0 ? "#334B76" : (b.avgAttendance || 0) < 80 ? "#f59e0b" : "#22c55e" }}>
                    {b.avgAttendance || 0}%
                  </p>
                  <p className="text-xs" style={{ color: "#5271A3" }}>Attendance</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: (b.avgScore || 0) === 0 ? "#334B76" : (b.avgScore || 0) < 60 ? "#ef4444" : "#3B82F6" }}>
                    {b.avgScore || 0}%
                  </p>
                  <p className="text-xs" style={{ color: "#5271A3" }}>Avg Score</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold text-white">{b.enrolled || 0}/{b.capacity || 0}</p>
                  <p className="text-xs" style={{ color: "#5271A3" }}>Enrolled</p>
                </div>
              </div>
              <div className="mb-auto">
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "#5271A3" }}>
                    <span>Capacity fill</span><span>{b.capacity > 0 ? Math.round((b.enrolled || 0) / b.capacity * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${b.capacity > 0 ? ((b.enrolled || 0) / b.capacity) * 100 : 0}%` }} /></div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs" style={{ color: "#5271A3" }}>
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




