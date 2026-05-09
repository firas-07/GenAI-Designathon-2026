"use client";
import Header from "@/components/Header";
import {
  Users, Layers, AlertTriangle, ArrowUpRight, CheckCircle, ShieldAlert
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { useAuth } from "@/context/AuthContext";

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

    {/* Sparkline approximation in the background */}
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

  // Mock data for charts matching the image
  const performanceData = [
    { name: 'May 12', value: 600 },
    { name: 'May 13', value: 800 },
    { name: 'May 14', value: 650 },
    { name: 'May 15', value: 900 },
    { name: 'May 16', value: 1100 },
    { name: 'May 17', value: 950 },
    { name: 'May 18', value: 1150 }
  ];

  const batchData = [
    { name: 'Batch A', value: 2100, display: "2.1K" },
    { name: 'Batch B', value: 1700, display: "1.7K" },
    { name: 'Batch C', value: 2400, display: "2.4K" },
    { name: 'Batch D', value: 1200, display: "1.2K" },
    { name: 'Batch E', value: 1800, display: "1.8K" }
  ];

  const recentAlerts = [
    { 
      title: "High failure rate detected in Batch C", 
      desc: "Failure rate is 24% which is higher than the threshold of 15%.",
      status: "High", time: "10m ago", icon: AlertTriangle, color: "#F59E0B"
    },
    { 
      title: "System response time is high", 
      desc: "Average response time is 2.8s which exceeds the threshold.",
      status: "Critical", time: "25m ago", icon: ShieldAlert, color: "#EF4444"
    },
    { 
      title: "Low candidate engagement in Batch D", 
      desc: "Engagement rate is 18% which is lower than expected.",
      status: "Medium", time: "1h ago", icon: AlertTriangle, color: "#F59E0B"
    }
  ];

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      {/* Header from the image context */}
      <Header title="Mavericks Execution Platform" />
      
      <div className="p-6 space-y-6 fade-in max-w-[1600px] mx-auto w-full">

        {/* 4 Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Total Users" value="1,248" icon={Users} color="#2563EB" trendVal="12.5%" trendColor="#3B82F6" />
          <MetricCard label="Active Batches" value="18" icon={Layers} color="#10B981" trendVal="5.9%" trendColor="#10B981" />
          <MetricCard label="Total Candidates" value="12,563" icon={Users} color="#8B5CF6" trendVal="8.7%" trendColor="#8B5CF6" />
          <MetricCard label="Alerts" value="7" icon={AlertTriangle} color="#F59E0B" trendVal="16.7%" trendColor="#F59E0B" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <div className="rounded-[16px] p-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-white">Performance Trends</h2>
              <select className="bg-[#0B1221] border border-white/10 text-[#82A0CE] text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                <option>Last 7 Days</option>
              </select>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.05)" }} />
                  <Line type="monotone" dataKey="value" name="Overall Performance" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6", stroke: "#0B1221", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[11px] text-[#82A0CE]">Overall Performance</span>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#82A0CE", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Total Candidates" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Custom Labels on top of bars */}
              <div className="absolute inset-0 pointer-events-none flex items-end pb-8">
                {batchData.map((d, i) => (
                  <div key={i} className="flex-1 flex justify-center pb-2">
                    <span className="text-[11px] font-bold text-white relative z-10" style={{ transform: `translateY(-${(d.value / 2500) * 190}px)` }}>{d.display}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
              <span className="text-[11px] text-[#82A0CE]">Total Candidates</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts List */}
        <div className="rounded-[16px] p-6" style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-white">Recent Alerts</h2>
            <button className="text-[12px] font-medium text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors">
              View All Alerts &rarr;
            </button>
          </div>
          
          <div className="space-y-3">
            {recentAlerts.map((alert, idx) => {
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
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
