"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChefHat, Moon, Sun, Clock, Plus, ShoppingBag, Sparkles, ChevronRight } from "lucide-react";
import { useAppTheme } from "@/lib/useAppTheme";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal";
import { CartBottomSheet } from "@/components/menu/CartBottomSheet";
import toast, { Toaster } from "react-hot-toast";

export interface CartItem { menuItem: MenuItem; quantity: number; }
interface CategoryData { id: string; name: string; startTime: string; endTime: string; isActive: boolean; }

export function getAvailability(start: string, end: string) {
  if (!start || !end) return { isAvailable: true, text: "" };
  const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm; const endMins = eh * 60 + em;
  const isAvailable = startMins <= endMins ? (current >= startMins && current <= endMins) : (current >= startMins || current <= endMins);
  return { isAvailable, text: isAvailable ? "" : `Yopiq (${start} - ${end})` };
}

const PREMIUM_BG = "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop";

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const { mode, isDark, setThemeMode } = useAppTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDark ? "#030303" : "#FAFAFA";
    return () => { document.body.style.backgroundColor = prev; };
  }, [isDark]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) return;
        setRestaurant({ id: slug, name: restSnap.data().name || "Premium", logoUrl: restSnap.data().logoUrl } as Restaurant);
        setCategories((restSnap.data().categories || []).filter((c: CategoryData) => c.isActive));
        const itemsSnap = await getDocs(query(collection(db, "restaurants", slug, "menuItems")));
        setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    }; fetchData();
  }, [slug]);

  const handleAddToCart = (item: MenuItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { menuItem: item, quantity: qty }];
    });
    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);
    toast.custom((t) => (
      <div className={cn("flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-2xl shadow-2xl transition-all", isDark ? "bg-[#111]/90 text-white border border-white/10" : "bg-white/90 text-black border border-black/5")}>
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]"><Sparkles size={18} /></div>
        <div>
          <p className="font-bold text-sm">{item.name}</p>
          <p className="text-[11px] uppercase tracking-widest opacity-60">Savatga qo'shildi</p>
        </div>
      </div>
    ));
    setIsBouncing(true); setTimeout(() => setIsBouncing(false), 400);
  };

  const handleUpdateCart = (id: string, delta: number) => {
    setCart(prev => prev.map(c =>
      c.menuItem.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
    ).filter(c => c.quantity > 0));
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + (Number(curr.menuItem.price) * curr.quantity), 0);

  const filteredItems = useMemo(() => {
    if (activeCategoryId === "all") return menuItems;
    return menuItems.filter(i => {
      const selectedCat = categories.find(c => c.id === activeCategoryId);
      return selectedCat && i.category?.trim().toLowerCase() === selectedCat.name.trim().toLowerCase();
    });
  }, [menuItems, activeCategoryId, categories]);

  const imagedItems = filteredItems.filter(i => i.imageUrl);
  const textItems = filteredItems.filter(i => !i.imageUrl);
  const groupedTextItems = useMemo(() => {
    return textItems.reduce((acc, item) => {
      const sub = item.subCategory || "BOSHQA MAHSULOTLAR";
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(item); return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [textItems]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] text-[#D4AF37] z-50 fixed inset-0">
      <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        <div className="absolute inset-0 border-t-2 border-[#D4AF37] rounded-full animate-spin"></div>
        <ChefHat className="w-10 h-10 animate-pulse" />
      </div>
      <h1 className="text-xl font-serif uppercase tracking-[0.3em] animate-pulse">Menyu tayyorlanmoqda</h1>
    </div>
  );

  return (
    <div className={cn("min-h-screen pb-40 font-sans transition-colors duration-700 selection:bg-[#D4AF37] selection:text-white", isDark ? "bg-[#030303] text-white" : "bg-[#FAFAFA] text-[#0A0A0A]")}>
      <Toaster position="top-center" />

      {/* DYNAMIC HERO SECTION */}
      <header className="relative w-full h-[65vh] min-h-[500px] flex flex-col items-center justify-center text-center px-4 overflow-hidden rounded-b-[3rem] sm:rounded-b-[5rem] shadow-2xl">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transform hover:scale-105 transition-transform duration-[30s] ease-out" style={{ backgroundImage: `url('${PREMIUM_BG}')` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black/95" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>

        <div className="absolute top-6 right-6 z-50 flex gap-3">
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")} className="h-12 w-12 rounded-full flex items-center justify-center backdrop-blur-2xl bg-white/10 border border-white/20 text-white hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-all duration-300">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 mt-10">
          <div className="w-32 h-32 rounded-full p-[2px] mb-8 bg-gradient-to-br from-[#D4AF37] via-[#F3E5AB] to-[#8A6D1C] shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative bg-black">
              {restaurant?.logoUrl ? <Image src={restaurant.logoUrl} alt="Logo" fill priority className="object-cover" /> : <ChefHat className="text-[#D4AF37] w-14 h-14" />}
            </div>
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.6em] mb-4 text-[#D4AF37]">Mukammallik ta'mi</p>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif uppercase tracking-widest text-white drop-shadow-2xl leading-none">{restaurant?.name}</h1>
        </div>
      </header>

      {/* APPLE STYLE DYNAMIC ISLAND NAV (MARKAZLASHGAN) */}
      <div className={cn("sticky top-4 z-40 px-4 mt-8 transition-all duration-500", scrolled ? "translate-y-0" : "translate-y-2")}>
        <div className="flex justify-center">
          <div className={cn("p-1.5 rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar backdrop-blur-2xl shadow-xl border max-w-full", isDark ? "bg-[#111]/80 border-white/10" : "bg-white/90 border-black/5")}>
            <button onClick={() => setActiveCategoryId("all")} className={cn("flex-shrink-0 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300", activeCategoryId === "all" ? "bg-[#D4AF37] text-black shadow-md scale-[1.02]" : "text-zinc-500 hover:text-black dark:hover:text-white")}>
              Barchasi
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)} className={cn("flex-shrink-0 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300", activeCategoryId === cat.id ? "bg-[#D4AF37] text-black shadow-md scale-[1.02]" : "text-zinc-500 hover:text-black dark:hover:text-white")}>
                {String(cat.name || "").split(' / ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 mt-16">

        {/* ASOSIY TAOMLAR (YANGI CINEMATIC KARTALAR) */}
        {/* ASOSIY TAOMLAR (TOZA VA PREMIUM KARTALAR) */}
        {imagedItems.length > 0 && (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 mb-24">
            {imagedItems.map((item, i) => {
              const parentCat = categories.find(c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase());
              const { isAvailable, text: timeText } = getAvailability(parentCat?.startTime || "", parentCat?.endTime || "");
              const isTrulyAvailable = item.isAvailable && isAvailable;

              return (
                <div key={item.id} style={{ animationDelay: `${i * 50}ms` }}
                  className={cn("group flex flex-col bg-white dark:bg-[#0A0A0A] rounded-[2rem] border border-black/5 dark:border-white/5 hover:shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-8", !isTrulyAvailable && "opacity-75 grayscale-[40%]")}
                  onClick={() => setSelectedItem(item)}>

                  {/* Rasm qismi - To'liq ko'rinishi uchun alohida ajratildi */}
                  <div className="relative w-full aspect-[4/3] p-2 pb-0 cursor-pointer">
                    <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                      <Image
                        src={item.imageUrl!}
                        alt={item.name}
                        fill
                        quality={100}
                        sizes="(max-width: 640px) 100vw, 300px"
                        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                      />

                      {!isTrulyAvailable && (
                        <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                          <Clock size={12} className="text-white" />
                          <span className="text-white text-[9px] font-black uppercase tracking-widest">{timeText || "Yopiq"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Yozuvlar va Tugma qismi - Rasmning tagida */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] mb-3 bg-zinc-100 dark:bg-[#111] text-zinc-500">
                        {item.category}
                      </div>
                      <h3 className="text-[20px] font-serif font-bold mb-2 leading-tight group-hover:text-[#D4AF37] transition-colors">{item.name}</h3>
                      <p className="text-[12px] text-zinc-500 line-clamp-2 font-sans mb-4 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                      <span className={cn("font-sans font-black text-lg", isDark ? "text-white" : "text-black")}>
                        {Number(item.price).toLocaleString()} <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest ml-0.5">UZS</span>
                      </span>

                      {isTrulyAvailable ? (
                        <button onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }} className="h-10 w-10 bg-[#D4AF37]/10 hover:bg-[#D4AF37] rounded-full flex items-center justify-center text-[#D4AF37] hover:text-black transition-all duration-300 active:scale-90">
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <div className="h-10 w-10" /> // Bo'sh joy saqlash uchun
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* KLASSIK ICHIMLIKLAR / MATNLI MENYU */}
        {Object.keys(groupedTextItems).length > 0 && (
          <div className="max-w-4xl mx-auto space-y-24">
            {Object.entries(groupedTextItems).map(([subCat, items]) => (
              <div key={subCat} className="animate-in fade-in slide-in-from-bottom-8">
                <div className="flex items-center gap-6 mb-12">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
                  <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-[0.2em] text-[#D4AF37] whitespace-nowrap">{subCat}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {items.map(item => {
                    const parentCat = categories.find(c => String(c.name || "").trim().toLowerCase() === String(item.category || "").trim().toLowerCase());
                    const { isAvailable, text: timeText } = getAvailability(parentCat?.startTime || "", parentCat?.endTime || "");
                    const isTrulyAvailable = item.isAvailable && isAvailable;

                    return (
                      <div key={item.id} className={cn("group flex flex-col", !isTrulyAvailable && "opacity-50 grayscale")}>
                        <div className="flex items-end justify-between w-full gap-4">
                          <h3 onClick={() => setSelectedItem(item)} className="text-lg sm:text-xl font-serif font-semibold cursor-pointer transition-colors group-hover:text-[#D4AF37] leading-none pb-1">{item.name}</h3>
                          <div className={cn("flex-grow border-b-2 border-dotted mb-2 transition-colors", isDark ? "border-white/10 group-hover:border-[#D4AF37]/50" : "border-black/10 group-hover:border-[#D4AF37]/50")} />
                          <div className="flex items-center gap-4">
                            <span className={cn("font-sans font-black text-lg whitespace-nowrap", isDark ? "text-white" : "text-black")}>{Number(item.price).toLocaleString()}</span>
                            {isTrulyAvailable ? (
                              <button onClick={() => handleAddToCart(item)} className="w-8 h-8 rounded-full border border-[#D4AF37]/30 flex items-center justify-center transition-all active:scale-75 hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] bg-[#D4AF37]/5">
                                <Plus size={16} strokeWidth={2.5} />
                              </button>
                            ) : <div className="w-8" />}
                          </div>
                        </div>
                        {item.description && <p className="text-[12px] text-zinc-500 mt-2 max-w-[90%] font-sans">{item.description}</p>}
                        {!isTrulyAvailable && <p className="text-[10px] text-red-400 font-bold uppercase mt-1 tracking-widest">{timeText}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BO'SH HOLAT */}
        {filteredItems.length === 0 && !loading && (
          <div className="py-32 flex flex-col items-center justify-center text-center animate-in fade-in">
            <div className="w-24 h-24 rounded-full bg-[#111] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
              <ChefHat size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-2xl font-serif mb-2">Bo'lim bo'sh</h3>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Bu yerda hozircha hech narsa yo'q</p>
          </div>
        )}
      </main>

      {/* DYNAMIC CART FAB */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto animate-in slide-in-from-bottom-12 duration-500">
          <button onClick={() => setIsCartOpen(true)} className={cn("relative overflow-hidden w-full sm:min-w-[400px] flex items-center justify-between p-2 pl-6 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl border transition-all duration-300 group", isBouncing ? "scale-105" : "", isDark ? "bg-[#111]/90 border-white/10" : "bg-white/90 border-black/10")}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/10 to-[#D4AF37]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <ShoppingBag className={cn(isDark ? "text-white" : "text-black")} size={22} />
                <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">{totalItems}</span>
              </div>
              <div className="flex flex-col items-start border-l border-zinc-500/30 pl-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Savat</span>
                <span className={cn("font-black text-sm tracking-wide", isDark ? "text-white" : "text-black")}>{totalPrice.toLocaleString()} UZS</span>
              </div>
            </div>
            <div className="h-12 px-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-widest relative z-10 group-hover:bg-[#F3E5AB] transition-colors">
              Ko'rish <ChevronRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* MODALS */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={(qty) => handleAddToCart(selectedItem!, qty)} isDark={isDark} categories={categories} />
      <CartBottomSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQty={handleUpdateCart} total={totalPrice} isDark={isDark} />
    </div>
  );
}