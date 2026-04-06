"use client";

import { useEffect, useState, use, useMemo, useRef } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem as BaseMenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChefHat, Search, Moon, Sun, Monitor, Clock, Wine } from "lucide-react";
import { useAppTheme } from "@/lib/useAppTheme";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal"; // DIQQAT: Modal shu yerdan chaqiriladi

export interface MenuItem extends BaseMenuItem { subCategory?: string; }
interface CategoryData { id: string; name: string; startTime: string; endTime: string; isActive: boolean; }
const isDrinkCategory = (name: string) => /ichimlik|napitki|drink|напитки|bar/i.test(name);

export function isWithinTimeRange(start: string, end: string) {
  if (!start || !end) return true;
  const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm; const endMins = eh * 60 + em;
  return startMins <= endMins ? (current >= startMins && current <= endMins) : (current >= startMins || current <= endMins);
}

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { mode, isDark, setThemeMode } = useAppTheme();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // MODAL UCHUN STATE
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const prev = document.body.style.backgroundColor; document.body.style.backgroundColor = isDark ? "#050505" : "#FAFAFA";
    return () => { document.body.style.backgroundColor = prev; };
  }, [isDark]);

  useEffect(() => {
    if (!themeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => { if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) setThemeMenuOpen(false); };
    const timer = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handleClickOutside); };
  }, [themeMenuOpen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) return;
        const rData = restSnap.data();
        setRestaurant({ id: slug, name: rData.name || "PREMIUM RESTAURANT", ownerId: rData.ownerId || "", logoUrl: rData.logoUrl });

        let cats: CategoryData[] = rData.categories || [];
        cats = cats.filter(c => c.isActive); setCategories(cats);

        const itemsSnap = await getDocs(query(collection(db, "restaurants", slug, "menuItems")));
        setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      } finally { setLoading(false); }
    }; fetchData();
  }, [slug]);

  const filteredItems = useMemo(() => {
    if (activeCategoryId === "all") return menuItems;
    const catName = categories.find(c => c.id === activeCategoryId)?.name;
    return menuItems.filter(i => i.category === catName);
  }, [menuItems, activeCategoryId, categories]);

  if (loading) return (
    <div className={cn("min-h-screen flex items-center justify-center", isDark ? "bg-[#050505]" : "bg-[#FAFAFA]")}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 border-t-2 border-[#D4AF37] rounded-full animate-spin"></div>
        <ChefHat className="text-[#D4AF37] w-10 h-10 animate-pulse" />
      </div>
    </div>
  );

  const activeCategoryObject = categories.find(c => c.id === activeCategoryId);
  const isDrinksActive = activeCategoryObject ? isDrinkCategory(activeCategoryObject.name) : false;

  const groupedDrinks = isDrinksActive ? filteredItems.reduce((acc, item) => {
    const sub = item.subCategory || "Boshqalar";
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>) : {};

  return (
    <div className={cn("min-h-screen pb-20 font-sans transition-colors duration-500 overflow-x-hidden", isDark ? "bg-[#050505] text-white" : "bg-[#F5F5F7] text-[#111]")}>

      <header className={cn("relative pt-12 pb-8 flex flex-col items-center justify-center text-center px-4 transition-colors", isDark ? "bg-[#0A0A0A]" : "bg-white shadow-sm")}>
        <div ref={themeMenuRef} className="absolute top-6 right-6 z-50">
          <button onClick={() => setThemeMenuOpen(p => !p)} className={cn("h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all hover:scale-105", isDark ? "bg-[#111]/80 border-white/10 text-[#D4AF37]" : "bg-zinc-100 border-black/5 text-[#B38F24]")}>
            {mode === "system" ? <Monitor size={16} /> : isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          {themeMenuOpen && (
            <div className={cn("absolute right-0 mt-3 w-40 rounded-[1.2rem] border p-2 shadow-2xl backdrop-blur-3xl animate-in zoom-in-95", isDark ? "bg-[#111]/90 border-white/10" : "bg-white/90 border-black/10")}>
              <button onClick={() => { setThemeMode("light"); setThemeMenuOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-black hover:bg-black/5")}><Sun size={14} /> Kunduzgi</button>
              <button onClick={() => { setThemeMode("dark"); setThemeMenuOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-black hover:bg-black/5")}><Moon size={14} /> Tungi</button>
            </div>
          )}
        </div>

        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] border border-[#D4AF37]/30 p-1 mb-6 shadow-[0_20px_50px_rgba(212,175,55,0.15)]">
          <div className={cn("w-full h-full rounded-[1.8rem] overflow-hidden flex items-center justify-center relative shadow-inner", isDark ? "bg-[#111]" : "bg-zinc-50")}>
            {restaurant?.logoUrl ? <Image src={restaurant.logoUrl} alt="Logo" fill priority className="object-cover" /> : <ChefHat className="text-[#D4AF37] w-12 h-12" />}
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.2em] max-w-2xl leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{restaurant?.name}</h1>
      </header>

      <div className={cn("sticky top-0 z-40 py-4 shadow-sm backdrop-blur-2xl border-b transition-colors", isDark ? "bg-[#050505]/80 border-white/5" : "bg-white/80 border-black/5")}>
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar snap-x">
          <div className="flex gap-2 sm:gap-3 w-max">
            <button onClick={() => setActiveCategoryId("all")} className={cn("snap-center flex-shrink-0 px-6 sm:px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300", activeCategoryId === "all" ? "bg-[#D4AF37] text-black shadow-[0_5px_15px_rgba(212,175,55,0.3)]" : isDark ? "bg-[#111] text-zinc-400 hover:text-white" : "bg-zinc-100 text-zinc-600 hover:text-black")}>Barchasi</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)} className={cn("snap-center flex-shrink-0 px-6 sm:px-8 py-3.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2", activeCategoryId === cat.id ? "bg-[#D4AF37] text-black shadow-[0_5px_15px_rgba(212,175,55,0.3)]" : isDark ? "bg-[#111] text-zinc-400 hover:text-white" : "bg-zinc-100 text-zinc-600 hover:text-black")}>
                {cat.name.split(' / ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10">

        {isDrinksActive && Object.keys(groupedDrinks).length > 0 ? (
          <div className="space-y-12">
            {Object.entries(groupedDrinks).map(([subCatName, items]) => (
              <div key={subCatName} className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#D4AF37]" style={{ fontFamily: "var(--font-playfair)" }}>{subCatName}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#D4AF37]/50 to-transparent"></div>
                  <Wine className="text-[#D4AF37]/40" size={24} strokeWidth={1} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {items.map(item => {
                    const parentCat = categories.find(c => c.name === item.category);
                    const isTimeValid = parentCat ? isWithinTimeRange(parentCat.startTime, parentCat.endTime) : true;
                    const isCurrentlyAvailable = item.isAvailable && isTimeValid;

                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)} className={cn("flex flex-col border-b pb-3 transition-opacity cursor-pointer hover:opacity-80", isDark ? "border-white/10" : "border-black/10", !isCurrentlyAvailable && "opacity-40 grayscale")}>
                        <div className="flex justify-between items-baseline gap-4">
                          <h3 className="text-[16px] sm:text-[18px] font-bold flex-1" style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>
                          <div className="flex-1 border-b-2 border-dotted border-zinc-500/30 mx-2 relative top-[-6px] hidden sm:block"></div>
                          <span className="text-[#D4AF37] font-black text-[16px] sm:text-[18px] whitespace-nowrap">{Number(item.price).toLocaleString()} <span className="text-[10px] uppercase">UZS</span></span>
                        </div>
                        {item.description && <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 max-w-[80%] line-clamp-1">{item.description}</p>}
                        {!isCurrentlyAvailable && <p className="text-[9px] text-red-500 font-bold uppercase mt-1">Hozir yopiq {parentCat && `(${parentCat.startTime} - ${parentCat.endTime})`}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredItems.map((item) => {
              const parentCat = categories.find(c => c.name === item.category);
              const isTimeValid = parentCat ? isWithinTimeRange(parentCat.startTime, parentCat.endTime) : true;
              const isCurrentlyAvailable = item.isAvailable && isTimeValid;

              return (
                <div key={item.id} onClick={() => setSelectedItem(item)} className={cn("group flex flex-col rounded-[1.2rem] sm:rounded-[2rem] overflow-hidden border shadow-sm transition-all duration-500 cursor-pointer hover:-translate-y-1", isDark ? "bg-[#0A0A0A] border-white/5" : "bg-white border-black/5", !isCurrentlyAvailable && "opacity-60 grayscale-[50%]")}>
                  <div className="relative bg-zinc-900 overflow-hidden w-full aspect-square">
                    {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 640px) 50vw, 33vw" className={cn("object-cover transition-transform duration-[2000ms]", isCurrentlyAvailable && "group-hover:scale-110")} /> : <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/30"><ChefHat size={32} /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 hidden sm:block" />

                    {!isCurrentlyAvailable && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px] p-2 sm:p-4 text-center">
                        <Clock className="text-[#D4AF37] w-5 h-5 sm:w-6 sm:h-6 mb-2" />
                        <span className="text-[#D4AF37] text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-1">Yopiq</span>
                        {parentCat && !isTimeValid && <span className="text-white text-[8px] sm:text-[10px] font-bold border-t border-white/20 pt-2 mt-1">{parentCat.startTime} - {parentCat.endTime}</span>}
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between relative z-10 w-full">
                    <h3 className={cn("font-bold text-[13px] sm:text-[17px] leading-tight mb-2 line-clamp-2", isDark ? "text-white" : "text-[#111]")} style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>
                    <p className={cn("text-[9px] sm:text-[11px] leading-relaxed line-clamp-2 mb-3 hidden sm:block", isDark ? "text-zinc-400" : "text-zinc-500")}>{item.description}</p>
                    <div className="mt-auto">
                      <span className={cn("text-[14px] sm:text-[18px] font-black tracking-tighter", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
                        {Number(item.price).toLocaleString()} <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-70">UZS</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filteredItems.length === 0 && !loading && (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <Search size={48} className="text-[#D4AF37]/30 mb-6" strokeWidth={1} />
            <h3 className={cn("text-xl sm:text-2xl font-light mb-2", isDark ? "text-white" : "text-black")}>Bo'lim bo'sh</h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Hech qanday taom topilmadi</p>
          </div>
        )}
      </main>

      {/* TAYYOR MODAL CHAQIRILMOQDA */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isDark={isDark} />
    </div>
  );
}