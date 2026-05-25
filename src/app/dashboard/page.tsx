"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import {
  Users, Layers, AlertTriangle, ArrowUpRight, CheckCircle, ShieldAlert
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, limit, orderBy, onSnapshot, getDocs, getDoc, doc, setDoc, where } from "firebase/firestore";

const MetricCard = ({
  label, value, icon: Icon, color, trendVal, trendColor
}: { label: string; value: string | number; icon: React.ElementType; color: string; trendVal: string; trendColor: string }) => (
  <div className="rounded-[16px] p-6 relative overflow-hidden flex flex-col justify-between h-[140px]" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shadow-lg"
        style={{ background: color }}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="text-right">
        <p className="text-[13px] font-medium text-[#82A0CE] mb-1">{label}</p>
        <p className="text-[28px] font-bold text-white leading-none">{value}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-1.5 mt-auto">
      <ArrowUpRight size={14} style={{ color: trendColor }} />
      <span className="text-[12px] font-semibold" style={{ color: trendColor }}>{trendVal}</span>
      <span className="text-[12px] text-[#5271A3]">vs last month</span>
    </div>

    <div className="absolute right-0 bottom-6 w-24 h-8 opacity-60">
      <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
        <path d="M0,20 Q10,25 20,15 T40,10 T60,20 T80,5 T100,10" fill="none" stroke={trendColor} strokeWidth="2" />
      </svg>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-lg text-sm shadow-xl border border-white/10" style={{ background: "#0B1221" }}>
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || "#3B82F6" }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: "0",
    activeBatches: "0",
    totalCandidates: "0",
    alerts: "0"
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [batchData, setBatchData] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);

    // For trainers, we need to first get their batches, then filter candidates
    const setupDataSubscriptions = async () => {
      let trainerBatchNames: Set<string> = new Set();
      
      // If trainer, get their batch names first and WAIT for them
      if (profile.role === "Trainer") {
        const batchQuery = query(collection(db, "batches"), where("trainer", "==", profile.name));
        const batchSnap = await getDocs(batchQuery);
        batchSnap.docs.forEach(doc => {
          trainerBatchNames.add(doc.data().name);
        });
        console.log(`[Dashboard] Trainer ${profile.name} has batches:`, Array.from(trainerBatchNames));
      }

      // 1. Live Stats & Performance - Candidates
      const unsubCands = onSnapshot(collection(db, "candidates"), (snap) => {
        let allCands = snap.docs.map(d => d.data());
        
        // Filter candidates based on role
        if (profile.role === "Trainer") {
          const beforeFilter = allCands.length;
          allCands = allCands.filter(c => trainerBatchNames.has(c.batch));
          console.log(`[Dashboard] Filtered candidates: ${beforeFilter} -> ${allCands.length}`);
        }
        
        setStats(prev => ({ ...prev, totalCandidates: allCands.length.toLocaleString() }));
        
        const perfData = [
          { name: '40-50%', value: allCands.filter(d => (d.avgScore || 0) < 50).length },
          { name: '50-60%', value: allCands.filter(d => (d.avgScore || 0) >= 50 && (d.avgScore || 0) < 60).length },
          { name: '60-70%', value: allCands.filter(d => (d.avgScore || 0) >= 60 && (d.avgScore || 0) < 70).length },
          { name: '70-80%', value: allCands.filter(d => (d.avgScore || 0) >= 70 && (d.avgScore || 0) < 80).length },
          { name: '80-90%', value: allCands.filter(d => (d.avgScore || 0) >= 80 && (d.avgScore || 0) < 90).length },
          { name: '90-100%', value: allCands.filter(d => (d.avgScore || 0) >= 90).length },
        ];
        setPerformanceData(perfData);
      });

      // 2. Live Stats - Batches
      const unsubBatches = onSnapshot(collection(db, "batches"), (snap) => {
        let filteredBatches = snap.docs;
        
        // Filter batches based on role
        if (profile.role === "Trainer") {
          filteredBatches = snap.docs.filter(doc => doc.data().trainer === profile.name);
          console.log(`[Dashboard] Trainer batches count: ${filteredBatches.length}`);
        }
        
        const active = filteredBatches.filter(d => d.data().status === "Running").length;
        setStats(prev => ({ ...prev, activeBatches: active.toString() }));
        
        const batchComparison = filteredBatches.slice(0, 5).map(doc => {
          const data = doc.data();
          return {
            name: data.name?.split('-')[1] || data.name || "Batch",
            value: data.enrolled || 0,
            display: (data.enrolled || 0).toString()
          };
        });
        setBatchData(batchComparison);
      });

      // 3. Alerts
      const unsubAlerts = onSnapshot(collection(db, "system_alerts"), (snap) => {
        const allAlerts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const sorted = allAlerts.sort((a: any, b: any) => {
          const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || a.createdAt || 0).getTime();
          const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || b.createdAt || 0).getTime();
          return timeB - timeA;
        }).slice(0, 5);

        const mapped = sorted.map((data: any) => {
          const severity = (data.severity || "medium").toLowerCase();
          const isHigh = severity === "critical" || severity === "high";
          
          return {
            title: data.title || "System Alert",
            desc: data.message || data.description || "No description available.",
            status: severity.toUpperCase(),
            time: data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            icon: isHigh ? ShieldAlert : AlertTriangle,
            color: isHigh ? "#EF4444" : (severity === "medium" ? "#F59E0B" : "#3B82F6")
          };
        });
        setRecentAlerts(mapped);
        setStats(prev => ({ ...prev, alerts: snap.size.toString() }));
        setLoading(false);
      });

      // 4. Users (Admin only)
      const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setStats(prev => ({ ...prev, totalUsers: snap.size.toLocaleString() }));
      });

      return () => {
        unsubCands();
        unsubBatches();
        unsubAlerts();
        unsubUsers();
      };
    };

    setupDataSubscriptions();
  }, [profile]);

  // Role-based dashboard title
  const getDashboardTitle = () => {
    if (!profile) return "Dashboard";
    switch (profile.role) {
      case "Admin":
        return "Admin Dashboard";
      case "Training Coordinator":
        return "Training Coordinator Dashboard";
      case "Trainer":
        return "Trainer Dashboard";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      <Header title={getDashboardTitle()} />
      
      <div className="p-6 space-y-6 fade-in max-w-[1600px] mx-auto w-full">

        {/* 4 Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Total Users" value={stats.totalUsers} icon={Users} color="#2563EB" trendVal="12.5%" trendColor="#3B82F6" />
          <MetricCard label="Active Batches" value={stats.activeBatches} icon={Layers} color="#10B981" trendVal="5.9%" trendColor="#10B981" />
          <MetricCard label="Total Candidates" value={stats.totalCandidates} icon={Users} color="#8B5CF6" trendVal="8.7%" trendColor="#8B5CF6" />
          <MetricCard label="Alerts" value={stats.alerts} icon={AlertTriangle} color="#F59E0B" trendVal="16.7%" trendColor="#F59E0B" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="rounded-[16px] p-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-white">Performance Trends</h2>
              <select className="bg-[#0B1221] border border-white/10 text-[#82A0CE] text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                <option>Last 7 Days</option>
              </select>
            </div>
            <div className="h-[250px] w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">Analyzing trends...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="value" name="Candidates" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
              <span className="text-[11px] text-[#82A0CE]">Candidate Score Distribution</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="rounded-[16px] p-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-white">Batch Comparison</h2>
              <select className="bg-[#0B1221] border border-white/10 text-[#82A0CE] text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                <option>This Month</option>
              </select>
            </div>
            <div className="h-[250px] w-full relative">
              {loading ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">Loading metrics...</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={batchData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="value" name="Total Candidates" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40}>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 pointer-events-none flex items-end pb-8">
                    {batchData.map((d, i) => (
                      <div key={i} className="flex-1 flex justify-center pb-2">
                        <span className="text-[11px] font-bold text-white relative z-10" 
                          style={{ transform: `translateY(-${Math.min((d.value / Math.max(...batchData.map(v => v.value || 1))) * 190, 190)}px)` }}>
                          {d.display}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
              <span className="text-[11px] text-[#82A0CE]">Total Candidates</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts List */}
        {recentAlerts.length > 0 && (
          <div className="rounded-[16px] p-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-white">Recent Alerts</h2>
              <button className="text-[12px] font-medium text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors">
                View All Alerts &rarr;
              </button>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
                ))
              ) : (
                recentAlerts.map((alert, idx) => {
                  const Icon = alert.icon;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]" style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(11, 18, 33, 0.4)" }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${alert.color}15` }}>
                        <Icon size={20} style={{ color: alert.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white mb-0.5">{alert.title}</p>
                        <p className="text-[12px] text-[#82A0CE]">{alert.desc}</p>
                      </div>
                      <div className="flex items-center gap-6 mt-2 sm:mt-0">
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium border" 
                          style={{ 
                            color: alert.color, 
                            borderColor: `${alert.color}40`,
                            background: `${alert.color}10`
                          }}>
                          {alert.status}
                        </span>
                        <span className="text-[12px] text-[#5271A3] w-16 text-right">{alert.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
