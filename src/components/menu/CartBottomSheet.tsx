"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, Minus, ClipboardList, ArrowLeft } from "lucide-react";
import { CartItem } from "@/app/menu/[slug]/page"; // yoki o'zingizdagi to'g'ri path
import { motion, AnimatePresence } from "framer-motion";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  total: number;
  isDark: boolean;
}

export function CartBottomSheet({ isOpen, onClose, cart, updateQty, total, isDark }: SheetProps) {

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" role="dialog">

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn("relative w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-[480px] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border",
              isDark ? "bg-[#1C1C1E] border-white/10" : "bg-[#F5F5F7] border-black/5"
            )}
          >

            {/* HEADER */}
            <div className={cn("p-6 sm:p-8 border-b flex justify-between items-start bg-white/5", isDark ? "border-white/5" : "border-black/5")}>
              <div>
                <h2 className={cn("text-2xl font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-black")}>
                  Sizning tanlovingiz
                </h2>
                <p className="text-[12px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">Ofitsiantga ko'rsatish uchun</p>
              </div>
              <button onClick={onClose} className="h-10 w-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 transition-transform active:scale-90"><X size={18} strokeWidth={2.5} /></button>
            </div>

            {/* ITEMS LIST */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 no-scrollbar">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 mt-10">
                  <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <ClipboardList size={28} className="opacity-50" />
                  </div>
                  <p className="font-bold text-[15px]">Ro'yxat bo'sh</p>
                </div>
              ) : (
                cart.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className={cn("flex justify-between items-center p-3 sm:p-4 rounded-[24px] transition-colors border",
                    isDark ? "bg-[#0A0A0A] border-white/5" : "bg-white border-black/5 shadow-sm")}>

                    <div className="flex-1 pr-3">
                      <h4 className={cn("font-bold text-[15px] leading-tight mb-1", isDark ? "text-white" : "text-black")}>{menuItem.name}</h4>
                      <p className="font-black text-[13px] text-[#C8102E]">
                        {Number(menuItem.price).toLocaleString()} <span className="text-[9px] uppercase opacity-70">UZS</span>
                      </p>
                    </div>

                    <div className={cn("flex items-center gap-3 rounded-full p-1 border", isDark ? "bg-[#1C1C1E] border-white/5" : "bg-zinc-50 border-black/5")}>
                      <button onClick={() => updateQty(menuItem.id, -1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#0A0A0A] text-white" : "bg-white text-black")}><Minus size={14} strokeWidth={3} /></button>
                      <span className="font-bold w-4 text-center text-[15px]">{quantity}</span>
                      <button onClick={() => updateQty(menuItem.id, 1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#0A0A0A] text-white" : "bg-white text-black")}><Plus size={14} strokeWidth={3} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* FOOTER (Faqat yopish va jami hisob) */}
            <div className={cn("p-6 sm:p-8 border-t", isDark ? "bg-[#1C1C1E] border-white/5" : "bg-white border-black/5")}>
              <div className="flex justify-between items-end mb-6">
                <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">Jami hisob</span>
                <span className={cn("text-3xl font-black tracking-tighter", isDark ? "text-white" : "text-black")}>
                  {total.toLocaleString()} <span className="text-[14px] text-zinc-500 uppercase">UZS</span>
                </span>
              </div>

              <button onClick={onClose} className="w-full py-4 rounded-[20px] bg-black/5 dark:bg-white/10 text-black dark:text-white text-[15px] font-bold tracking-wide active:scale-[0.98] transition-transform flex justify-center items-center gap-2">
                <ArrowLeft size={18} strokeWidth={2.5} /> Menyuga qaytish
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}