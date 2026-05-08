"use client";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogIn, Mail, Lock, AlertCircle, Layers, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#09090b" }}
    >
      <div className="w-full max-w-[380px] fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "#14b8a6" }}
          >
            <Layers size={18} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Maverick</h1>
          <p className="text-[12px] mt-1 font-medium tracking-widest uppercase" style={{ color: "#52525b" }}>
            Training Execution Platform
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-[15px] font-semibold text-white mb-1">Sign in</h2>
          <p className="text-[13px] mb-7" style={{ color: "#52525b" }}>
            Enter your credentials to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#71717a" }}>
                Email
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#52525b" }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@maverick.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13px] text-white outline-none transition-all"
                  style={{
                    background: "#09090b",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist)"
                  }}
                  onFocus={e => (e.target.style.borderColor = "#14b8a6")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#71717a" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#52525b" }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13px] text-white outline-none transition-all"
                  style={{
                    background: "#09090b",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist)"
                  }}
                  onFocus={e => (e.target.style.borderColor = "#14b8a6")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                  required
                />
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg text-[12px]"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}
              >
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-2"
              style={{ background: "#14b8a6" }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-6 font-medium" style={{ color: "#3f3f46" }}>
          © 2026 Maverick Execution Platform
        </p>
      </div>
    </div>
  );
}


