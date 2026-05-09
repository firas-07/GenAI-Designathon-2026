"use client";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, AlertCircle, Layers, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      const msg = err.code === "auth/invalid-credential" ? "Invalid email or password." : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full" style={{ background: "#040914" }}>
      {/* Background abstract gradients matching the image */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep blue background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#020510] via-[#040A18] to-[#0A122E]" />
        
        {/* Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2563EB] opacity-20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6] opacity-15 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Dotted pattern (approximation) */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at center, #82A0CE 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        
        {/* Abstract wave at the bottom left */}
        <div className="absolute -bottom-[20%] -left-[10%] w-[70%] h-[50%] bg-gradient-to-t from-[#1D4ED8] to-transparent opacity-30 blur-[80px] rounded-full transform -rotate-12 mix-blend-screen" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[60%] h-[30%] border-t border-[#3B82F6] opacity-20 blur-[2px] rounded-[100%] transform -rotate-6" />
        <div className="absolute -bottom-[5%] left-[0%] w-[70%] h-[20%] border-t-[2px] border-[#60A5FA] opacity-30 blur-[4px] rounded-[100%] transform -rotate-3" />
      </div>

      {/* Main Content Container - 2 Column Layout on large screens */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between p-6 lg:p-12 gap-12">
        
        {/* Left Side: Text and Branding */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white tracking-wider leading-tight">MAVERICKS</h2>
              <p className="text-[10px] text-[#60A5FA] tracking-[0.2em] font-semibold uppercase">Execution Platform</p>
            </div>
          </div>

          <h1 className="text-5xl lg:text-[64px] font-bold text-white leading-[1.1] tracking-tight mb-4">
            Welcome to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#6366F1]">
              Mavericks <br/>
              Execution Platform
            </span>
          </h1>
          
          <div className="w-12 h-1 bg-[#3B82F6] mb-6 rounded-full opacity-80" />

          <p className="text-[#82A0CE] text-lg lg:text-xl max-w-md leading-relaxed font-light">
            Streamline training operations, track progress, 
            and drive real results—efficiently.
          </p>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full lg:w-[480px] flex justify-center lg:justify-end animate-in slide-in-from-right-4 duration-500 delay-100">
          <div 
            className="w-full rounded-[24px] p-8 lg:p-10 relative overflow-hidden backdrop-blur-xl"
            style={{ 
              background: "linear-gradient(145deg, rgba(11, 18, 33, 0.7) 0%, rgba(4, 9, 20, 0.9) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)"
            }}
          >
            {/* Top glow effect on card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[30px] bg-[#3B82F6] opacity-10 blur-[20px]" />

            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <Lock size={24} className="text-[#60A5FA]" />
                {/* Glow behind lock */}
                <div className="absolute inset-0 bg-[#3B82F6] opacity-20 blur-[10px] rounded-full" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Login</h2>
              <p className="text-[14px] text-[#82A0CE]">
                Access your account to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-white mb-2 ml-1">
                  Email
                </label>
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
                <label className="block text-[13px] font-medium text-white mb-2 ml-1">
                  Password
                </label>
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
                disabled={loading}
                className="w-full py-4 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-4 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: "linear-gradient(to right, #2563EB, #3B82F6)",
                  boxShadow: "0 8px 20px -6px rgba(59, 130, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                }}
              >
                {/* Button hover glow */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-[#5271A3]">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#1E2E50]" />
              <ShieldCheck size={14} />
              <span className="text-[12px] uppercase tracking-wider font-semibold">Secure access</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#1E2E50]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


