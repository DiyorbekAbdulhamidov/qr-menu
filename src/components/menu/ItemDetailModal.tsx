"use client";

import { useEffect, useState } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, ChefHat } from "lucide-react";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  isDark: boolean;
}

export function ItemDetailModal({ item, onClose, isDark }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (item) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden"; // Orqa fon skroll bo'lishini to'xtatish
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; }
  }, [item]);

  if (!item) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-400",
      isVisible ? "bg-black/80 backdrop-blur-sm" : "bg-black/0 pointer-events-none"
    )}>

      <div className="absolute inset-0" onClick={onClose} />

      {/* DYNAMIC MODAL BOX */}
      <div className={cn(
        "relative w-full h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto no-scrollbar sm:max-w-md sm:rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-t-3xl",
        isDark ? "bg-[#111]" : "bg-white",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}>

        {/* Modalni yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform active:scale-90"
        >
          <X size={18} />
        </button>

        {/* RASM QISMI (Aspect Ratio bu buzilmaydi) */}
        <div className="relative w-full aspect-[4/5] sm:aspect-square bg-zinc-900">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              unoptimized={true} // Firebase kutishlarini yo'q qiladi
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#D4AF37]/30">
              <ChefHat size={40} />
            </div>
          )}
          {/* Teks o'qilishi uchun gradient fon */}
          <div className={cn("absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t", isDark ? "from-[#111]" : "from-white")} />
        </div>

        {/* MA'LUMOTLAR QISMI */}
        <div className="relative px-6 pb-10 -mt-6 z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
                {item.category}
              </span>
              <h2 className={cn("text-2xl sm:text-3xl font-bold mt-1 leading-tight", isDark ? "text-white" : "text-black")} style={{ fontFamily: "var(--font-playfair)" }}>
                {item.name}
              </h2>
            </div>
          </div>

          <p className={cn("text-[13px] leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-zinc-600")}>
            {item.description || "Ushbu taom haqida batafsil ma'lumot keltirilmagan."}
          </p>

          {/* KATTA NARX */}
          <div className={cn("mt-4 pt-4 border-t", isDark ? "border-white/10" : "border-black/10")}>
            <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Narxi</span>
            <span className={cn("text-3xl font-black tracking-tighter", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
              {Number(item.price).toLocaleString()} <span className="text-sm uppercase tracking-widest opacity-80">UZS</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}