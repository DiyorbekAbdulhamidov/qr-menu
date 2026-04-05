"use client";

import { useEffect, useState } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X } from "lucide-react";

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
    } else {
      setIsVisible(false);
    }
  }, [item]);

  if (!item) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col justify-end transition-colors duration-500",
      isVisible ? "bg-black/90 backdrop-blur-md" : "bg-black/0 pointer-events-none"
    )}>

      <div className="absolute inset-0" onClick={onClose} />

      {/* SHARP ELITE BOTTOM SHEET */}
      <div className={cn(
        "relative w-full overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-xl sm:rounded-t-[2rem]",
        isDark ? "bg-[#050505] border-t border-white/10" : "bg-[#FAFAFA] border-t border-black/10",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}>

        {/* Minimalist Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-lg border border-white/20 transition-transform hover:scale-110 active:scale-95"
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* PERFECT SQUARE / CINEMATIC IMAGE */}
        <div className="relative h-[45vh] w-full min-h-[350px] bg-[#000]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 800px"
              className="object-cover object-center opacity-90"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Tasvir yo'q</span>
            </div>
          )}

          <div className={cn(
            "absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t",
            isDark ? "from-[#050505] to-transparent" : "from-[#FAFAFA] to-transparent"
          )} />
        </div>

        {/* CONTENT - FINE DINING TYPOGRAPHY */}
        <div className="relative px-8 pb-10 pt-4">

          <div className="mb-6">
            <span className="border-b border-[#D4AF37] pb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
              {item.category}
            </span>
          </div>

          <h2 className={cn(
            "mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl",
            isDark ? "text-white" : "text-[#0A0A0A]"
          )} style={{ fontFamily: "var(--font-playfair)" }}>
            {item.name}
          </h2>

          <p className={cn(
            "mb-10 text-[14px] font-light leading-relaxed tracking-wide",
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            {item.description || "Tarkib va tayyorlanish jarayoni siri oshpazimizga tegishli."}
          </p>

          {/* LUXURY PRICE BAR */}
          <div className={cn(
            "flex items-center justify-between border-t pt-6",
            isDark ? "border-white/10" : "border-black/10"
          )}>
            <div className="flex flex-col">
              <span className={cn("text-[9px] font-bold uppercase tracking-[0.3em]", isDark ? "text-zinc-500" : "text-zinc-400")}>
                Portsiya Narxi
              </span>
              <span className={cn(
                "mt-1 text-3xl font-black tracking-tighter",
                isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
              )}>
                {Number(item.price).toLocaleString()}
                <span className="ml-1 text-[11px] uppercase tracking-[0.2em] opacity-80">UZS</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}