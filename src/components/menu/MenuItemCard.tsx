"use client";

import { useEffect, useState } from "react";
import { MenuItem } from "@/lib/types"; // Yoki sizdagi to'g'ri path
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, ChefHat, Plus, Minus, Info, ClipboardList, ArrowLeft } from "lucide-react";

// --- 1. ITEM DETAIL MODAL ---
interface DetailProps {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (qty: number) => void;
  isDark: boolean;
  categories: any[];
}

export function ItemDetailModal({ item, onClose, onAdd, isDark, categories }: DetailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item) {
      setQty(1);
      setTimeout(() => setIsVisible(true), 50);
      document.body.style.overflow = "hidden";
      return () => { setIsVisible(false); document.body.style.overflow = ""; };
    }
  }, [item]);

  if (!item) return null;

  const parentCat = categories.find(c => c.name === item.category);
  const isAvailable = item.isAvailable !== false && (parentCat ? (function () {
    const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = parentCat.startTime.split(":").map(Number); const [eh, em] = parentCat.endTime.split(":").map(Number);
    const startMins = sh * 60 + sm; const endMins = eh * 60 + em;
    return startMins <= endMins ? (current >= startMins && current <= endMins) : (current >= startMins || current <= endMins);
  })() : true);

  return (
    <div className={cn("fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-500", isVisible ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none pointer-events-none")} role="dialog">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn("relative w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden transition-all duration-500 shadow-2xl border",
        isDark ? "bg-[#1C1C1E]/95 border-white/10 backdrop-blur-3xl" : "bg-white/95 border-black/5 backdrop-blur-3xl",
        isVisible ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0")}>

        {/* Yopish tugmasi (iOS style) */}
        <button onClick={onClose} className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90">
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Scroll asosiy qism */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {item.imageUrl ? (
            <div className="relative w-full aspect-square sm:aspect-[4/3] shrink-0 bg-zinc-200 dark:bg-black">
              <Image src={item.imageUrl} alt={item.name} fill priority sizes="(max-width: 640px) 100vw, 500px" className="object-cover" />
            </div>
          ) : (
            <div className="relative w-full aspect-square sm:aspect-[4/3] bg-zinc-100 dark:bg-[#0A0A0A] flex items-center justify-center shrink-0">
              <ChefHat className="text-zinc-300 dark:text-zinc-700 w-24 h-24" />
            </div>
          )}

          <div className="p-6 sm:p-8 flex-1">
            <div className="inline-flex px-3 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-wider mb-4 bg-black/5 dark:bg-white/10 text-[#C8102E] dark:text-[#E31837]">
              {item.subCategory || item.category}
            </div>
            <h2 className={cn("text-3xl font-bold mb-3 leading-tight tracking-tight", isDark ? "text-white" : "text-[#1C1C1E]")}>{item.name}</h2>

            {!isAvailable && (
              <div className="flex items-center gap-3 bg-red-500/10 text-[#C8102E] px-4 py-3 rounded-2xl mb-6 border border-red-500/20">
                <Info size={18} />
                <span className="text-[12px] font-bold uppercase tracking-wider">Ayni vaqtda yopiq ({parentCat?.startTime} - {parentCat?.endTime})</span>
              </div>
            )}

            <p className={cn("text-[15px] leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
              {item.description || "Ushbu taom uchun ta'rif kiritilmagan."}
            </p>
          </div>
        </div>

        {/* Pastki qotirilgan qism */}
        {isAvailable && (
          <div className={cn("shrink-0 p-6 sm:px-8 sm:py-6 border-t", isDark ? "border-white/5" : "border-black/5")}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Umumiy narx</span>
                <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-black")}>
                  {(Number(item.price) * qty).toLocaleString()} <span className="text-[12px] text-zinc-500">UZS</span>
                </span>
              </div>

              {/* Miqdor tanlagich */}
              <div className={cn("flex items-center gap-4 rounded-full p-1 border shadow-sm", isDark ? "bg-[#0A0A0A] border-white/10" : "bg-zinc-100 border-black/5")}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90", isDark ? "bg-[#1C1C1E] text-white" : "bg-white text-black shadow-sm")}><Minus size={18} /></button>
                <span className="font-bold w-4 text-center text-[17px]">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90", isDark ? "bg-[#1C1C1E] text-white" : "bg-white text-black shadow-sm")}><Plus size={18} /></button>
              </div>
            </div>

            <button onClick={() => { onAdd(qty); onClose(); }} className="w-full py-4 rounded-[20px] bg-[#C8102E] text-white text-[15px] font-bold tracking-wide active:scale-[0.98] transition-transform flex justify-center items-center gap-2 shadow-[0_10px_20px_rgba(200,16,46,0.2)]">
              <Plus size={20} strokeWidth={2.5} /> Ro'yxatga qo'shish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}