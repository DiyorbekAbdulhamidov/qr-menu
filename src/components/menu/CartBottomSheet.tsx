"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { CartItem } from "@/app/menu/[slug]/page";

interface Props { isOpen: boolean; onClose: () => void; cart: CartItem[]; updateQty: (id: string, delta: number) => void; total: number; isDark: boolean; }

export function CartBottomSheet({ isOpen, onClose, cart, updateQty, total, isDark }: Props) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) { setTimeout(() => setRender(true), 50); document.body.style.overflow = "hidden"; }
    else { setRender(false); setTimeout(() => { document.body.style.overflow = ""; }, 500); }
  }, [isOpen]);

  if (!isOpen && !render) return null;

  return (
    <div className={cn("fixed inset-0 z-[110] flex items-end sm:items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]", render ? "bg-black/70 backdrop-blur-lg" : "bg-black/0 pointer-events-none")} role="dialog">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn("relative w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-[500px] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-700 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] border border-white/5", isDark ? "bg-[#0A0A0A]" : "bg-[#FAFAFA]", render ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0")}>

        {/* HEADER */}
        <div className="p-8 border-b flex justify-between items-center relative overflow-hidden" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className={cn("text-3xl font-serif font-black tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-black")}>Savat</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-2">Sizning tanlovingiz</p>
          </div>
          <button onClick={onClose} className="h-12 w-12 rounded-full flex items-center justify-center bg-zinc-800/10 hover:bg-[#D4AF37] hover:text-black transition-all duration-300 active:scale-90 relative z-10"><X size={20} strokeWidth={2.5} /></button>
        </div>

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 mt-10">
              <div className="w-20 h-20 rounded-full border border-dashed border-zinc-600 flex items-center justify-center"><ShoppingBag size={32} className="opacity-50" /></div>
              <p className="font-serif text-lg">Savat bo'sh</p>
            </div>
          ) : (
            cart.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className={cn("flex justify-between items-center p-4 rounded-2xl transition-all border", isDark ? "bg-[#111] hover:bg-[#151515] border-white/5" : "bg-white hover:bg-zinc-50 border-black/5 shadow-sm")}>
                <div className="flex-1 pr-4">
                  <h4 className={cn("font-bold text-base leading-tight mb-1", isDark ? "text-white" : "text-black")} style={{ fontFamily: "var(--font-playfair)" }}>{menuItem.name}</h4>
                  <p className="text-[#D4AF37] font-black text-sm tracking-wide">{Number(menuItem.price).toLocaleString()} <span className="text-[9px] uppercase">UZS</span></p>
                </div>

                <div className={cn("flex items-center gap-3 rounded-full p-1 border", isDark ? "bg-black border-white/10" : "bg-zinc-100 border-black/10")}>
                  <button onClick={() => updateQty(menuItem.id, -1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-zinc-800 text-white" : "bg-white text-black")}><Minus size={14} strokeWidth={3} /></button>
                  <span className="font-black w-4 text-center text-sm">{quantity}</span>
                  <button onClick={() => updateQty(menuItem.id, 1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-zinc-800 text-white" : "bg-white text-black")}><Plus size={14} strokeWidth={3} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER & CHECKOUT */}
        <div className={cn("p-6 sm:p-8 border-t backdrop-blur-xl", isDark ? "bg-[#0A0A0A]/90 border-white/5" : "bg-[#FAFAFA]/90 border-black/5")}>
          <div className="flex justify-between items-end mb-6">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Jami hisob</span>
            <span className={cn("text-4xl font-black tracking-tighter", isDark ? "text-white" : "text-black")}>
              {total.toLocaleString()} <span className="text-sm text-[#D4AF37] uppercase">UZS</span>
            </span>
          </div>

          <button onClick={onClose} disabled={cart.length === 0} className="group relative overflow-hidden w-full py-5 rounded-full bg-[#D4AF37] text-black text-[13px] font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10">Buyurtmani tasdiqlash</span>
            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}