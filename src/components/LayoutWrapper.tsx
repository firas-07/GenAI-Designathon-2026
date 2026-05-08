"use client";
import Sidebar from "@/components/Sidebar";
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
    "/audit": ["Admin"],
    "/reports": ["Admin", "Training Coordinator"],
    "/analytics": ["Admin", "Training Coordinator"],
    "/feedback": ["Admin", "Training Coordinator"],
    "/candidates": ["Admin", "Training Coordinator"],
    "/assessments": ["Admin", "Trainer"],
  };

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }

    // Role-based route guard
    if (!loading && profile && routePermissions[pathname]) {
      if (!routePermissions[pathname].includes(profile.role)) {
        router.push("/"); // Redirect to dashboard if unauthorized
      }
    }
  }, [user, loading, isLoginPage, router, pathname, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#09090b" }}>
        <Loader2 className="animate-spin" size={24} style={{ color: "#14b8a6" }} />
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="min-h-screen" style={{ background: "#09090b" }}>{children}</main>;
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
          "flex-1 min-h-screen flex flex-col transition-all duration-200",
          collapsed ? "lg:ml-[60px]" : "lg:ml-[220px]",
          "ml-0"
        )}
        style={{ background: "#09090b" }}
      >
        <div className="lg:hidden flex items-center px-5 py-4 border-b sticky top-0 z-[40]"
          style={{ background: "#0c0c0e", borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "#71717a" }}
          >
            <Menu size={16} />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#14b8a6" }}>
              <div className="w-2.5 h-2.5 bg-white rounded-sm" />
            </div>
            <span className="font-semibold text-[13px] text-white tracking-tight">Maverick</span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

