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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040914" }}>
        <Loader2 className="animate-spin" size={24} style={{ color: "#3B82F6" }} />
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

