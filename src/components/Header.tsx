"use client";
import { Bell, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [liveAlertCount, setLiveAlertCount] = useState(0);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const snap = await getDocs(query(collection(db, "system_alerts")));
        const high = snap.docs.filter(d => d.data().severity === "high").length;
        setLiveAlertCount(high);
      } catch (_) {}
    };
    fetchAlerts();
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
      else                               router.push("/candidates");
    }
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-4"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#09090b" }}
    >
      <div>
        <h1 className="text-[15px] font-semibold text-white tracking-tight leading-none">{title}</h1>
        {subtitle && (
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#52525b" }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#52525b" }} />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search..."
            className="pl-8 pr-4 py-1.5 text-[13px] rounded-lg outline-none w-52 transition-all"
            style={{
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#e4e4e7",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(20,184,166,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.06)")}
          />
        </div>

        {/* Alert Bell */}
        <Link
          href="/alerts"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.06)", color: "#71717a" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#e4e4e7")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#71717a")}
        >
          <Bell size={14} />
          {liveAlertCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "#ef4444", fontSize: "8px" }}
            >
              {liveAlertCount}
            </span>
          )}
        </Link>

        {/* Settings → Reports */}
        <Link
          href="/reports"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.06)", color: "#71717a" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#e4e4e7")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#71717a")}
        >
          <Settings size={14} />
        </Link>
      </div>
    </header>
  );
}

