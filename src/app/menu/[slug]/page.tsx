"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChefHat, Moon, Sun, Clock, Plus, ShoppingBag, CupSoda, Search } from "lucide-react";
import { useAppTheme } from "@/lib/useAppTheme";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal";
import { CartBottomSheet } from "@/components/menu/CartBottomSheet";
import toast, { Toaster } from "react-hot-toast";

export interface CartItem { menuItem: MenuItem; quantity: number; }
interface CategoryData { id: string; name: string; startTime: string; endTime: string; isActive: boolean; }

// Vaqtni hisoblovchi Helper (Aniq vaqt ko'rsatiladi)
export function getAvailability(start: string, end: string) {
  if (!start || !end) return { isAvailable: true, text: "" };
  const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm; const endMins = eh * 60 + em;
  const isAvailable = startMins <= endMins ? (current >= startMins && current <= endMins) : (current >= startMins || current <= endMins);
  return { isAvailable, text: isAvailable ? "" : `Vaqtincha yopiq (${start} dan ${end} gacha mavjud)` };
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

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDark ? "#050505" : "#FAFAFA";
    return () => { document.body.style.backgroundColor = prev; };
  }, [isDark]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) return;
        setRestaurant({ id: slug, name: restSnap.data().name || "Premium Restoran", logoUrl: restSnap.data().logoUrl } as Restaurant);
        setCategories((restSnap.data().categories || []).filter((c: CategoryData) => c.isActive));
        const itemsSnap = await getDocs(query(collection(db, "restaurants", slug, "menuItems")));
        setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      } finally { setLoading(false); }
    }; fetchData();
  }, [slug]);

  // Savatga qo'shish va Hissiyot (Feedback)
  const handleAddToCart = (item: MenuItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { menuItem: item, quantity: qty }];
    });

    // Telefonni titratish (Mobil uchun)
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);

    // Chiroyli Toast xabarnoma
    toast.success(`${item.name} tanlandi`, {
      icon: '✨',
      style: { borderRadius: '20px', background: isDark ? '#222' : '#fff', color: isDark ? '#fff' : '#000', border: '1px solid #D4AF37' }
    });

    // Pastki tugmani sakratish
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);
  };

  const handleUpdateCart = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + (Number(curr.menuItem.price) * curr.quantity), 0);

  // XATOSIZ FILTRLASH (Bo'shliq va harf registri muammosi hal qilindi)
  const currentCategoryItems = useMemo(() => {
    if (activeCategoryId === "all") return menuItems;
    const selectedCat = categories.find(c => c.id === activeCategoryId);
    if (!selectedCat) return menuItems;
    const targetName = selectedCat.name.trim().toLowerCase();
    return menuItems.filter(i => i.category?.trim().toLowerCase() === targetName);
  }, [menuItems, activeCategoryId, categories]);

  const imagedItems = currentCategoryItems.filter(i => i.imageUrl);
  const textItems = currentCategoryItems.filter(i => !i.imageUrl);

  const groupedTextItems = useMemo(() => {
    return textItems.reduce((acc, item) => {
      const sub = item.subCategory || "Boshqalar";
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [textItems]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><ChefHat className="text-[#D4AF37] animate-pulse w-12 h-12" /></div>;

  return (
    <div className={cn("min-h-screen pb-36 font-sans transition-colors duration-500 selection:bg-[#D4AF37]", isDark ? "bg-[#050505] text-white" : "bg-[#FAFAFA] text-[#111]")}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* MUHTASHAM HERO QISM */}
      <header className="relative w-full h-[40vh] min-h-[350px] flex flex-col items-center justify-end pb-12 text-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center transform hover:scale-105 transition-transform duration-[20s]" style={{ backgroundImage: `url('${PREMIUM_BG}')` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className={cn("absolute inset-0 bg-gradient-to-t", isDark ? "from-[#050505]" : "from-[#FAFAFA]")} />

        <div className="absolute top-6 right-6 z-50 flex gap-2">
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")} className="h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-xl bg-black/20 border border-white/20 text-white hover:bg-black/40 transition-all shadow-lg">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="w-24 h-24 rounded-full p-1 mb-6 shadow-2xl bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C]">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative bg-[#111]">
              {restaurant?.logoUrl ? <Image src={restaurant.logoUrl} alt="Logo" fill priority className="object-cover" /> : <ChefHat className="text-[#D4AF37] w-10 h-10" />}
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-2 text-[#D4AF37] drop-shadow-md">Premium Taomnoma</p>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wider text-white drop-shadow-xl" style={{ fontFamily: "var(--font-playfair)" }}>{restaurant?.name}</h1>
        </div>
      </header>

      {/* DYNAMIC ISLAND NAVIGATSIYA (O'ta qulay va zamonaviy) */}
      <div className="sticky top-4 z-40 px-4 mb-10 animate-in slide-in-from-top-4">
        <div className={cn("max-w-max mx-auto p-1.5 rounded-[2.5rem] flex items-center gap-1 overflow-x-auto no-scrollbar backdrop-blur-3xl shadow-xl transition-colors border", isDark ? "bg-[#111]/80 border-white/10" : "bg-white/80 border-black/10")}>
          <button onClick={() => setActiveCategoryId("all")} className={cn("flex-shrink-0 px-6 py-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300", activeCategoryId === "all" ? "bg-black text-white dark:bg-white dark:text-black shadow-md scale-105" : "text-zinc-500 hover:text-black dark:hover:text-white")}>
            Barcha Taomlar
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)} className={cn("flex-shrink-0 px-6 py-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300", activeCategoryId === cat.id ? "bg-black text-white dark:bg-white dark:text-black shadow-md scale-105" : "text-zinc-500 hover:text-black dark:hover:text-white")}>
              {cat.name.split(' / ')[0]}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6">

        {/* LAYOUT 1: ASOSIY TAOMLAR (Katta Rasm, Toza Dizayn) */}
        {imagedItems.length > 0 && (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 mb-16">
            {imagedItems.map((item) => {
              const parentCat = categories.find(c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase());
              const { isAvailable, text: timeText } = getAvailability(parentCat?.startTime || "", parentCat?.endTime || "");
              const isTrulyAvailable = item.isAvailable && isAvailable;

              return (
                <div key={item.id} className={cn("group flex flex-col transition-all duration-500 cursor-pointer", !isTrulyAvailable && "opacity-50 grayscale-[50%]")}>
                  <div className={cn("relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-5 shadow-sm border", isDark ? "bg-[#111] border-white/5" : "bg-white border-black/5")}>
                    <Image onClick={() => setSelectedItem(item)} src={item.imageUrl!} alt={item.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-[2000ms] group-hover:scale-105" />

                    {!isTrulyAvailable && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px] p-4 text-center">
                        <Clock className="text-[#D4AF37] w-8 h-8 mb-3" />
                        <span className="text-white text-[12px] font-black uppercase tracking-widest">{timeText || "Hozir Yopiq"}</span>
                      </div>
                    )}

                    {isTrulyAvailable && (
                      <button onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }} className="absolute bottom-4 right-4 h-12 w-12 bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-full flex items-center justify-center text-black dark:text-white border border-black/10 dark:border-white/10 transition-all active:scale-75 hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] hover:text-black shadow-xl z-20 hover:rotate-90">
                        <Plus size={20} />
                      </button>
                    )}
                  </div>

                  <div className="px-2" onClick={() => setSelectedItem(item)}>
                    <h3 className="font-bold text-xl mb-1 leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>
                    <p className="text-[12px] text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                    <span className={cn("font-black text-xl", isDark ? "text-[#D4AF37]" : "text-black")}>{Number(item.price).toLocaleString()} <span className="text-[10px] uppercase text-zinc-500 tracking-widest">UZS</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LAYOUT 2: ICHIMLIKLAR (Ro'yxat va Nuqtali Chiziqlar) */}
        {Object.keys(groupedTextItems).length > 0 && (
          <div className="max-w-4xl mx-auto space-y-16">
            {Object.entries(groupedTextItems).map(([subCat, items]) => (
              <div key={subCat} className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4 mb-8">
                  <CupSoda className="text-[#D4AF37]/50" size={24} />
                  <h2 className="text-2xl sm:text-3xl text-[#D4AF37] font-light uppercase tracking-wider" style={{ fontFamily: "var(--font-playfair)" }}>{subCat}</h2>
                  <div className="flex-1 border-b border-[#D4AF37]/20 mt-1"></div>
                </div>

                <div className="flex flex-col gap-6 sm:gap-8">
                  {items.map(item => {
                    const parentCat = categories.find(c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase());
                    const { isAvailable, text: timeText } = getAvailability(parentCat?.startTime || "", parentCat?.endTime || "");
                    const isTrulyAvailable = item.isAvailable && isAvailable;

                    return (
                      <div key={item.id} className={cn("group flex flex-col", !isTrulyAvailable && "opacity-40 grayscale")}>
                        <div className="flex items-end justify-between w-full gap-2 sm:gap-4">
                          <h3 onClick={() => setSelectedItem(item)} className="text-[18px] sm:text-[24px] font-bold cursor-pointer transition-colors hover:text-[#D4AF37]" style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>

                          <div className={cn("flex-grow border-b-2 border-dotted mb-2 transition-colors", isDark ? "border-zinc-800" : "border-zinc-300")}></div>

                          <div className="flex items-center gap-4 sm:gap-6">
                            <span className={cn("font-black text-[20px] sm:text-[24px] whitespace-nowrap", isDark ? "text-white" : "text-black")}>{Number(item.price).toLocaleString()} <span className="text-[10px] uppercase text-zinc-500">UZS</span></span>

                            {isTrulyAvailable ? (
                              <button onClick={() => handleAddToCart(item)} className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-75", isDark ? "border-white/20 hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-black text-white" : "border-black/20 hover:bg-black hover:text-white text-black")}>
                                <Plus size={18} />
                              </button>
                            ) : <div className="w-10" />}
                          </div>
                        </div>
                        {item.description && <p className="text-[12px] sm:text-[14px] text-zinc-500 mt-2 max-w-[80%] leading-relaxed">{item.description}</p>}
                        {!isTrulyAvailable && <p className="text-[10px] text-red-500 font-bold uppercase mt-2">{timeText || "Vaqtincha yopiq"}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentCategoryItems.length === 0 && !loading && (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <Search size={48} className="text-[#D4AF37]/30 mb-6" />
            <h3 className="text-2xl font-light mb-2">Bo'lim bo'sh</h3>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Bu yerda hozircha hech narsa yo'q</p>
          </div>
        )}
      </main>

      {/* FLOAT "TANLANGANLAR" TUGMASI */}
      {totalItems > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90%] sm:w-auto animate-in slide-in-from-bottom-10">
          <button onClick={() => setIsCartOpen(true)} className={cn("w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 px-6 py-4 sm:py-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl border transition-all duration-300", isBouncing ? "scale-105 bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-black/95 text-white border-white/10 hover:bg-black dark:bg-white/95 dark:text-black dark:border-black/10 dark:hover:bg-white")}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingBag className={isBouncing ? "text-black" : "text-[#D4AF37]"} size={22} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest border-l border-white/20 pl-4 dark:border-black/20">Tanlanganlar</span>
            </div>
            <span className={cn("font-black text-[16px] sm:text-[18px]", isBouncing ? "text-black" : "text-[#D4AF37]")}>{totalPrice.toLocaleString()} UZS</span>
          </button>
        </div>
      )}

      {/* MODALLAR */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={(qty) => handleAddToCart(selectedItem!, qty)} isDark={isDark} categories={categories} />
      <CartBottomSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQty={handleUpdateCart} total={totalPrice} isDark={isDark} />
    </div>
  );
}