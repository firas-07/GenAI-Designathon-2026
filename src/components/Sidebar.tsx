"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Settings, BarChart3, Shield, FolderSearch, Bell, Bot,
  Layers, ClipboardCheck, BookOpen, MessageSquare, FileDown, Menu, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  // Shared
  { href: "/",                 label: "Dashboard",            icon: LayoutDashboard, roles: ["Admin", "Training Coordinator", "Trainer"] },
  
  // Admin specific
  { href: "/users",            label: "User Management",      icon: Users,           roles: ["Admin"] },
  { href: "/settings",         label: "System Settings",      icon: Settings,        roles: ["Admin"] },
  { href: "/analytics",        label: "Analytics",            icon: BarChart3,       roles: ["Admin"] },
  { href: "/audit",            label: "Audit Logs",           icon: Shield,          roles: ["Admin"] },
  { href: "/files",            label: "File Monitoring",      icon: FolderSearch,    roles: ["Admin"] },
  { href: "/alerts",           label: "Alerts Configuration", icon: Bell,            roles: ["Admin"] },

  // Training Coordinator specific
  { href: "/batches",          label: "Batch Management",     icon: Layers,          roles: ["Training Coordinator"] },
  { href: "/candidates",       label: "Candidates",           icon: Users,           roles: ["Training Coordinator"] },
  { href: "/attendance",       label: "Attendance Monitor",   icon: ClipboardCheck,  roles: ["Training Coordinator"] },
  { href: "/assessments",      label: "Assessments",          icon: BookOpen,        roles: ["Training Coordinator"] },
  { href: "/feedback",         label: "Feedback",             icon: MessageSquare,   roles: ["Training Coordinator"] },
  { href: "/reports",          label: "Reports",              icon: FileDown,        roles: ["Training Coordinator"] },
  { href: "/alerts",           label: "Alerts",               icon: Bell,            roles: ["Training Coordinator"] },

  // Trainer specific
  { href: "/batches",          label: "My Batches",           icon: Layers,          roles: ["Trainer"] },
  { href: "/attendance",       label: "Attendance Upload",    icon: ClipboardCheck,  roles: ["Trainer"] },
  { href: "/assessments",      label: "Assessment Upload",    icon: BookOpen,        roles: ["Trainer"] },
  { href: "/files",            label: "Uploads / Documents",  icon: FolderSearch,    roles: ["Trainer"] },
  { href: "/analytics",        label: "Performance View",     icon: BarChart3,       roles: ["Trainer"] },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen, collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const filteredNavItems = navItems.filter(item =>
    !profile || item.roles.includes(profile.role)
  );

  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full flex flex-col z-[70] transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "border-r border-white/[0.06]"
      )}
        style={{ background: "#0c0c0e" }}
      >
        {/* Collapse toggle — desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-[72px] w-6 h-6 rounded-full items-center justify-center z-[80] transition-colors"
          style={{ background: "#1E2E50", border: "1px solid rgba(255,255,255,0.08)", color: "#82A0CE" }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Logo */}
        <div className={cn(
          "flex items-center justify-center border-b border-white/[0.06] overflow-hidden",
          "py-6"
        )}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2563EB" }}>
            <LayoutDashboard size={20} className="text-white" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5 custom-scrollbar">
          {filteredNavItems.map(({ href, label, icon: Icon }, index) => {
            const active = pathname === href;
            return (
              <Link
                key={`${href}-${label}-${index}`}
                href={href}
                title={collapsed ? label : ""}
                className={cn("nav-item", active && "active", collapsed && "justify-center px-0")}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* Tooltip on collapse */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]"
                    style={{ background: "#1E2E50", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section removed as requested */}

        {/* System Status block matching the image */}
        {!collapsed && (
          <div className="mx-4 mb-4 mt-auto p-4 rounded-xl border border-white/[0.04]" style={{ background: "rgba(11, 18, 33, 0.5)" }}>
            <p className="text-[11px] font-semibold text-white mb-2 tracking-wide">System Status</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <p className="text-[10px] text-[#10b981] font-medium">All Systems Operational</p>
            </div>
            <p className="text-[10px] text-[#5271A3]">v1.0.0</p>
          </div>
        )}
      </aside>
    </>
  );
}

