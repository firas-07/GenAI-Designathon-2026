"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#3B82F6", "#10b981", "#f59e0b", "#ef4444", "#60A5FA"];

export default function AnalyticsPage() {
  const [liveCands, setLiveCands] = useState<any[]>([]);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const candSnap = await getDocs(query(collection(db, "candidates")));
        const cands = candSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLiveCands(cands);

        const batchSnap = await getDocs(query(collection(db, "batches")));
        const batches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLiveBatches(batches);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Calculate Real KPIs
  const total = liveCands.length;
  const offered = liveCands.filter(c => c.status === "OFFERED").length;
  const placementRate = total > 0 ? Math.round((offered / total) * 100) : 0;
  const avgScore = total > 0 ? Math.round(liveCands.reduce((s, c) => s + (c.avgScore || 0), 0) / total) : 0;
  const highRisk = liveCands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH").length;
  const riskRate = total > 0 ? Math.round((highRisk / total) * 100) : 0;

  const statusData = [
    { name: "Active", value: liveCands.filter(c => c.status === "ACTIVE" || !c.status).length },
    { name: "Offered", value: offered },
    { name: "High Risk", value: highRisk },
    { name: "Discontinued", value: liveCands.filter(c => c.status === "DISCONTINUED").length },
  ].filter(d => d.value > 0);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Analytics & Insights" subtitle="Real-time performance metrics derived from production database" />
      <div className="p-8 space-y-6 fade-in">

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Placement Rate", value: `${placementRate}%`, sub: `${offered} candidates placed`, color: "#10b981" },
            { label: "Avg Talent Score", value: `${avgScore}%`, sub: "Global aggregate", color: "#3B82F6" },
            { label: "Dropout Risk", value: `${riskRate}%`, sub: `${highRisk} candidates flagged`, color: "#ef4444" },
            { label: "Total Batches", value: liveBatches.length, sub: "Active tracking", color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} className="glass-card p-5 metric-card">
              <p className="text-2xl font-bold mb-1" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{k.label}</p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: "#5271A3" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="glass-card p-6">
            <p className="text-base font-bold text-white mb-5 uppercase tracking-wider text-xs">Talent Pipeline Distribution</p>
            <div className="h-[250px] w-full">
              {liveCands.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={5}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#040914", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-widest italic">
                  Awaiting database population...
                </div>
              )}
            </div>
          </div>

          {/* Risk Matrix Table */}
          <div className="glass-card p-6">
            <p className="text-base font-bold text-white mb-5 uppercase tracking-wider text-xs">Live Risk Matrix</p>
            <div className="overflow-y-auto max-h-[250px] custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <th className="text-left py-2">Candidate</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {liveCands.slice(0, 10).map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 text-xs font-semibold text-white">{c.name}</td>
                      <td className="py-3 text-xs text-teal-400 font-bold">{c.avgScore || 0}%</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                          (c.riskLevel || c.risk) === "HIGH" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {c.riskLevel || c.risk || "LOW"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {liveCands.length === 0 && (
                    <tr><td colSpan={3} className="py-10 text-center text-zinc-500 italic text-xs">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Performance Trend Placeholder */}
        <div className="glass-card p-6 flex items-center justify-center h-[200px] border-dashed border-white/[0.06]">
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Global Talent Progression</p>
            <p className="text-[10px] text-zinc-600 mt-2 italic">Detailed longitudinal trends will appear once 2+ assessment modules are completed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}




