"use client";

import { useEffect, useState } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, ChefHat, Plus, Minus, Info, ShoppingBag } from "lucide-react";

interface Props { item: MenuItem | null; onClose: () => void; onAdd: (qty: number) => void; isDark: boolean; categories: any[]; }

export function ItemDetailModal({ item, onClose, onAdd, isDark, categories }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item) {
      setQty(1); setTimeout(() => setIsVisible(true), 50); document.body.style.overflow = "hidden";
      return () => { setIsVisible(false); document.body.style.overflow = ""; };
    }
  }, [item]);

  if (!item) return null;

  const parentCat = categories.find(c => c.name === item.category);
  const isAvailable = item.isAvailable && (parentCat ? (function () {
    const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = parentCat.startTime.split(":").map(Number); const [eh, em] = parentCat.endTime.split(":").map(Number);
    const startMins = sh * 60 + sm; const endMins = eh * 60 + em;
    return startMins <= endMins ? (current >= startMins && current <= endMins) : (current >= startMins || current <= endMins);
  })() : true);

  return (
    <div className={cn("fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-500", isVisible ? "bg-black/60 backdrop-blur-md" : "bg-black/0 backdrop-blur-none pointer-events-none")} role="dialog">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn("relative w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-[500px] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-2xl", isDark ? "bg-[#0A0A0A] border border-white/10" : "bg-white border border-black/5", isVisible ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0")}>
        
        {/* Yopish tugmasi */}
        <button onClick={onClose} className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all active:scale-90 hover:bg-[#D4AF37] hover:text-black"><X size={20} strokeWidth={2.5} /></button>

        {/* Scroll bo'ladigan asosiy qism (Rasm + Tekst) */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {item.imageUrl ? (
            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-zinc-100 dark:bg-zinc-900 shrink-0">
              <Image src={item.imageUrl} alt={item.name} fill priority sizes="(max-width: 640px) 100vw, 500px" className="object-cover" />
            </div>
          ) : (
            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-zinc-100 dark:bg-[#111] flex items-center justify-center shrink-0">
              <ChefHat className="text-zinc-300 dark:text-zinc-700 w-24 h-24" />
            </div>
          )}

          <div className="p-6 sm:p-8 flex-1">
            <div className="inline-flex px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] mb-4 bg-[#D4AF37] text-black">
              {item.subCategory || item.category}
            </div>
            <h2 className={cn("text-3xl sm:text-4xl font-serif font-black mb-4 leading-tight tracking-tight", isDark ? "text-white" : "text-[#111]")}>{item.name}</h2>

            {!isAvailable && (
              <div className="flex items-center gap-3 bg-red-500/10 text-red-500 px-4 py-3 rounded-xl mb-6 border border-red-500/20">
                <Info size={18} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Ayni vaqtda yopiq ({parentCat?.startTime} - {parentCat?.endTime})</span>
              </div>
            )}
            
            <p className={cn("text-[14px] leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>{item.description || "Tarkibi va ta'rifi kiritilmagan."}</p>
          </div>
        </div>

        {/* Pastki qotirilgan qism (Narx va Savatga qo'shish) */}
        {isAvailable && (
          <div className={cn("shrink-0 p-6 sm:p-8 border-t", isDark ? "bg-[#0A0A0A] border-white/5" : "bg-white border-black/5")}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Jami summa</span>
                <span className={cn("text-2xl sm:text-3xl font-black tracking-tight", isDark ? "text-white" : "text-black")}>
                  {(Number(item.price) * qty).toLocaleString()} <span className="text-[12px] text-[#D4AF37]">UZS</span>
                </span>
              </div>

              {/* Miqdor tanlagich */}
              <div className={cn("flex items-center gap-4 rounded-full p-1.5 border shadow-sm", isDark ? "bg-[#111] border-white/10" : "bg-zinc-50 border-black/5")}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90", isDark ? "bg-zinc-800 text-white" : "bg-white text-black shadow-sm")}><Minus size={18} /></button>
                <span className="font-black w-4 text-center text-lg">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90", isDark ? "bg-zinc-800 text-white" : "bg-white text-black shadow-sm")}><Plus size={18} /></button>
              </div>
            </div>

            <button onClick={() => { onAdd(qty); onClose(); }} className="w-full py-4 rounded-xl bg-[#D4AF37] text-black text-[13px] font-black uppercase tracking-[0.1em] hover:bg-[#c49f2b] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              <ShoppingBag size={18} /> Savatga Qo'shish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}