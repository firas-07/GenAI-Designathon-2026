"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { 
  Settings, Save, Shield, Bell, Globe, Database, 
  Cpu, Mail, Lock, CheckCircle2, AlertCircle,
  ShieldCheck, Clock, Activity, Trash2, RefreshCw, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { seedSystem, resetSystem, logActivity } from "@/lib/governance";

export default function SystemSettings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("training");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  // Governance State
  const [attendanceCutoff, setAttendanceCutoff] = useState("10:00");
  const [attendanceRiskThreshold, setAttendanceRiskThreshold] = useState(75);
  const [performanceThreshold, setPerformanceThreshold] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);

  // AI & Insights State
  const [aiPersona, setAiPersona] = useState("Analytical");
  const [enableAutoInsights, setEnableAutoInsights] = useState(true);

  // Security State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("4h");

  // Notifications State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "governance"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAttendanceCutoff(data.attendanceCutoff || "10:00");
          setAttendanceRiskThreshold(data.attendanceRiskThreshold || 75);
          setPerformanceThreshold(data.performanceThreshold || 70);
          setAiPersona(data.aiPersona || "Analytical");
          setEnableAutoInsights(data.enableAutoInsights ?? true);
          setMfaRequired(data.mfaRequired ?? false);
          setSessionTimeout(data.sessionTimeout || "4h");
          setEmailAlerts(data.emailAlerts ?? true);
          setRiskAlerts(data.riskAlerts ?? true);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await setDoc(doc(db, "settings", "governance"), {
        attendanceCutoff,
        attendanceRiskThreshold,
        performanceThreshold,
        aiPersona,
        enableAutoInsights,
        mfaRequired,
        sessionTimeout,
        emailAlerts,
        riskAlerts,
        lastUpdated: new Date().toISOString(),
        updatedBy: profile?.name || "Admin"
      });

      await logActivity({
        action: "Updated Governance Rules",
        user: profile?.name || "Admin",
        details: `Cutoff: ${attendanceCutoff}, Threshold: ${performanceThreshold}%`,
        category: "Governance"
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm("This will populate the system with production-ready sample data. Continue?")) return;
    setIsProcessing(true);
    try {
      await seedSystem();
      await logActivity({
        action: "System Seeded",
        user: profile?.name || "Admin",
        details: "Initialized platform with production sample data",
        category: "Data"
      });
      alert("System seeded successfully!");
    } catch (err: any) {
      alert("Error seeding system: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete ALL batches, candidates, and logs. This action cannot be undone. Proceed?")) return;
    setIsProcessing(true);
    try {
      await resetSystem();
      await logActivity({
        action: "System Reset",
        user: profile?.name || "Admin",
        details: "Wiped all transactional collections for fresh start",
        category: "Data"
      });
      alert("System reset successfully!");
    } catch (err: any) {
      alert("Error resetting system: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: "training", label: "Training Rules", icon: Database },
    { id: "governance", label: "Data Management", icon: ShieldCheck, adminOnly: true },
    { id: "ai", label: "AI & Insights", icon: Cpu },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ].filter(t => !t.adminOnly || profile?.role === "Admin");

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
                          <span className="text-sm font-semibold text-white block">Governance Thresholds</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Quality Control</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Attendance Risk Threshold (%)</label>
                          <input 
                            type="number" 
                            value={attendanceRiskThreshold} 
                            onChange={(e) => setAttendanceRiskThreshold(Number(e.target.value))}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all" 
                            placeholder="e.g. 75"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Min Passing Score (%)</label>
                          <input 
                            type="number" 
                            value={performanceThreshold} 
                            onChange={(e) => setPerformanceThreshold(Number(e.target.value))}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Attendance Cutoff Time</label>
                          <div className="relative">
                            <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input 
                              type="time" 
                              value={attendanceCutoff}
                              onChange={(e) => setAttendanceCutoff(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "governance" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Data Governance Power Tools</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Administrative controls for data hygiene and system initialization.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="text-blue-400" />
                        <h4 className="text-sm font-bold text-white">Seed Production Data</h4>
                      </div>
                      <p className="text-xs text-zinc-400">Initialize the platform with a clean set of batches, candidates, and core configurations based on production templates.</p>
                      <button 
                        onClick={handleSeed}
                        disabled={isProcessing}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Seed System Now"}
                      </button>
                    </div>

                    <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <Trash2 size={20} className="text-rose-400" />
                        <h4 className="text-sm font-bold text-white">Wipe All Records</h4>
                      </div>
                      <p className="text-xs text-zinc-400">Permanently delete all transaction data including batches, candidates, and logs. Use this for fresh cycle starts only.</p>
                      <button 
                        onClick={handleReset}
                        disabled={isProcessing}
                        className="w-full py-3 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-rose-500 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Wipe System Records"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">AI Intelligence Engine</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Configure how the system's AI evaluates talent and generates reports.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-6">
                      <div className="space-y-4">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">AI Feedback Persona</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {["Analytical", "Supportive", "Strict"].map((persona) => (
                            <button
                              key={persona}
                              onClick={() => setAiPersona(persona)}
                              className={cn(
                                "px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                                aiPersona === persona 
                                  ? "bg-blue-600/10 border-blue-500/50 text-blue-400" 
                                  : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                              )}
                            >
                              {persona}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-600 italic">
                          {aiPersona === "Analytical" && "Provides data-driven feedback focused on metrics and trends."}
                          {aiPersona === "Supportive" && "Encouraging tone focusing on growth and potential."}
                          {aiPersona === "Strict" && "Focuses on compliance, accuracy, and rigorous standards."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">Automated Batch Insights</p>
                          <p className="text-[11px] text-zinc-500">AI will automatically generate performance summaries for each batch weekly.</p>
                        </div>
                        <button 
                          onClick={() => setEnableAutoInsights(!enableAutoInsights)}
                          className={cn("w-12 h-6 rounded-full transition-all relative p-1", enableAutoInsights ? "bg-blue-600" : "bg-zinc-700")}
                        >
                          <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", enableAutoInsights ? "translate-x-6" : "translate-x-0")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Security & Access Policy</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Maintain platform integrity with enterprise-grade security protocols.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Lock size={18} className="text-rose-400" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-white">Enforce Multi-Factor Authentication</p>
                            <p className="text-[11px] text-zinc-500">Require all Admin and Coordinator roles to use 2FA via authenticator apps.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setMfaRequired(!mfaRequired)}
                          className={cn("w-12 h-6 rounded-full transition-all relative p-1", mfaRequired ? "bg-rose-600" : "bg-zinc-700")}
                        >
                          <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", mfaRequired ? "translate-x-6" : "translate-x-0")} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Session Expiration</label>
                        <select 
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                        >
                          <option value="1h">1 Hour</option>
                          <option value="4h">4 Hours</option>
                          <option value="12h">12 Hours</option>
                          <option value="24h">24 Hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Automated Notifications</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Stay informed about critical platform events and risk escalations.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail size={18} className="text-amber-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">Global Email Alerts</p>
                          <p className="text-[11px] text-zinc-500">Send summary reports and critical alerts to the registered admin email.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEmailAlerts(!emailAlerts)}
                        className={cn("w-12 h-6 rounded-full transition-all relative p-1", emailAlerts ? "bg-amber-600" : "bg-zinc-700")}
                      >
                        <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", emailAlerts ? "translate-x-6" : "translate-x-0")} />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldAlert size={18} className="text-rose-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">Risk Threshold Notifications</p>
                          <p className="text-[11px] text-zinc-500">Immediate system alert when a candidate's risk profile reaches 'HIGH'.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setRiskAlerts(!riskAlerts)}
                        className={cn("w-12 h-6 rounded-full transition-all relative p-1", riskAlerts ? "bg-rose-600" : "bg-zinc-700")}
                      >
                        <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", riskAlerts ? "translate-x-6" : "translate-x-0")} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              {(activeTab === "training" || activeTab === "ai" || activeTab === "security" || activeTab === "notifications") && (
                <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showSuccess && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm animate-in fade-in slide-in-from-left-2">
                        <CheckCircle2 size={16} />
                        Settings updated successfully
                      </div>
                    )}
                    {error && (
                      <div className="flex items-center gap-2 text-rose-400 text-sm animate-in fade-in slide-in-from-left-2">
                        <AlertCircle size={16} />
                        {error}
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
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

