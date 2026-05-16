"use client";
import Header from "@/components/Header";
import { Search, Plus, Upload, X, Loader2, Trash2, Activity, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, increment, where, onSnapshot } from "firebase/firestore";

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
  const [candidateHistory, setCandidateHistory] = useState<any[]>([]);
  const [parsedCandidates, setParsedCandidates] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  useEffect(() => {
    // Real-time Candidates
    const candQ = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
    const unsubCands = onSnapshot(candQ, (snap) => {
      const fireCands = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setDisplayCandidates(fireCands);
    });

    // Real-time Batches
    const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
    const unsubBatches = onSnapshot(batchQ, (snap) => {
      const fireBatches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setLiveBatches(fireBatches);
      if (fireBatches.length > 0 && !newBatch) setNewBatch(fireBatches[0].name);
    });

    return () => {
      unsubCands();
      unsubBatches();
    };
  }, [newBatch]);

  useEffect(() => {
    if (selectedCandidate) {
      const q = query(
        collection(db, "assessment_snapshots"), 
        where("candidateEmail", "==", selectedCandidate.email)
      );
      const unsubHistory = onSnapshot(q, (snap) => {
        const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort in memory to avoid needing a Firestore Composite Index
        const sorted = history.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setCandidateHistory(sorted);
      });
      return () => unsubHistory();
    }
  }, [selectedCandidate]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddCandidate = async () => {
    if (!newName || !newEmail) return showToast("Please fill all fields", 'error');
    setIsSaving(true);
    try {
      const newCandData = {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        batch: newBatch,
        attendance: 100,
        avgScore: 0,
        status: "ACTIVE",
        risk: "LOW",
        createdAt: new Date().toISOString()
      };
      // 1. Enroll Candidate
      const docRef = await addDoc(collection(db, "candidates"), newCandData);
      
      // 2. Sync with Batch Enrollment Count
      const batchQ = query(collection(db, "batches"), where("name", "==", newBatch));
      const batchSnap = await getDocs(batchQ);
      if (!batchSnap.empty) {
        const batchDoc = batchSnap.docs[0];
        await updateDoc(doc(db, "batches", batchDoc.id), {
          enrolled: increment(1)
        });
      }

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
      return showToast("Please use .csv format only.", 'error');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      const dataLines = lines.slice(1);
      
      const parsed = dataLines.map((line, index) => {
        const columns = line.split(/[,\t;]/).map(s => s.trim().replace(/^["']|["']$/g, ""));
        if (columns.length >= 3) {
          const [name, email, batch] = columns;
          if (name && email.includes("@") && batch) {
            return { 
              id: `temp-${index}`, 
              name: name.trim(), 
              email: email.trim().toLowerCase(), 
              batch: batch.trim() 
            };
          }
        }
        return null;
      }).filter(Boolean);

      if (parsed.length > 0) {
        setParsedCandidates(parsed);
        setShowPreviewModal(true);
      } else {
        showToast("No valid records found in CSV", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleBulkEnroll = async () => {
    setIsBulkSaving(true);
    showToast("Enrolling candidates...", "success");

    try {
      const batchCounts: Record<string, number> = {};
      
      for (const cand of parsedCandidates) {
        const candData = {
          name: cand.name,
          email: cand.email,
          batch: cand.batch,
          attendance: 100,
          avgScore: 0,
          status: "ACTIVE",
          risk: "LOW",
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "candidates"), candData);
        batchCounts[cand.batch] = (batchCounts[cand.batch] || 0) + 1;
      }

      // Sync Batch Enrollment Counts
      for (const [batchName, addCount] of Object.entries(batchCounts)) {
        const bQ = query(collection(db, "batches"), where("name", "==", batchName));
        const bSnap = await getDocs(bQ);
        if (!bSnap.empty) {
          await updateDoc(doc(db, "batches", bSnap.docs[0].id), {
            enrolled: increment(addCount)
          });
        }
      }

      await addDoc(collection(db, "file_logs"), {
        name: "Bulk Upload",
        type: "Candidates",
        status: "Success",
        uploader: profile?.name || "Admin",
        records: parsedCandidates.length,
        batch: "Bulk Ingestion",
        timestamp: new Date().toISOString()
      });

      showToast(`Successfully enrolled ${parsedCandidates.length} candidates!`);
      setShowPreviewModal(false);
      setParsedCandidates([]);
    } catch (err) {
      console.error(err);
      showToast("Error saving candidates", "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const removeFromPreview = (id: string) => {
    setParsedCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleDiscontinueCandidate = async (candidate: any) => {
    if (!window.confirm(`Are you sure you want to DISCONTINUE ${candidate.name}? This is a permanent administrative action.`)) return;
    
    setIsSaving(true);
    try {
      const id = candidate.id;
      // 1. Update Candidate Status
      await updateDoc(doc(db, "candidates", id), {
        status: "DISCONTINUED",
        risk: "LOW",
        updatedAt: new Date().toISOString()
      });

      // 2. Decrement Batch Enrollment (They are no longer "In" the batch)
      const bQ = query(collection(db, "batches"), where("name", "==", candidate.batch));
      const bSnap = await getDocs(bQ);
      if (!bSnap.empty) {
        await updateDoc(doc(db, "batches", bSnap.docs[0].id), {
          enrolled: increment(-1)
        });
      }

      // 3. Log to Audit
      await addDoc(collection(db, "audit_logs"), {
        action: "Candidate Discontinued",
        details: `${candidate.name} (${candidate.email}) has been marked as discontinued from ${candidate.batch}.`,
        user: profile?.name || "Coordinator",
        category: "Governance",
        timestamp: new Date().toISOString()
      });

      showToast(`${candidate.name} marked as discontinued.`);
      setSelectedCandidate(prev => prev ? { ...prev, status: "DISCONTINUED" } : null);
      setIsSaving(false);
    } catch (error) {
      console.error("Discontinue Error:", error);
      showToast("Error updating status", 'error');
      setIsSaving(false);
    }
  };

  const handleDeleteCandidate = async (candidate: any) => {
    if (!window.confirm(`Are you sure you want to delete ${candidate.name}?`)) return;
    try {
      const id = candidate.id;
      // 1. Delete from candidates
      if (id && id.length > 5) {
        await deleteDoc(doc(db, "candidates", id));
        
        // 2. Decrement Batch Enrollment
        const bQ = query(collection(db, "batches"), where("name", "==", candidate.batch));
        const bSnap = await getDocs(bQ);
        if (!bSnap.empty) {
          await updateDoc(doc(db, "batches", bSnap.docs[0].id), {
            enrolled: increment(-1)
          });
        }
        showToast("Candidate removed successfully", 'success');
      }
    } catch (error) {
      console.error("Delete Error:", error);
      showToast("Error deleting entry from database", 'error');
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

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-card w-full max-w-4xl max-h-[80vh] flex flex-col border-white/[0.1] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Review Enrollment List</h3>
                <p className="text-xs text-zinc-500 mt-1">Found {parsedCandidates.length} valid candidates in CSV</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-3 px-2">Name</th>
                    <th className="pb-3 px-2">Email</th>
                    <th className="pb-3 px-2">Target Batch</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {parsedCandidates.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.03] group hover:bg-white/[0.02]">
                      <td className="py-3 px-2 text-white font-medium">{c.name}</td>
                      <td className="py-3 px-2 text-zinc-400">{c.email}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 text-[10px] font-bold">{c.batch}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => removeFromPreview(c.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="px-6 py-2.5 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all"
              >
                Discard
              </button>
              <button 
                onClick={handleBulkEnroll} 
                disabled={isBulkSaving}
                className="px-8 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg flex items-center gap-2"
              >
                {isBulkSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>Finalize & Enroll All</>
                )}
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
                  {candidateHistory.length > 0 ? candidateHistory.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">{a.week || "Assessment"}</p>
                        <p className="text-[10px] text-zinc-500">{new Date(a.timestamp).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold ${a.avgScore >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{a.avgScore}%</span>
                    </div>
                  )) : (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">No Data Logged Yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Insight */}
              <div className="p-6 rounded-2xl bg-teal-600/10 border border-white/[0.08]">
                <h4 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-2">
                  <Activity size={16} /> Maverick AI Insight
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedCandidate.attendance < 75 
                    ? `Warning: Attendance is currently ${selectedCandidate.attendance}%. High risk of disengagement. Immediate intervention required.`
                    : selectedCandidate.avgScore < 60 
                    ? `Candidate is showing strong attendance but struggling with assessments (${selectedCandidate.avgScore}%). Recommend personalized coaching.`
                    : `Excellent performance! With ${selectedCandidate.attendance}% attendance and ${selectedCandidate.avgScore}% scores, this candidate is a top performer.`}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button className="flex-1 py-3.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-black/20">Send Performance Alert</button>
                  <button className="flex-1 py-3.5 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-all">Download Report</button>
                </div>
                
                {profile?.role !== "Trainer" && selectedCandidate.status !== "DISCONTINUED" && (
                  <button 
                    onClick={() => handleDiscontinueCandidate(selectedCandidate)}
                    className="w-full py-3.5 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    Mark as Discontinued
                  </button>
                )}

                {profile?.role === "Training Coordinator" && (
                  <button 
                    onClick={() => {
                      handleDeleteCandidate(selectedCandidate);
                      setSelectedCandidate(null);
                    }}
                    className="w-full py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                  >
                    Delete Forever
                  </button>
                )}
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(c); }}
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




