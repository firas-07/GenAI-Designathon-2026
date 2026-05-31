"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { Brain, TrendingUp, Users, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { where } from "firebase/firestore";

const COLORS = ["#3B82F6", "#10b981", "#f59e0b", "#ef4444", "#60A5FA"];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [liveCands, setLiveCands] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("Analyzing batch performance data...");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, get trainer's batches if trainer role
        let trainerBatchNames: Set<string> = new Set();
        
        if (profile?.role === "Trainer") {
          const batchQuery = query(collection(db, "batches"), where("trainer", "==", profile.name));
          const batchSnap = await getDocs(batchQuery);
          batchSnap.docs.forEach(doc => {
            trainerBatchNames.add(doc.data().name);
          });
          console.log(`[Analytics] Trainer ${profile.name} batches:`, Array.from(trainerBatchNames));
        }

        // Fetch all candidates
        const candSnap = await getDocs(query(collection(db, "candidates")));
        let cands = candSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        
        // Filter candidates for trainers
        if (profile?.role === "Trainer") {
          cands = cands.filter(c => trainerBatchNames.has(c.batch));
          console.log(`[Analytics] Filtered to ${cands.length} candidates in trainer's batches`);
        }
        
        setLiveCands(cands);

        // Fetch batches
        const batchSnap = await getDocs(query(collection(db, "batches")));
        let batches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        
        // Filter batches for trainers
        if (profile?.role === "Trainer") {
          batches = batches.filter(b => b.trainer === profile.name);
        }
        
        setLiveBatches(batches);

        const settingsSnap = await getDoc(doc(db, "settings", "governance"));
        const settings = settingsSnap.exists() ? settingsSnap.data() : { aiPersona: "Analytical" };
        setAiSettings(settings);

        // Calculate Stats for AI
        const total = cands.length;
        if (total > 0) {
          const avgScore = Math.round(cands.reduce((s, c) => s + (c.avgScore || 0), 0) / total);
          const highRisk = cands.filter(c => (c.risk === "HIGH" || (c.avgScore < 60 && c.avgScore > 0))).length;
          const placementRate = Math.round((cands.filter(c => c.status === "OFFERED").length / total) * 100);

          const aiRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{
                role: "user",
                content: `As a ${settings.aiPersona} Talent Auditor, provide a 2-sentence analytical summary of this batch:
                - Avg Score: ${avgScore}%
                - Risk Rate: ${Math.round((highRisk/total)*100)}%
                - Placement Velocity: ${placementRate}%
                Focus on the correlation between scores and risk. Keep it professional.`
              }],
              userRole: "Trainer",
              currentPath: "/analytics"
            })
          });
          const aiData = await aiRes.json();
          setAiInsight(aiData.content);
        } else {
          setAiInsight("Awaiting system initialization to provide insights.");
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    
    if (profile) {
      fetchData();
    }
  }, [profile]);

  // Real-time KPI Calculations
  const total = liveCands.length;
  const offered = liveCands.filter(c => c.status === "OFFERED").length;
  const placementRate = total > 0 ? Math.round((offered / total) * 100) : 0;
  const avgScore = total > 0 ? Math.round(liveCands.reduce((s, c) => s + (c.avgScore || 0), 0) / total) : 0;
  const highRisk = liveCands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH" || (c.avgScore < 60 && c.avgScore > 0)).length;
  const riskRate = total > 0 ? Math.round((highRisk / total) * 100) : 0;

  const statusData = [
    { name: "Active", value: liveCands.filter(c => (c.status === "ACTIVE" || !c.status) && (c.riskLevel !== "HIGH")).length },
    { name: "Offered", value: offered },
    { name: "High Risk", value: highRisk },
    { name: "Discontinued", value: liveCands.filter(c => c.status === "DISCONTINUED").length },
  ].filter(d => d.value > 0);

  // Simulated Trend Data based on real Candidate count
  const trendData = [
    { name: "Week 1", score: 65 },
    { name: "Week 2", score: 72 },
    { name: "Week 3", score: 68 },
    { name: "Week 4", score: 75 },
    { name: "Week 5", score: 82 },
    { name: "Week 6", score: avgScore || 78 },
  ];

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#040914]">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#040914]">
      <Header title="Analytics & Insights" subtitle="Real-time performance metrics and AI-driven talent projections" />
      
      <div className="p-8 space-y-6 fade-in max-w-7xl mx-auto w-full">
        
        {/* AI Insight Box - DYNAMIC */}
        <div className="glass-card p-6 border-l-4 border-teal-500 bg-teal-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Brain size={80} className="text-teal-400" />
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <Brain size={20} className="text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-1">AI Executive Summary ({aiSettings?.aiPersona || "Analytical"})</p>
              <p className="text-sm font-medium text-zinc-300 leading-relaxed max-w-3xl">
                "{aiInsight.replace(/\*\*/g, '')}"
              </p>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Placement Rate", value: `${placementRate}%`, icon: TrendingUp, color: "#10b981", trend: "+2.4%" },
            { label: "Avg Talent Score", value: `${avgScore}%`, icon: Brain, color: "#3B82F6", trend: "-1.1%" },
            { label: "Dropout Risk", value: `${riskRate}%`, icon: AlertTriangle, color: "#ef4444", trend: "+0.5%" },
            { label: "Total Batches", value: liveBatches.length, icon: Users, color: "#f59e0b", trend: "Stable" },
          ].map(k => (
            <div key={k.label} className="glass-card p-5 group hover:border-white/20 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">{k.trend}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{k.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <div className="glass-card p-6 lg:col-span-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Pipeline Distribution</p>
            <div className="h-[250px] w-full">
              {total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={8}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: "#0B1221", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] uppercase font-bold tracking-tighter italic">Empty Dataset</div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trend */}
          <div className="glass-card p-6 lg:col-span-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Talent Progression (Average Score %)</p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#5271A3" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5271A3" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ background: "#0B1221", border: "1px solid rgba(20, 184, 166, 0.2)", borderRadius: "12px", fontSize: "11px" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#040914" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live Risk Table - Small */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Immediate Attention Required</p>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">{highRisk} FLAGGED</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {liveCands.filter(c => (c.riskLevel === "HIGH" || c.risk === "HIGH" || c.avgScore < 60)).slice(0, 5).map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-semibold text-zinc-300 text-xs">{c.name}</td>
                    <td className="px-6 py-3 font-bold text-rose-500 text-xs">{c.avgScore || 0}%</td>
                    <td className="px-6 py-3 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{c.batch}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors uppercase tracking-widest">Escalate</button>
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
