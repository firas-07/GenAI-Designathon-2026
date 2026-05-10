"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { 
  Users, UserPlus, Mail, Shield, CheckCircle, Clock, Trash2, Search, 
  Filter, MoreHorizontal, UserCheck, UserX, AlertCircle
} from "lucide-react";
import { 
  collection, getDocs, query, doc, setDoc, deleteDoc, orderBy, 
  onSnapshot, where, updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, UserRole } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

interface Invitation {
  email: string;
  role: UserRole;
  invitedBy: string;
  createdAt: any;
  status: 'pending' | 'accepted';
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Trainer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    // Real-time users
    const usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
      const usersData = snap.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    });

    // Real-time invitations
    const invQuery = query(collection(db, "invitations"), orderBy("createdAt", "desc"));
    const invUnsub = onSnapshot(invQuery, (snap) => {
      const invData = snap.docs.map(doc => doc.data() as Invitation);
      setInvitations(invData);
      setLoading(false);
    });

    return () => {
      usersUnsub();
      invUnsub();
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const emailLower = inviteEmail.toLowerCase().trim();
      
      // Check if user already exists
      if (users.some(u => u.email?.toLowerCase() === emailLower)) {
        throw new Error("User already exists in the system.");
      }

      const invRef = doc(db, "invitations", emailLower);
      await setDoc(invRef, {
        email: emailLower,
        role: inviteRole,
        invitedBy: profile?.name || "Admin",
        createdAt: new Date().toISOString(),
        status: "pending"
      });

      // Call Resend API
      try {
        const response = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailLower,
            role: inviteRole,
            invitedBy: profile?.name || "Admin"
          })
        });
        
        const result = await response.json();
        if (!response.ok) {
          console.error("Invite API error:", result);
          setErrorMessage(result.error || "Failed to send email notification.");
        } else {
          console.log("Invite API success:", result);
        }
      } catch (emailErr) {
        console.error("Network error calling Invite API:", emailErr);
      }

      setSuccessMessage(`Invitation sent to ${emailLower} as ${inviteRole}`);
      setInviteEmail("");
      
      // Clear message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInvitation = async (email: string) => {
    try {
      await deleteDoc(doc(db, "invitations", email));
    } catch (err) {
      console.error("Error deleting invitation:", err);
    }
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setOpenMenuId(null);
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const revokeAccess = async (uid: string) => {
    if (!confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setOpenMenuId(null);
    } catch (err) {
      console.error("Error revoking access:", err);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "Admin": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Training Coordinator": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Trainer": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#060D1E" }}>
      <Header title="User Management" subtitle="Manage system access and assign roles" />
      
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto w-full fade-in">
        
        {/* Top Actions: Invite & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Invite Form */}
          <div className="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden" 
            style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-600/30">
                <UserPlus size={20} className="text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Invite New User</h2>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-zinc-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full bg-[#0B1221] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-zinc-400 ml-1">Assign Role</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <select 
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full bg-[#0B1221] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                    >
                      <option value="Trainer">Trainer</option>
                      <option value="Training Coordinator">Training Coordinator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex-1">
                  {successMessage && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs animate-in fade-in slide-in-from-left-2">
                      <CheckCircle size={14} />
                      {successMessage}
                    </div>
                  )}
                  {errorMessage && (
                    <div className="flex items-center gap-2 text-rose-400 text-xs animate-in fade-in slide-in-from-left-2">
                      <AlertCircle size={14} />
                      {errorMessage}
                    </div>
                  )}
                </div>
                <button 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>

          {/* User Stats */}
          <div className="rounded-2xl p-6 flex flex-col justify-between" 
            style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(11, 22, 50, 0.6) 100%)", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
            <div>
              <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Total Active Users</span>
                  <span className="text-xl font-bold text-white">{users.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Pending Invites</span>
                  <span className="text-xl font-bold text-blue-400">{invitations.filter(i => i.status === 'pending').length}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 mt-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Invited users will automatically receive their assigned role upon their first sign-in using the invited email.
              </p>
            </div>
          </div>

        </div>

        {/* Content Tabs/Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Active Users Table */}
          <div className="xl:col-span-2 rounded-2xl" 
            style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Active Team Members</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input placeholder="Search users..." className="bg-zinc-900/50 border border-white/5 rounded-lg py-1 pl-8 pr-3 text-[11px] text-white focus:outline-none" />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-zinc-500 text-[11px] uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">User Details</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-zinc-500 text-sm">
                        No active users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user, idx) => (
                      <tr key={user.uid || idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-[12px] font-bold text-blue-400 group-hover:scale-105 transition-transform">
                              {user.name ? user.name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{user.name || 'Unknown User'}</p>
                                <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider h-fit", getRoleBadgeColor(user.role))}>
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] text-emerald-500 font-medium">Active</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block text-left">
                            {user.role !== "Admin" && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === (user.uid || idx.toString()) ? null : (user.uid || idx.toString()));
                                  }}
                                  className={cn(
                                    "p-2 rounded-lg transition-all border border-transparent",
                                    openMenuId === (user.uid || idx.toString()) 
                                      ? "bg-blue-600/10 border-blue-600/20 text-blue-400" 
                                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                                  )}
                                >
                                  <MoreHorizontal size={18} />
                                </button>

                                {openMenuId === (user.uid || idx.toString()) && (
                                  <div 
                                    className="absolute right-0 top-full mt-2 w-52 py-2 rounded-xl shadow-2xl z-[100] border border-white/10 animate-in fade-in zoom-in-95 duration-200"
                                    style={{ background: "#0B1221", backdropFilter: "blur(8px)" }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assign New Role</p>
                                    </div>
                                    <div className="px-2 space-y-1">
                                      {(["Training Coordinator", "Trainer"] as UserRole[]).map((r) => (
                                        <button
                                          key={r}
                                          onClick={() => updateUserRole(user.uid, r)}
                                          className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between",
                                            user.role === r 
                                              ? "bg-blue-600/10 text-blue-400 font-semibold" 
                                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                          )}
                                        >
                                          {r}
                                          {user.role === r && <CheckCircle size={12} />}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="h-[1px] bg-white/5 my-2" />
                                    <div className="px-2">
                                      <button 
                                        onClick={() => revokeAccess(user.uid)}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                                      >
                                        <Trash2 size={14} />
                                        Revoke System Access
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invitations */}
          <div className="rounded-2xl overflow-hidden flex flex-col" 
            style={{ background: "rgba(11, 22, 50, 0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Pending Invites</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {invitations.filter(i => i.status === 'pending').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail size={32} className="text-zinc-700 mb-3" />
                  <p className="text-xs text-zinc-500">No pending invitations</p>
                </div>
              ) : (
                invitations.filter(i => i.status === 'pending').map((inv, idx) => (
                  <div key={inv.email || idx} className="p-4 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{inv.email}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Invited by {inv.invitedBy}</p>
                      </div>
                      <button 
                        onClick={() => deleteInvitation(inv.email)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider", getRoleBadgeColor(inv.role))}>
                        {inv.role}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
