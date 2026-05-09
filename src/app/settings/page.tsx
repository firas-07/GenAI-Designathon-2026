"use client";
import { useState } from "react";
import Header from "@/components/Header";
import { 
  Settings, Save, Shield, Bell, Globe, Database, 
  Cpu, Mail, Lock, CheckCircle2, AlertCircle,
  ShieldCheck, Clock, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1200);
  };

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "training", label: "Training Rules", icon: Database },
    { id: "ai", label: "AI & Insights", icon: Cpu },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      <Header title="System Settings" subtitle="Configure platform-wide preferences and rules" />
      
      <div className="p-6 max-w-[1400px] w-full fade-in ml-2">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0 space-y-2">
            <div className="px-4 py-2 mb-2">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Platform Console</h2>
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all group",
                  activeTab === tab.id 
                    ? "bg-white/[0.03] text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.02)]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01] border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={16} className={cn(activeTab === tab.id ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-400")} />
                  {tab.label}
                </div>
                {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="rounded-2xl border border-white/[0.06] p-8 relative overflow-hidden min-h-[600px]" 
              style={{ background: "rgba(11, 22, 50, 0.3)", backdropFilter: "blur(10px)" }}>
              
              {/* Subtle tech grid background */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

              {activeTab === "general" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">General Configuration</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Customize the core identity and regional behavior of your platform instances.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Platform Identity</label>
                      <div className="relative">
                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="text" 
                          defaultValue="Maverick Execution Platform"
                          className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Corporate Domain</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="text" 
                          defaultValue="maverick.com"
                          className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">System Timezone</label>
                      <select className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                        <option>UTC (Coordinated Universal Time)</option>
                        <option>IST (India Standard Time)</option>
                        <option>EST (Eastern Standard Time)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Primary Language</label>
                      <select className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                        <option>English (United States)</option>
                        <option>English (United Kingdom)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "training" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Training Rules</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Define the logical boundaries and quality thresholds for your training cycles.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                          <Database size={18} className="text-blue-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white block">Assessment Thresholds</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Quality Control</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Min Passing Score (%)</label>
                          <input type="number" defaultValue="70" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Attendance Grace (mins)</label>
                          <input type="number" defaultValue="15" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-white/5">
                          <CheckCircle2 size={18} className="text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Auto-generate Batch Reports</p>
                          <p className="text-xs text-zinc-500">Automatically produce PDF analytics on batch completion.</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">AI & Intelligence</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Configure the Maverick Core AI behavior and data processing models.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center border border-purple-600/20">
                          <Cpu size={18} className="text-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white block">AI Personality</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Model Context</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {['Analytical', 'Supportive', 'Strict'].map((type) => (
                            <button key={type} className={`px-4 py-3 rounded-xl border text-xs font-medium transition-all ${type === 'Analytical' ? 'bg-purple-600/20 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-white/5">
                          <Activity size={18} className="text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Predictive Analysis</p>
                          <p className="text-xs text-zinc-500">Use historical data to forecast trainee success rates.</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Security & Access</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Manage authentication protocols and secure session parameters.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                          <ShieldCheck size={18} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                          <p className="text-xs text-zinc-500">Enforce mandatory 2FA for all administrator accounts.</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-zinc-800 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-600 rounded-full shadow-sm" />
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={14} className="text-zinc-500" />
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Session Timeout (Minutes)</label>
                        </div>
                        <input type="number" defaultValue="60" className="w-full max-w-[200px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all" />
                        <p className="text-[10px] text-zinc-600">User will be logged out automatically after inactivity.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Notification Preferences</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Decide how the system communicates critical events to users.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { title: "Invitation Emails", desc: "Send automated secure links via EmailJS.", icon: Mail, color: "blue", active: true },
                      { title: "Performance Alerts", desc: "Notify coordinators of low assessment scores.", icon: AlertCircle, color: "blue", active: true },
                      { title: "System Updates", desc: "Get notified about platform maintenance.", icon: Settings, color: "zinc", active: false }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", 
                            item.color === 'blue' ? "bg-blue-600/10 border-blue-600/20" : "bg-zinc-800/50 border-white/5")}>
                            <item.icon size={18} className={item.color === 'blue' ? "text-blue-400" : "text-zinc-500"} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-xs text-zinc-500">{item.desc}</p>
                          </div>
                        </div>
                        <div className={cn("w-12 h-6 rounded-full relative cursor-pointer", item.active ? "bg-blue-600" : "bg-zinc-800")}>
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", item.active ? "right-1" : "left-1 bg-zinc-600")} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm animate-in fade-in slide-in-from-left-2">
                      <CheckCircle2 size={16} />
                      Settings updated successfully
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Discard
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                    {!isSaving && <Save size={16} />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
