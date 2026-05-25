"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Layers, Users, TrendingUp, Shield, CheckCircle, 
  BarChart3, Bell, FileText, X, Mail, Lock, Eye, EyeOff, AlertCircle 
} from "lucide-react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user && profile && !isRedirecting) {
      setIsRedirecting(true);
      router.push("/dashboard");
    }
  }, [user, profile, loading, router, isRedirecting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
    } catch (err: any) {
      let msg = err.message;
      if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040914" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] flex items-center justify-center animate-pulse">
            <Layers size={24} className="text-white" />
          </div>
          <div className="text-[#82A0CE] text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render landing page if user is logged in (prevents flash)
  if (user && profile) {
    return null;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden page-transition" style={{ background: "#040914" }}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020510] via-[#040A18] to-[#0A122E]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2563EB] opacity-20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6] opacity-15 blur-[120px] rounded-full mix-blend-screen" />
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at center, #82A0CE 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-white tracking-wider leading-tight">MAVERICKS</h2>
              <p className="text-[9px] text-[#60A5FA] tracking-[0.2em] font-semibold uppercase">Execution Platform</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ 
              background: "linear-gradient(to right, #2563EB, #3B82F6)",
              boxShadow: "0 8px 20px -6px rgba(59, 130, 246, 0.5)"
            }}
          >
            Login
          </button>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-blue-500/20" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
              <Shield size={16} className="text-[#60A5FA]" />
              <span className="text-sm text-[#82A0CE] font-medium">Trusted Training Management System</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Transform Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#6366F1]">
                Training Operations
              </span>
            </h1>

            <p className="text-[#82A0CE] text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Centralize batch management, automate attendance tracking, and drive data-driven decisions with real-time analytics and AI-powered insights.
            </p>

            <button
              onClick={() => setShowLoginModal(true)}
              className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
              style={{ 
                background: "linear-gradient(to right, #2563EB, #3B82F6)",
                boxShadow: "0 12px 24px -8px rgba(59, 130, 246, 0.6)"
              }}
            >
              Get Started
              <TrendingUp size={20} />
            </button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Candidate Management",
                description: "Streamline onboarding, batch assignments, and track candidate progress throughout the training lifecycle.",
                color: "#3B82F6"
              },
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                description: "Access comprehensive dashboards with performance metrics, attendance trends, and assessment insights.",
                color: "#10B981"
              },
              {
                icon: Bell,
                title: "Smart Alerts",
                description: "Automated notifications for attendance cutoffs, risk thresholds, and critical training milestones.",
                color: "#F59E0B"
              },
              {
                icon: FileText,
                title: "Assessment Tracking",
                description: "Upload and manage Sprint, API, Coding, and Project scores with Excel-based bulk operations.",
                color: "#8B5CF6"
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                description: "Secure RBAC system ensuring trainers, coordinators, and admins have appropriate permissions.",
                color: "#EF4444"
              },
              {
                icon: CheckCircle,
                title: "Automated Workflows",
                description: "Replace manual spreadsheets with system-driven execution and operational discipline.",
                color: "#06B6D4"
              }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl p-6 transition-all hover:scale-105 cursor-pointer group"
                  style={{
                    background: "linear-gradient(145deg, rgba(11, 18, 33, 0.6) 0%, rgba(4, 9, 20, 0.8) 100%)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
                  >
                    <Icon size={26} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-[#82A0CE] text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>



        {/* Footer */}
        <footer className="border-t border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center text-[#5271A3] text-sm">
            <p>&copy; 2026 Mavericks Execution Platform. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl p-8 shadow-2xl"
            style={{
              background: "linear-gradient(145deg, rgba(11,18,33,0.97) 0%, rgba(4,9,20,0.99) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)"
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative" 
                style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <Lock size={24} className="text-[#60A5FA]" />
                <div className="absolute inset-0 bg-[#3B82F6] opacity-20 blur-[10px] rounded-full" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-[14px] text-[#82A0CE]">Login to access your dashboard</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-white mb-2 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5271A3] group-focus-within:text-[#3B82F6] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-[14px] text-white outline-none transition-all"
                    style={{
                      background: "rgba(4, 9, 20, 0.6)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "#60A5FA";
                      e.target.style.background = "rgba(11, 18, 33, 0.8)";
                      e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(0,0,0,0.2)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(59, 130, 246, 0.3)";
                      e.target.style.background = "rgba(4, 9, 20, 0.6)";
                      e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2)";
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-white mb-2 ml-1">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5271A3] group-focus-within:text-[#3B82F6] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-[14px] text-white outline-none transition-all"
                    style={{
                      background: "rgba(4, 9, 20, 0.6)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "#60A5FA";
                      e.target.style.background = "rgba(11, 18, 33, 0.8)";
                      e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(0,0,0,0.2)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(59, 130, 246, 0.3)";
                      e.target.style.background = "rgba(4, 9, 20, 0.6)";
                      e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2)";
                    }}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5271A3] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 p-3.5 rounded-xl text-[13px] font-medium"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5" }}
                >
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-4 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: "linear-gradient(to right, #2563EB, #3B82F6)",
                  boxShadow: "0 8px 20px -6px rgba(59, 130, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                }}
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                {submitting ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 w-full">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Or continue with</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl border border-white/10 hover:bg-white/[0.02] text-white text-sm font-semibold transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
