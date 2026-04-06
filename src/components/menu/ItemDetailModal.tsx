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
      // Animatsiya uchun kichik kechikish
      const timer = setTimeout(() => setIsVisible(true), 10);

      // BUG FIX: iOS scroll lock to'g'ri usul bilan
      // `overflow: hidden` iOS da body scrollni to'xtatmaydi
      // Position: fixed + top: -scrollY — iOS da ishlaydi va scroll position saqlanadi
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll"; // scrollbar o'rnini saqlaydi (layout shift yo'q)

      return () => {
        clearTimeout(timer);
        setIsVisible(false);
        // BUG FIX: scroll position qaytariladi
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflowY = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [item]);

  // BUG FIX: Escape klavishi bilan yopish
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-colors duration-400",
        isVisible ? "bg-black/80 backdrop-blur-sm" : "bg-black/0 pointer-events-none"
      )}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      {/* Backdrop — bosib yopish uchun */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={cn(
          "relative w-full h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto no-scrollbar sm:max-w-md sm:rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-t-3xl shadow-2xl border-t",
          isDark
            ? "bg-[#111] border-white/10"
            : "bg-white border-black/10",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* YOPISH TUGMASI */}
        <button
          onClick={onClose}
          aria-label="Yopish"
          className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform active:scale-90 hover:scale-110"
        >
          <X size={18} />
        </button>

        {/* RASM */}
        <div
          className={cn(
            "relative w-full aspect-[4/5] sm:aspect-square",
            isDark ? "bg-zinc-900" : "bg-zinc-100"
          )}
        >
          {item.imageUrl ? (
            // BUG FIX: unoptimized olib tashlandi — remotePatterns ishlatiladi
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#D4AF37]/30">
              <ChefHat size={40} />
            </div>
          )}
          {/* Gradient */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t",
              isDark ? "from-[#111]" : "from-white"
            )}
          />
        </div>

        {/* MA'LUMOTLAR */}
        <div className="relative px-6 pb-10 -mt-6 z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-widest",
                  isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
                )}
              >
                {item.category}
              </span>
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-bold mt-1 leading-tight",
                  isDark ? "text-white" : "text-black"
                )}
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {item.name}
              </h2>
            </div>
          </div>

          <p
            className={cn(
              "text-[12px] leading-relaxed mb-6",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}
          >
            {item.description ||
              "Ushbu taom haqida batafsil ma'lumot keltirilmagan."}
          </p>

          <div
            className={cn(
              "mt-2 pt-4 border-t",
              isDark ? "border-white/10" : "border-black/10"
            )}
          >
            <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mb-1">
              Narxi
            </span>
            <span
              className={cn(
                "text-3xl font-black tracking-tighter",
                isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
              )}
            >
              {Number(item.price).toLocaleString()}{" "}
              <span className="text-[11px] uppercase tracking-widest opacity-80">
                UZS
              </span>
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}