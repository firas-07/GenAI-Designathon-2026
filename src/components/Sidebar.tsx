"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  MessageSquare, BarChart3, FileDown, Bell, Shield,
  Bot, Layers, Menu, X, ChevronLeft, ChevronRight, LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/",            label: "Dashboard",        icon: LayoutDashboard, roles: ["Admin", "Training Coordinator", "Trainer"] },
  { href: "/batches",     label: "Batch Management", icon: Layers,          roles: ["Admin", "Training Coordinator", "Trainer"] },
  { href: "/candidates",  label: "Candidates",       icon: Users,           roles: ["Admin", "Training Coordinator"] },
  { href: "/attendance",  label: "Attendance",       icon: ClipboardCheck,  roles: ["Admin", "Training Coordinator", "Trainer"] },
  { href: "/assessments", label: "Assessments",      icon: BookOpen,        roles: ["Admin", "Trainer"] },
  { href: "/feedback",    label: "Feedback",         icon: MessageSquare,   roles: ["Admin", "Training Coordinator"] },
  { href: "/analytics",   label: "Analytics",        icon: BarChart3,       roles: ["Admin", "Training Coordinator"] },
  { href: "/reports",     label: "Reports",          icon: FileDown,        roles: ["Admin", "Training Coordinator"] },
  { href: "/alerts",      label: "Alerts",           icon: Bell,            roles: ["Admin", "Training Coordinator"] },
  { href: "/audit",       label: "Audit Log",        icon: Shield,          roles: ["Admin"] },
  { href: "/ai-assistant",label: "AI Assistant",     icon: Bot,             roles: ["Admin", "Training Coordinator"] },
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
          style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 border-b border-white/[0.06] overflow-hidden",
          collapsed ? "px-4 py-5 justify-center" : "px-5 py-5"
        )}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#14b8a6" }}>
            <Layers size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-semibold text-[13px] text-white leading-none tracking-tight">Maverick</p>
              <p className="text-[10px] mt-0.5 tracking-widest uppercase font-medium" style={{ color: "#52525b" }}>Platform</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5 custom-scrollbar">
          {filteredNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : ""}
                className={cn("nav-item", active && "active", collapsed && "justify-center px-0")}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* Tooltip on collapse */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]"
                    style={{ background: "#27272a", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className={cn("px-2 pb-4 pt-2 border-t border-white/[0.06]", collapsed && "flex flex-col items-center")}>
          {!collapsed && profile && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: "#14b8a6" }}>
                {initials(profile.name)}
              </div>
              <div className="overflow-hidden">
                <p className="text-[12px] font-semibold text-white truncate leading-tight">{profile.name}</p>
                <p className="text-[9px] tracking-widest uppercase font-medium truncate" style={{ color: "#52525b" }}>{profile.role}</p>
              </div>
            </div>
          )}
          {collapsed && profile && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white mb-2 flex-shrink-0"
              style={{ background: "#14b8a6" }}>
              {initials(profile.name)}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2.5 px-2 py-2 rounded-lg text-[12px] font-medium transition-colors w-full",
              collapsed && "justify-center"
            )}
            style={{ color: "#52525b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52525b"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            title="Sign Out"
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

