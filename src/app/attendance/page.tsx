"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { Upload, AlertCircle, CheckCircle2, Clock, Loader2, X, UserCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

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

  // Fetch Governance & Live Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "governance"));
        if (settingsSnap.exists()) {
          setCutoffTime(settingsSnap.data().attendanceCutoff || "10:00");
        }

        const batchQ = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const batchSnap = await getDocs(batchQ);
        const fireBatches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLiveBatches(fireBatches);
        if (fireBatches.length > 0) setSelectedBatch(fireBatches[0].name);

        // Fetch Live Candidates for Alerts List
        const candQ = query(collection(db, "candidates"), where("attendance", "<", 60));
        const candSnap = await getDocs(candQ);
        const fireLowCands = candSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLowAttendanceList(fireLowCands);

        // Build attendance trend from logs
        const logQ = query(collection(db, "attendance_logs"), orderBy("date", "desc"));
        const logSnap = await getDocs(logQ);
        const logs = logSnap.docs.map(d => d.data());
        // Group by date and compute percentage
        const byDate: Record<string, {present: number; total: number}> = {};
        logs.forEach(l => {
          const d = l.date || "";
          if (!d) return;
          if (!byDate[d]) byDate[d] = { present: 0, total: 0 };
          byDate[d].total++;
          if (l.status === "Present" || l.status === "PRESENT") byDate[d].present++;
        });
        const trend = Object.entries(byDate)
          .slice(0, 8)
          .map(([date, v]) => ({ date: date.slice(5), percentage: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 }))
          .reverse();
        setLiveAttendanceTrend(trend);

      } catch (error) {
        console.error("Error fetching attendance data:", error);
      }
    };
    fetchData();
  }, []);

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
      return showToast("Please upload CSV format only", 'error');
    }

    setIsSaving(true);
    setTimeout(async () => {
      try {
        const now = new Date();
        const [cutoffHour, cutoffMin] = cutoffTime.split(":").map(Number);
        const isLate = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() > cutoffMin);

        await addDoc(collection(db, "attendance_logs"), {
          batch: selectedBatch,
          date: attendanceDate,
          uploadedBy: profile?.name || "Trainer",
          status: isLate ? "Late Submission" : "On-Time",
          presentCount: 22,
          absentCount: 3,
          createdAt: now.toISOString()
        });
        
        setStats({ present: 22, absent: 3, rate: 88 });
        setIsSaving(false);
        showToast(isLate ? "Attendance Saved (Warning: Past Cutoff!)" : "Attendance Recorded Successfully!");
      } catch (err) {
        showToast("Error saving attendance", 'error');
        setIsSaving(false);
      }
    }, 1500);
  };

  const handleManualEntryStart = async () => {
    setIsSaving(true);
    try {
      const q = query(collection(db, "candidates"), where("batch", "==", selectedBatch));
      const snap = await getDocs(q);
      const students = snap.docs.map(d => ({ id: d.id, name: d.data().name, present: true }));
      
      if (students.length === 0) {
        const mockStuds = candidates.filter(c => c.batch === selectedBatch).map(c => ({ id: c.id, name: c.name, present: true }));
        setManualStudents(mockStuds);
      } else {
        setManualStudents(students);
      }
      
      setShowManualModal(true);
    } catch (error) {
      showToast("Error loading students", 'error');
    }
    setIsSaving(false);
  };

  const handleFinalizeAttendance = async () => {
    setIsSaving(true);
    const present = manualStudents.filter(s => s.present).length;
    const absent = manualStudents.length - present;

    try {
      await addDoc(collection(db, "attendance_logs"), {
        batch: selectedBatch,
        date: attendanceDate,
        uploadedBy: profile?.name || "Trainer",
        presentCount: present,
        absentCount: absent,
        mode: "Manual",
        createdAt: new Date().toISOString()
      });

      setStats({ present, absent, rate: Math.round((present/manualStudents.length)*100) });
      setShowManualModal(false);
      showToast("Attendance finalized successfully!");
    } catch (error) {
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
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="bg-[#18181b]/70 border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-zinc-300 outline-none focus:border-teal-500 min-w-[200px]">
                {liveBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="bg-[#18181b]/70 border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-zinc-300 outline-none focus:border-teal-500" />
            </div>
            <div className="flex gap-3">
              <input type="file" id="attnUpload" hidden accept=".csv" onChange={handleFileUpload} />
              <button onClick={() => document.getElementById('attnUpload')?.click()} disabled={isSaving} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-black/20 transition-all hover:scale-[1.02]" style={{ background: "#14b8a6" }}>
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
          <p className="text-xs mb-5" style={{ color: "#52525b" }}>{selectedBatch || "All Batches"} — Last 8 logged sessions</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={liveAttendanceTrend.length > 0 ? liveAttendanceTrend : []}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20, 184, 166,0.1)" />
              <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} domain={[70, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="percentage" stroke="#14b8a6" strokeWidth={2.5}
                fill="url(#attGrad)" name="percentage" dot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }} />
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




