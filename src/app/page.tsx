"use client";
import Header from "@/components/Header";
import {
  Users, Layers, ClipboardCheck, TrendingUp, AlertTriangle,
  TrendingDown, ArrowUpRight, Activity, Sparkles, Shield
} from "lucide-react";
import { collection, getDocs, query, doc, setDoc } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const MetricCard = ({
  label, value, sub, icon: Icon, color, trend
}: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string; trend?: number }) => (
  <div className="glass-card p-6 metric-card fade-in">
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: `${color}22` }}>
        <Icon size={22} style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
          style={{ background: trend >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: trend >= 0 ? "#10b981" : "#ef4444" }}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm font-medium text-white mb-1">{label}</p>
    <p className="text-xs" style={{ color: "#52525b" }}>{sub}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [settingUp, setSettingUp] = useState(false);
  const [liveStats, setLiveStats] = useState({
    totalCands: 0,
    highRisk: 0,
    activeBatches: 0,
    avgAttendance: 0,
  });
  const [liveCands, setLiveCands] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const candSnap = await getDocs(collection(db, "candidates"));
        const cands = candSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        const batchSnap = await getDocs(collection(db, "batches"));
        const batchesList = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        const hr = cands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH").length;
        const ab = batchesList.filter(b => b.status === "Running" || b.status === "ACTIVE").length;
        const avgAtt = cands.length > 0
          ? Math.round(cands.reduce((s, c) => s + (c.attendance || 0), 0) / cands.length)
          : 0;

        // Build chart data from real batch data
        const chart = batchesList.map(b => ({
          name: (b.name || "").split(" ").slice(0, 2).join(" "),
          attendance: b.avgAttendance || 0,
          score: b.avgScore || 0,
        }));

        setLiveStats({ totalCands: cands.length, highRisk: hr, activeBatches: ab, avgAttendance: avgAtt });
        setLiveCands(cands);
        setLiveBatches(batchesList);
        setChartData(chart);
      } catch (e) { console.error(e); }
    };
    fetchLiveData();
  }, []);

  const setupProfile = async (role: "Admin" | "Training Coordinator" | "Trainer") => {
    if (!user) return;
    setSettingUp(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split("@")[0] || "New User",
        role: role
      });
      window.location.reload();
    } catch (err) {
      console.error("Setup error:", err);
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Dashboard" subtitle="Live talent execution overview — powered by Firebase" />
      <div className="p-8 space-y-6 fade-in">

        {/* Setup Assistant */}
        {user && !profile && (
          <div className="glass-card p-6 border-white/[0.1] bg-teal-500/10 mb-8 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-black/20">
                  <Sparkles className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Initialize Your Profile</h3>
                  <p className="text-zinc-400 text-sm">Choose your role to activate your Maverick account.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {(["Admin", "Training Coordinator", "Trainer"] as const).map(role => (
                  <button key={role} onClick={() => setupProfile(role)} disabled={settingUp}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-teal-500 transition-all shadow-lg shadow-black/20">
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Metrics - All live from DB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Active Batches" value={liveStats.activeBatches} sub="Across all domains" icon={Layers} color="#14b8a6" />
          <MetricCard label="Total Candidates" value={liveStats.totalCands} sub="All enrollees in database" icon={Users} color="#2dd4bf" />
          <MetricCard label="High Risk" value={liveStats.highRisk} sub="Requires immediate intervention" icon={AlertTriangle} color="#ef4444" />
          <MetricCard label="Avg Attendance" value={`${liveStats.avgAttendance}%`} sub="Across all candidates" icon={ClipboardCheck} color="#10b981" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Live Batch Performance Chart */}
          <div className="xl:col-span-3 glass-card p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-base font-bold text-white">Batch Performance Overview</p>
                <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-wider italic">Live attendance vs score per batch</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Attendance</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2dd4bf]" /><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Score</span></div>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(20, 184, 166,0.04)" }} />
                  <Bar dataKey="attendance" name="attendance" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="score" name="score" fill="#2dd4bf" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Add batches to see performance chart</p>
              </div>
            )}
          </div>

          {/* Top Performers - Live from DB */}
          <div className="xl:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Top Performers</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Ranked by live assessment scores</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Sparkles className="text-amber-500" size={20} />
              </div>
            </div>
            <div className="space-y-4">
              {liveCands.length === 0 ? (
                <p className="text-center text-zinc-600 text-xs font-bold uppercase tracking-widest py-8 italic">No candidates in database yet</p>
              ) : (
                [...liveCands].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:border-white/[0.1] transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                        i === 0 ? "bg-amber-500 text-amber-950" : "bg-zinc-700 text-zinc-300")}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">{c.name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{c.batch || c.batchName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-teal-400">{c.avgScore || 0}%</p>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Avg Score</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Active Batches - Live from DB */}
          <div className="xl:col-span-3 glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Active Batches</h2>
              <Link href="/batches" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.06)", color: "#5eead4" }}>View All</Link>
            </div>
            <div className="space-y-3">
              {liveBatches.filter(b => b.status === "Running" || b.status === "ACTIVE").length === 0 ? (
                <div className="py-10 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest italic border border-dashed border-white/5 rounded-2xl">
                  No active batches yet — create one in Batch Management
                </div>
              ) : (
                liveBatches.filter(b => b.status === "Running" || b.status === "ACTIVE").map(b => (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 rounded-xl table-row-hover">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{b.trainer}</p>
                    </div>
                    <div className="flex items-center gap-6 sm:text-right">
                      <div className="sm:text-right">
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#52525b" }}>Attendance</p>
                        <p className="text-sm font-bold" style={{ color: (b.avgAttendance || 0) < 70 ? "#ef4444" : (b.avgAttendance || 0) < 80 ? "#f59e0b" : "#10b981" }}>
                          {b.avgAttendance || 0}%</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#52525b" }}>Avg Score</p>
                        <p className="text-sm font-bold" style={{ color: (b.avgScore || 0) < 60 ? "#ef4444" : "#5eead4" }}>{b.avgScore || 0}%</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Governance Badge */}
          <div className="xl:col-span-2 glass-card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-teal-600/5 to-teal-700/5 border-white/[0.06]">
            <div className="w-16 h-16 rounded-2xl bg-teal-600/10 border border-white/[0.08] flex items-center justify-center mb-4">
              <Shield className="text-teal-400" size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Governance Active</h3>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">Maverick is connected to your live Firebase database. All data is real and audited.</p>
            <Link href="/audit" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-white/[0.08] text-teal-400 hover:bg-teal-500/10 transition-all">
              View Audit Trail →
            </Link>
          </div>
        </div>

        {/* High Risk Candidates - Live from DB */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">High-Risk Candidates</h2>
              <p className="text-xs mt-1" style={{ color: "#52525b" }}>Candidates requiring immediate intervention — live from database</p>
            </div>
            <Link href="/candidates" className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", color: "#5eead4" }}>View All</Link>
          </div>
          {liveCands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH").length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-emerald-400 font-bold text-sm">✓ No High-Risk Candidates Detected</p>
              <p className="text-zinc-600 text-xs mt-1 uppercase tracking-widest">Platform governance is optimal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(20, 184, 166,0.1)" }}>
                    {["Candidate", "Batch", "Attendance", "Avg Score", "Status", "Risk"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveCands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH").map(c => (
                    <tr key={c.id} className="table-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#ef4444,#f87171)" }}>
                            {c.name?.split(" ").map((n: any) => n[0]).join("")}
                          </div>
                          <span className="font-medium text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs" style={{ color: "#71717a" }}>{c.batch || c.batchName}</td>
                      <td className="py-3 px-3"><span className="font-bold" style={{ color: (c.attendance || 0) < 60 ? "#ef4444" : "#f59e0b" }}>{c.attendance || 0}%</span></td>
                      <td className="py-3 px-3"><span className="font-bold" style={{ color: (c.avgScore || 0) < 50 ? "#ef4444" : "#f59e0b" }}>{c.avgScore || 0}%</span></td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-700 text-zinc-300">{c.status || "ACTIVE"}</span></td>
                      <td className="py-3 px-3"><span className="badge-high px-2 py-0.5 rounded-md text-xs font-bold">HIGH</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




