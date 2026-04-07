"use client";

import { useEffect, useState } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, ChefHat, Plus, Minus, Clock } from "lucide-react";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (qty: number) => void;
  isDark: boolean;
  categories: any[];
}

export function ItemDetailModal({ item, onClose, onAdd, isDark, categories }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item) {
      setQty(1);
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
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
    <div className={cn("fixed inset-0 z-[100] flex items-end justify-center transition-colors duration-500", isVisible ? "bg-black/80 backdrop-blur-md" : "bg-black/0 pointer-events-none")} role="dialog">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn("relative w-full h-[90vh] sm:max-w-[500px] flex flex-col rounded-t-[2.5rem] overflow-hidden transition-transform duration-500 ease-out shadow-[0_-20px_50px_rgba(0,0,0,0.5)]", isDark ? "bg-[#0A0A0A]" : "bg-white", isVisible ? "translate-y-0" : "translate-y-full")}>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/40 z-50 backdrop-blur-md" />
        <button onClick={onClose} className="absolute right-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90 shadow-lg border border-white/10"><X size={18} /></button>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {item.imageUrl ? (
            <div className="relative w-full h-[45vh] bg-[#111]">
              <Image src={item.imageUrl} alt={item.name} fill priority sizes="(max-width: 640px) 100vw, 500px" className="object-cover" />
              <div className={cn("absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t", isDark ? "from-[#0A0A0A]" : "from-white")} />
            </div>
          ) : (
            <div className="relative w-full h-[30vh] bg-gradient-to-br from-[#111] to-black flex items-center justify-center">
              <ChefHat className="text-[#D4AF37]/30 w-24 h-24" />
              <div className={cn("absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t", isDark ? "from-[#0A0A0A]" : "from-white")} />
            </div>
          )}

          <div className="px-8 -mt-6 relative z-10">
            <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-zinc-800/80 text-zinc-300 backdrop-blur-md">
              {item.subCategory || item.category}
            </div>
            <h2 className={cn("text-3xl sm:text-4xl font-black mb-4 leading-tight", isDark ? "text-white" : "text-[#111]")} style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h2>

            {!isAvailable && (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-3 rounded-xl mb-6 w-max border border-red-500/20">
                <Clock size={18} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Ayni vaqtda yopiq ({parentCat?.startTime} - {parentCat?.endTime})</span>
              </div>
            )}

            <p className={cn("text-[13px] sm:text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>{item.description || "Ushbu mahsulot haqida batafsil ma'lumot keltirilmagan."}</p>
          </div>
        </div>

        {/* Tanlanganlarga qo'shish qismi */}
        {isAvailable && (
          <div className={cn("absolute bottom-0 w-full p-6 sm:p-8 border-t backdrop-blur-2xl flex flex-col gap-5", isDark ? "bg-[#0A0A0A]/90 border-white/5" : "bg-white/95 border-black/5")}>
            <div className="flex items-center justify-between">
              <span className={cn("text-3xl sm:text-4xl font-black tracking-tight", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
                {Number(item.price).toLocaleString()} <span className="text-[12px] uppercase text-zinc-500">UZS</span>
              </span>

              {/* Miqdor */}
              <div className={cn("flex items-center gap-4 rounded-full p-1 border shadow-sm", isDark ? "bg-zinc-900 border-white/10" : "bg-zinc-100 border-black/10")}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#111] text-white" : "bg-white text-black")}><Minus size={18} /></button>
                <span className="font-bold w-4 text-center text-lg">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#111] text-white" : "bg-white text-black")}><Plus size={18} /></button>
              </div>
            </div>

            <button onClick={() => { onAdd(qty); onClose(); }} className="w-full py-4 sm:py-5 rounded-2xl bg-[#D4AF37] text-black text-[13px] font-bold uppercase tracking-widest shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
              Savatga qo'shish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}