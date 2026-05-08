"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, Star, Send, Layers, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FeedbackPage() {
  const { profile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const fireBatches = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setLiveBatches(fireBatches);
        if (fireBatches.length > 0) setSelectedBatch(fireBatches[0].name);
      } catch (e) { console.error(e); }
    };
    fetchBatches();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, "feedback"), {
        batch: selectedBatch,
        rating,
        comment,
        trainer: profile?.name || "Trainer",
        createdAt: new Date().toISOString()
      });
      showToast("Batch feedback submitted successfully!");
      setComment("");
    } catch (err) {
      showToast("Error submitting feedback", 'error');
    }
    setIsSaving(false);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <Header title="Batch Feedback" subtitle="Academic performance reviews and faculty insights" />
      
      {toast && (
        <div className={`fixed top-6 right-6 z-[10001] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8 fade-in">
        <div className="glass-card p-8 space-y-8">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <MessageSquare size={24} className="text-teal-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Academic Review</h3>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">Submit qualitative batch performance reports</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Target Batch</label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <select 
                    value={selectedBatch}
                    onChange={e => setSelectedBatch(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white outline-none focus:border-teal-500/50 transition-all appearance-none">
                    {liveBatches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Batch Performance Rating</label>
                <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button 
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={cn(
                        "transition-all hover:scale-125",
                        s <= rating ? "text-amber-400" : "text-zinc-700"
                      )}>
                      <Star size={20} fill={s <= rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                  <span className="ml-auto text-xs font-bold text-teal-400">{rating}/5 Stars</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Qualitative Insights</label>
              <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share technical challenges, strengths, or specific students who need attention..."
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 text-sm text-white outline-none focus:border-teal-500/50 transition-all min-h-[200px] resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4 text-zinc-500">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Signed: {profile?.name}</span>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSaving || !comment.trim()}
                className="px-10 py-4 rounded-2xl bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-all shadow-xl shadow-black/20 flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}




