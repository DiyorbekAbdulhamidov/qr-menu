"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, Minus, Receipt } from "lucide-react";
import { CartItem } from "@/app/menu/[slug]/page";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  total: number;
  isDark: boolean;
}

export function CartBottomSheet({ isOpen, onClose, cart, updateQty, total, isDark }: Props) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setRender(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setRender(false);
      setTimeout(() => { document.body.style.overflow = ""; }, 500);
    }
  }, [isOpen]);

  if (!isOpen && !render) return null;

  return (
    <div className={cn("fixed inset-0 z-[110] flex items-end justify-center transition-colors duration-500", render ? "bg-black/80 backdrop-blur-sm" : "bg-black/0 pointer-events-none")} role="dialog">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn("relative w-full h-[85vh] sm:max-w-[500px] flex flex-col rounded-t-[2.5rem] overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl", isDark ? "bg-[#0A0A0A]" : "bg-white", render ? "translate-y-0" : "translate-y-full")}>

        {/* Tepa Qism (Header) */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#111] text-white">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3"><Receipt className="text-[#D4AF37]" /> Tanlanganlar</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mt-1">Ofitsiantga ko'rsatish uchun</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform"><X size={18} /></button>
        </div>

        {/* Ro'yxat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Receipt size={48} className="mb-4 opacity-20" />
              <p>Hozircha hech narsa tanlanmadi.</p>
            </div>
          ) : (
            cart.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0">
                <div className="flex-1 pr-4">
                  <h4 className={cn("font-bold text-[17px] leading-tight", isDark ? "text-white" : "text-black")} style={{ fontFamily: "var(--font-playfair)" }}>{menuItem.name}</h4>
                  <p className="text-[#D4AF37] font-black text-sm mt-1">{Number(menuItem.price).toLocaleString()} UZS</p>
                </div>

                <div className={cn("flex items-center gap-3 rounded-full p-1 border", isDark ? "bg-zinc-900 border-white/10" : "bg-zinc-100 border-black/10")}>
                  <button onClick={() => updateQty(menuItem.id, -1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#111] text-white" : "bg-white text-black")}><Minus size={14} /></button>
                  <span className="font-bold w-4 text-center text-sm">{quantity}</span>
                  <button onClick={() => updateQty(menuItem.id, 1)} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform", isDark ? "bg-[#111] text-white" : "bg-white text-black")}><Plus size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Jami summa */}
        <div className={cn("p-8 border-t", isDark ? "bg-[#0A0A0A] border-white/5" : "bg-zinc-50 border-black/5")}>
          <div className="flex justify-between items-end mb-6">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">Jami Hisob</span>
            <span className={cn("text-3xl sm:text-4xl font-black", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>{total.toLocaleString()} <span className="text-sm uppercase">UZS</span></span>
          </div>
          <button onClick={onClose} className="w-full py-4 rounded-2xl border border-[#D4AF37] text-[#D4AF37] text-[13px] font-bold uppercase tracking-widest hover:bg-[#D4AF37]/10 transition-colors">
            Menyuga qaytish
          </button>
        </div>
      </div>
    </div>
  );
}