"use client";
import { Bell, Search, Settings, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [liveAlertCount, setLiveAlertCount] = useState(0);
  const [searchVal, setSearchVal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "system_alerts"));
    const unsubscribe = onSnapshot(q, (snap) => {
      // Filtering for high severity as an example of badge focus
      const high = snap.docs.filter(d => d.data().severity?.toLowerCase() === "high" || d.data().severity?.toLowerCase() === "critical").length;
      setLiveAlertCount(snap.size); // Show total count on badge
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchVal.trim()) {
      const term = searchVal.trim().toLowerCase();
      if (term.includes("batch"))        router.push("/batches");
      else if (term.includes("attend"))  router.push("/attendance");
      else if (term.includes("assess") || term.includes("score")) router.push("/assessments");
      else if (term.includes("audit"))   router.push("/audit");
      else if (term.includes("alert"))   router.push("/alerts");
      else if (term.includes("report"))  router.push("/reports");
      else if (term.includes("feed"))    router.push("/feedback");
      else if (term.includes("analyt"))  router.push("/analytics");
      else if (term.includes("file"))    router.push("/files");
      else                               router.push("/candidates");
    }
  };

  const handleLogout = async () => {
    try { 
      await signOut(auth); 
    } catch (e) { 
      console.error(e); 
    }
  };

  const isTrainer = profile?.role === "Trainer";
  const initials = profile?.name ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "AD";
  const displayName = profile?.name || "Admin User";

  return (
    <header
      className="flex items-center justify-between px-6 py-4 relative z-50"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#040914" }}
    >
      <div>
        <h1 className="text-[20px] font-semibold text-white tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#5271A3" }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#5271A3" }} />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search..."
            className="pl-8 pr-4 py-1.5 text-[13px] rounded-lg outline-none w-52 transition-all"
            style={{
              background: "#0B1221",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#e4e4e7",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.06)")}
          />
        </div>

        {/* Alert Bell - Hidden for Trainer */}
        {!isTrainer && (
          <Link
            href="/alerts"
            className="relative w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5 rounded-full"
            style={{ color: "#82A0CE" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#e4e4e7")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#82A0CE")}
          >
            <Bell size={20} />
            {liveAlertCount > 0 && (
              <span
                className="absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "#ef4444", fontSize: "10px", border: "2px solid #040914" }}
              >
                {liveAlertCount}
              </span>
            )}
          </Link>
        )}

        {/* User Profile with Dropdown */}
        <div className="relative mr-4" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] p-1.5 px-2 rounded-xl transition-all border border-transparent hover:border-white/5"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 shadow-lg"
              style={{ 
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.1) 100%)", 
                border: "1px solid rgba(59, 130, 246, 0.4)" 
              }}>
              {initials}
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[13px] font-bold text-[#F8FAFF] leading-tight tracking-tight">{displayName}</span>
                <span className="text-[9px] text-[#5271A3] mt-0.5 uppercase tracking-[0.1em] font-black">{profile?.role || "Admin"}</span>
              </div>
              <ChevronDown size={14} className={cn("text-[#82A0CE] transition-transform duration-300", dropdownOpen && "rotate-180")} />
            </div>
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-3 w-52 py-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-3 zoom-in-95 duration-200"
              style={{ background: "#0B1221", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
              <div className="px-4 py-2 mb-1 border-b border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account Settings</p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-all hover:bg-white/5 hover:text-white"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={15} />
                System Settings
              </Link>
              <div className="h-[1px] bg-white/5 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold transition-all text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

