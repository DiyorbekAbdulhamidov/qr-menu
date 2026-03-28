"use client";

import Image from "next/image";
import { X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuItem } from "@/lib/types";

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  isDark: boolean;
};

export function ItemDetailModal({ item, onClose, isDark }: Props) {
  return (
    <AnimatePresence mode="wait">
      {item && (
        <motion.div
          key={item.id}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Yopish"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-title"
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={[
              "relative z-10 w-full max-w-lg max-h-[min(92vh,900px)] overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border",
              isDark
                ? "bg-[#0d1814] border-[#D4AF37]/25 text-white"
                : "bg-white border-[#0a2f26]/12 text-[#0a1915]",
            ].join(" ")}
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onClose}
              className={[
                "absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
                isDark
                  ? "border-white/10 bg-black/40 text-zinc-200 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                  : "border-[#0a2f26]/15 bg-white/90 text-[#0a1915] hover:bg-[#f4f1ea]",
              ].join(" ")}
              aria-label="Yopish"
            >
              <X size={20} strokeWidth={2} />
            </button>

            <div
              className={[
                "relative aspect-[4/3] w-full sm:aspect-[16/10]",
                isDark ? "bg-[#0a1512]" : "bg-[#e8e4dc]",
              ].join(" ")}
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 512px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-[#D4AF37]/50">
                  <ImageIcon size={56} strokeWidth={1} />
                </div>
              )}
              {!item.isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                  <span className="rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold uppercase tracking-widest text-black">
                    Tugagan
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 px-5 pt-5 pb-6 sm:px-7 sm:pb-8">
              <h2
                id="menu-item-title"
                className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {item.name}
              </h2>
              <p
                className={[
                  "text-[15px] leading-relaxed sm:text-base",
                  isDark ? "text-zinc-400" : "text-zinc-600",
                ].join(" ")}
              >
                {item.description || "—"}
              </p>
              <div className="flex items-baseline gap-2 border-t border-[#D4AF37]/20 pt-4">
                <span
                  className={[
                    "text-2xl font-bold tabular-nums sm:text-3xl",
                    isDark ? "text-[#e8d5a3]" : "text-[#0a2f26]",
                  ].join(" ")}
                >
                  {Number(item.price).toLocaleString()}
                </span>
                <span
                  className={[
                    "text-xs font-semibold uppercase tracking-[0.2em]",
                    isDark ? "text-zinc-500" : "text-zinc-500",
                  ].join(" ")}
                >
                  so&apos;m
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
