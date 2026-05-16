"use client";
import Sidebar from "@/components/Sidebar";
import AIChatBot from "@/components/AIChatBot";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const isLoginPage = pathname === "/login";

  // Route protection mapping
  const routePermissions: Record<string, string[]> = {
    "/users": ["Admin"],
    "/settings": ["Admin"],
    "/audit": ["Admin"],
    "/reports": ["Admin", "Training Coordinator"],
    "/analytics": ["Admin", "Trainer"], // Training Coordinator doesn't have analytics in Sidebar
    "/feedback": ["Admin", "Training Coordinator"],
    "/candidates": ["Admin", "Training Coordinator"],
    "/batches": ["Admin", "Training Coordinator", "Trainer"],
    "/attendance": ["Admin", "Training Coordinator", "Trainer"],
    "/assessments": ["Admin", "Training Coordinator", "Trainer"],
    "/alerts": ["Admin", "Training Coordinator"],
    "/files": ["Admin", "Training Coordinator", "Trainer"],
  };

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }

    // Role-based route guard
    const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    if (!loading && profile && routePermissions[cleanPath]) {
      if (!routePermissions[cleanPath].includes(profile.role)) {
        console.warn(`[Guard] Unauthorized access attempt to ${cleanPath} by ${profile.role}`);
        router.push("/"); // Redirect to dashboard if unauthorized
      }
    }
  }, [user, loading, isLoginPage, router, pathname, profile]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#040914" }}>
        {/* Abstract background glows to match theme */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2563EB] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6] opacity-10 blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo Animation */}
          <div className="w-16 h-16 mb-8 relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl animate-ping" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10">
              <div className="w-6 h-6 bg-white rounded-md animate-pulse" />
            </div>
          </div>
          
          {/* Text & Loading Indicator */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-white font-bold text-xl tracking-[0.2em] uppercase">Maverick</h2>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
              <Loader2 className="animate-spin text-blue-400" size={16} />
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Initializing System...</span>
            </div>
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <p className="text-[10px] text-[#5271A3] uppercase tracking-[0.3em] font-black opacity-50">Talent Execution Platform</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="min-h-screen" style={{ background: "#040914" }}>{children}</main>;
  }

  // Protect all other routes
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-200",
          collapsed ? "lg:ml-[60px]" : "lg:ml-[220px]",
          "ml-0",
          "min-h-screen"
        )}
        style={{ background: "#040914" }}
      >
        <div className="lg:hidden flex items-center px-5 py-4 border-b sticky top-0 z-[40]"
          style={{ background: "#0c0c0e", borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "#82A0CE" }}
          >
            <Menu size={16} />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#3B82F6" }}>
              <div className="w-2.5 h-2.5 bg-white rounded-sm" />
            </div>
            <span className="font-semibold text-[13px] text-white tracking-tight">Maverick</span>
          </div>
        </div>

        {children}
        <AIChatBot />
      </main>
    </div>
  );
}

