"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { read, utils, set_fs } from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { Upload, AlertCircle, CheckCircle2, Clock, Loader2, X, UserCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { triggerSystemAlert } from "@/lib/governance";


const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}{p.name === "percentage" ? "%" : ""}</p>
      ))}
    </div>
  );
};

export default function AttendancePage() {
  const { profile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [stats, setStats] = useState({ present: 0, absent: 0, rate: 0 });
  const [cutoffTime, setCutoffTime] = useState("10:00");
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudents, setManualStudents] = useState<any[]>([]);
  const [liveAttendanceTrend, setLiveAttendanceTrend] = useState<any[]>([]);
  const [lowAttendanceList, setLowAttendanceList] = useState<any[]>([]);
  const [parsedAttendance, setParsedAttendance] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Real-time Data Subscriptions
  useEffect(() => {
    // 1. Governance Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "governance"), (snap) => {
      if (snap.exists()) setCutoffTime(snap.data().attendanceCutoff || "10:00");
    });

    // 2. Batches (Filtered by Role)
    const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
    const unsubBatches = onSnapshot(batchQ, (snap) => {
      const allBatches = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = profile?.role === "Trainer" 
        ? allBatches.filter(b => b.trainer === profile.name)
        : allBatches;
      setLiveBatches(filtered);
      if (filtered.length > 0 && !selectedBatch) setSelectedBatch(filtered[0].name);
    });

    // 3. Low Attendance Candidates (Real-time flags)
    const lowCandQ = query(collection(db, "candidates"), where("attendance", "<", 60));
    const unsubLowCands = onSnapshot(lowCandQ, (snap) => {
      const allLow = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      if (profile?.role === "Trainer") {
        const myBatchNames = liveBatches.map(b => b.name);
        setLowAttendanceList(allLow.filter(c => myBatchNames.includes(c.batch)));
      } else {
        setLowAttendanceList(allLow);
      }
    });

    // 4. Attendance Logs (Real-time Trend & Stats)
    const logQ = query(collection(db, "attendance_logs"), orderBy("date", "desc"));
    const unsubLogs = onSnapshot(logQ, (snap) => {
      const logs = snap.docs.map(d => d.data());
      
      // Update Today's Stats
      const todayLog = logs.find(l => l.batch === selectedBatch && l.date === attendanceDate);
      if (todayLog) {
        setStats({
          present: todayLog.presentCount || 0,
          absent: todayLog.absentCount || 0,
          rate: (todayLog.presentCount + todayLog.absentCount) > 0 
            ? Math.round((todayLog.presentCount / (todayLog.presentCount + todayLog.absentCount)) * 100) 
            : 0
        });
      } else {
        setStats({ present: 0, absent: 0, rate: 0 });
      }

      // Group for Trend Chart
      const byDate: Record<string, {present: number; total: number}> = {};
      logs.forEach(l => {
        const d = l.date || "";
        if (!d) return;
        if (!byDate[d]) byDate[d] = { present: 0, total: 0 };
        byDate[d].total += (l.presentCount + l.absentCount);
        byDate[d].present += l.presentCount;
      });
      const trend = Object.entries(byDate)
        .slice(0, 8)
        .map(([date, v]) => ({ date: date.slice(5), percentage: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 }))
        .reverse();
      setLiveAttendanceTrend(trend);
    });

    return () => {
      unsubSettings();
      unsubBatches();
      unsubLowCands();
      unsubLogs();
    };
  }, [profile, selectedBatch, attendanceDate, liveBatches.length]);

  const handleSendAlert = (name: string) => {
    showToast(`Governance Alert sent to ${name} and their parents via SMS.`, 'success');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      return showToast("Please use .csv format only.", 'error');
    }

    if (!selectedBatch) {
      return showToast("Please select a batch first", 'error');
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      const dataRows = rows.slice(1);
      
      const parsed = dataRows.map((row, index) => {
        const columns = row.split(',').map(s => s.trim().replace(/^["']|["']$/g, ""));
        if (columns.length >= 3) {
          const [name, email, status] = columns;
          return { 
            id: `temp-${index}`, 
            name: name.trim(), 
            email: email.trim().toLowerCase(), 
            status: status.toUpperCase() === 'PRESENT' ? 'PRESENT' : 'ABSENT' 
          };
        }
        return null;
      }).filter(Boolean);

      if (parsed.length > 0) {
        setParsedAttendance(parsed);
        setShowPreviewModal(true);
      } else {
        showToast("No valid records found in CSV", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleBulkAttendance = async () => {
    setIsBulkSaving(true);
    showToast("Processing bulk attendance...", "success");

    const present = parsedAttendance.filter(s => s.status === 'PRESENT').length;
    const absent = parsedAttendance.length - present;

    try {
      const now = new Date();
      // Fetch Real Cutoff from Settings
      const settingsSnap = await getDoc(doc(db, "settings", "governance"));
      const settings = settingsSnap.exists() ? settingsSnap.data() : { attendanceCutoff: "10:00" };
      const [cutoffHour, cutoffMin] = settings.attendanceCutoff.split(":").map(Number);
      const isLate = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() > cutoffMin);

      // 1. LOG THE ATTENDANCE SESSION
      await addDoc(collection(db, "attendance_logs"), {
        batch: selectedBatch,
        date: attendanceDate,
        uploadedBy: profile?.name || "Trainer",
        status: isLate ? "Late Submission" : "On-Time",
        presentCount: present,
        absentCount: absent,
        createdAt: now.toISOString()
      });

      // 2. UPDATE INDIVIDUAL CANDIDATE STATS
      let updatedCount = 0;
      for (const record of parsedAttendance) {
        const q = query(collection(db, "candidates"), where("email", "==", record.email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const candDoc = snap.docs[0];
          const data = candDoc.data();
          const prevPresent = data.presentSessions || 0;
          const prevTotal = data.totalSessions || 0;
          
          const newPresent = record.status === 'PRESENT' ? prevPresent + 1 : prevPresent;
          const newTotal = prevTotal + 1;
          const newPercentage = Math.round((newPresent / newTotal) * 100);
          
          // Dynamic Risk Calculation based on Settings
          const riskThreshold = settings.attendanceRiskThreshold || 75;
          let newRisk = "LOW";
          if (newPercentage < (riskThreshold - 15)) newRisk = "HIGH";
          else if (newPercentage < riskThreshold) newRisk = "MEDIUM";

          await updateDoc(doc(db, "candidates", candDoc.id), {
            presentSessions: newPresent,
            totalSessions: newTotal,
            attendance: newPercentage,
            risk: newRisk,
            status: newPercentage < 60 ? "AT RISK" : "ACTIVE"
          });
          updatedCount++;
        }
      }

      if (isLate) {
        await triggerSystemAlert({
          title: "Late Attendance Submission",
          description: `Trainer ${profile?.name || "Trainer"} submitted bulk attendance for ${selectedBatch} after the ${cutoffTime} cutoff.`,
          severity: "Medium"
        });
      }

      showToast(`Batch saved! Updated ${updatedCount} out of ${parsedAttendance.length} students.`);
      setShowPreviewModal(false);
      setParsedAttendance([]);
    } catch (err) {
      console.error(err);
      showToast("Error processing bulk data", "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleManualEntryStart = async () => {
    setIsSaving(true);
    try {
      const q = query(collection(db, "candidates"), where("batch", "==", selectedBatch));
      const snap = await getDocs(q);
      const students = snap.docs.map(d => ({ id: d.id, name: d.data().name, present: true }));
      
      if (students.length === 0) {
        showToast("No candidates found in this batch.", "error");
        setManualStudents([]);
      } else {
        setManualStudents(students);
      }
      
      setShowManualModal(students.length > 0);
    } catch (error) {
      showToast("Error loading students", 'error');
    }
    setIsSaving(false);
  };

  const handleFinalizeAttendance = async () => {
    setIsSaving(true);
    const presentCount = manualStudents.filter(s => s.present).length;
    const absentCount = manualStudents.length - presentCount;

    try {
      // 1. LOG THE ATTENDANCE SESSION
      await addDoc(collection(db, "attendance_logs"), {
        batch: selectedBatch,
        date: attendanceDate,
        uploadedBy: profile?.name || "Trainer",
        presentCount: presentCount,
        absentCount: absentCount,
        mode: "Manual",
        createdAt: new Date().toISOString()
      });

      // 2. UPDATE INDIVIDUAL CANDIDATE STATS
      const updatePromises = manualStudents.map(async (student) => {
        const candRef = doc(db, "candidates", student.id);
        const candSnap = await getDoc(candRef);
        
        if (candSnap.exists()) {
          const data = candSnap.data();
          const prevPresent = data.presentSessions || 0;
          const prevTotal = data.totalSessions || 0;
          
          const newPresent = student.present ? prevPresent + 1 : prevPresent;
          const newTotal = prevTotal + 1;
          const newPercentage = Math.round((newPresent / newTotal) * 100);
          
          let newRisk = "LOW";
          if (newPercentage < 60) newRisk = "HIGH";
          else if (newPercentage < 75) newRisk = "MEDIUM";

          await updateDoc(candRef, {
            presentSessions: newPresent,
            totalSessions: newTotal,
            attendance: newPercentage,
            risk: newRisk,
            status: newPercentage < 60 ? "AT RISK" : "ACTIVE"
          });
        }
      });
      await Promise.all(updatePromises);

      // TRIGGER SYSTEM ALERT: High Absenteeism
      if (absentCount > 5) {
        await triggerSystemAlert({
          title: "Critical Absenteeism Spike",
          description: `${absentCount} students marked absent in Batch ${selectedBatch} for ${attendanceDate}.`,
          severity: "Critical"
        });
      }

      setStats({ present: presentCount, absent: absentCount, rate: Math.round((presentCount/manualStudents.length)*100) });
      setShowManualModal(false);
      showToast("Attendance finalized & stats updated!");
    } catch (error) {
      console.error(error);
      showToast("Error saving attendance", 'error');
    }
    setIsSaving(false);
  };

  const today = { 
    date: attendanceDate, 
    present: stats.present, 
    absent: stats.absent, 
    percentage: stats.rate, 
    cutoffMet: true 
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header title="Attendance Management" subtitle="Daily attendance tracking with cutoff enforcement" />
      
      {toast && (
        <div className={`fixed top-6 right-6 z-[10001] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <div className="p-8 space-y-6 fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="glass-card p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Today's Attendance Summary</p>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                {today.date}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-3 rounded-xl bg-green-500/5">
                <p className="text-2xl font-bold text-[#10b981]">{today.present}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Present</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-red-500/5">
                <p className="text-2xl font-bold text-[#ef4444]">{today.absent}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Absent</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-2xl font-bold text-teal-400">{today.percentage}%</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Rate</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", today.cutoffMet ? "bg-green-500/10 text-[#10b981]" : "bg-red-500/10 text-[#ef4444]")}>
              {today.cutoffMet ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Cutoff: {cutoffTime}</p>
              <p className="text-[10px] mt-1 font-bold uppercase tracking-wider" style={{ color: today.cutoffMet ? "#10b981" : "#ef4444" }}>
                {today.cutoffMet ? "Submitted on time" : "MISSED — Alert Triggered"}
              </p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#f59e0b] flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">3-Day Absentees</p>
              <p className="text-[10px] mt-1 text-amber-500 font-bold uppercase tracking-wider">{lowAttendanceList.length} candidates flagged</p>
            </div>
          </div>
        </div>

        {profile?.role === "Trainer" && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-base font-bold text-white">Upload Attendance</p>
                <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">Sync records from CSV or manual entry</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Clock size={12} />
                <span>Cutoff: {cutoffTime} daily</span>
              </div>
            </div>
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
              <div className="flex-1 flex items-center gap-4">
                <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="bg-[#0B1221]/70 border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-zinc-300 outline-none focus:border-teal-500 min-w-[200px]">
                  {liveBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="bg-[#0B1221]/70 border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-zinc-300 outline-none focus:border-teal-500" />
              </div>
              <div className="flex gap-3">
              <input type="file" id="attnUpload" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
              <button onClick={() => document.getElementById('attnUpload')?.click()} disabled={isSaving} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-black/20 transition-all hover:scale-[1.02]" style={{ background: "#3B82F6" }}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload CSV
                </button>
                <button 
                  onClick={handleManualEntryStart}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 border border-white/[0.08] hover:bg-white/[0.02] transition-all">
                  Manual Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowPreviewModal(false)} />
            <div className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Review Attendance CSV</h3>
                  <p className="text-xs text-teal-400 font-medium mt-1">Batch: {selectedBatch} • {attendanceDate}</p>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-3 px-2">Student Name</th>
                      <th className="pb-3 px-2">Email</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {parsedAttendance.map((s) => (
                      <tr key={s.id} className="border-b border-white/[0.03] group hover:bg-white/[0.02]">
                        <td className="py-4 px-2 text-white font-medium">{s.name}</td>
                        <td className="py-4 px-2 text-zinc-400">{s.email}</td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            s.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button 
                            onClick={() => setParsedAttendance(prev => prev.filter(p => p.id !== s.id))}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 bg-[#0c0c0e] border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Present: <span className="text-emerald-400">{parsedAttendance.filter(s=>s.status==='PRESENT').length}</span>
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Absent: <span className="text-rose-400">{parsedAttendance.filter(s=>s.status==='ABSENT').length}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPreviewModal(false)}
                    className="px-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleBulkAttendance}
                    disabled={isBulkSaving}
                    className="px-8 py-3.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-xl shadow-black/20 flex items-center gap-2"
                  >
                    {isBulkSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Finalize Bulk Attendance</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Modal */}
        {showManualModal && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowManualModal(false)} />
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Manual Attendance</h3>
                  <p className="text-xs text-teal-400 font-medium mt-1">{selectedBatch} • {attendanceDate}</p>
                </div>
                <button onClick={() => setShowManualModal(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-8 space-y-3 custom-scrollbar">
                {manualStudents.map((s, idx) => (
                  <div 
                    key={s.id} 
                    onClick={() => {
                      const newS = [...manualStudents];
                      newS[idx].present = !newS[idx].present;
                      setManualStudents(newS);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      s.present ? 'bg-teal-500/10 border-white/[0.08]' : 'bg-zinc-800/20 border-white/5 opacity-60'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${s.present ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                        {s.name.split(" ").map((n:any)=>n[0]).join("")}
                      </div>
                      <span className={`text-sm font-bold ${s.present ? 'text-white' : 'text-zinc-500'}`}>{s.name}</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-all ${s.present ? 'bg-teal-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${s.present ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-[#0c0c0e] border-t border-white/5 flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Present: <span className="text-emerald-400">{manualStudents.filter(s=>s.present).length}</span> / {manualStudents.length}
                </div>
                <button 
                  onClick={handleFinalizeAttendance}
                  disabled={isSaving}
                  className="px-8 py-3.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-xl shadow-black/20 flex items-center gap-2">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                  Finalize Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <p className="text-base font-bold text-white mb-1">Attendance Trend (Last 8 Days)</p>
          <p className="text-xs mb-5" style={{ color: "#5271A3" }}>{selectedBatch || "All Batches"} — Last 8 logged sessions</p>
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart data={liveAttendanceTrend.length > 0 ? liveAttendanceTrend : []}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20, 184, 166,0.1)" />
              <XAxis dataKey="date" tick={{ fill: "#5271A3", fontSize: 11 }} />
              <YAxis tick={{ fill: "#5271A3", fontSize: 11 }} domain={[70, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="percentage" stroke="#3B82F6" strokeWidth={2.5}
                fill="url(#attGrad)" name="percentage" dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Flagged candidates */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-white">Candidates Below 60% Attendance</h4>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1">Automatic alert triggers for high-risk students</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest">{lowAttendanceList.length} Students</span>
          </div>
          <div className="space-y-4">
            {lowAttendanceList.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-white/5 hover:border-rose-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                    {c.name.split(" ").map((n:any)=>n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{c.batch || c.batchName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-500">{c.attendance}%</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Attendance</p>
                  </div>
                  <button 
                    onClick={() => handleSendAlert(c.name)}
                    className="px-4 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20">
                    Send Alert
                  </button>
                </div>
              </div>
            ))}
            {lowAttendanceList.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500">No high-risk candidates found. Great job!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




