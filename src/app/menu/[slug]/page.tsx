"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ChefHat, Plus, Monitor, Moon, Sun, Search, ClipboardList } from "lucide-react";
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
  return { isAvailable, text: isAvailable ? "" : `${start} - ${end}` };
}

// Framer Motion Animatsiyalari
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  const { isDark, setThemeMode } = useAppTheme();
  const [themeState, setThemeState] = useState<'light' | 'dark' | 'system'>('system');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // "Savat" so'zi tilda ishlatilmaydi, lekin kod strukturasi saqlab qolindi
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fonga mos ranglar (iOS Glassmorphism)
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDark ? "#0A0A0A" : "#F5F5F7";
    return () => { document.body.style.backgroundColor = prev; };
  }, [isDark]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) return;
        setRestaurant({ id: slug, name: restSnap.data().name || "Bodrum Menu", logoUrl: restSnap.data().logoUrl } as Restaurant);
        setCategories((restSnap.data().categories || []).filter((c: CategoryData) => c.isActive));

        const itemsSnap = await getDocs(query(collection(db, "restaurants", slug, "menuItems")));
        const fetchedItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        setMenuItems(fetchedItems);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }; fetchData();
  }, [slug]);

  const cycleTheme = () => {
    const nextTheme = themeState === 'system' ? 'light' : themeState === 'light' ? 'dark' : 'system';
    setThemeState(nextTheme);
    setThemeMode(nextTheme);
  };

  const handleAddToCart = (item: MenuItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { menuItem: item, quantity: qty }];
    });

    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate([10]);

    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        className="flex items-center gap-3 px-5 py-3 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-white/10 backdrop-blur-3xl bg-[#1C1C1E]/90 text-white"
      >
        <div className="w-8 h-8 rounded-full bg-[#C8102E] flex items-center justify-center text-white">
          <ClipboardList size={14} />
        </div>
        <div className="flex flex-col">
          <p className="font-semibold text-[13px] tracking-tight leading-tight">{item.name}</p>
          <p className="text-[10px] text-zinc-400">Ro'yxatga qo'shildi</p>
        </div>
      </motion.div>
    ), { duration: 1500 });
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] z-50 fixed inset-0">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-2 border-transparent border-t-[#C8102E] rounded-full" />
    </div>
  );

  return (
    <div className={cn("min-h-screen pb-32 font-sans transition-colors selection:bg-[#C8102E] selection:text-white", isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F7] text-[#1C1C1E]")}>
      <Toaster position="top-center" />

      {/* HEADER - iOS Glassmorphism */}
      <header className={cn("sticky top-0 z-50 transition-all duration-300 backdrop-blur-3xl",
        scrolled ? (isDark ? "bg-[#0A0A0A]/80 border-b border-white/5" : "bg-[#F5F5F7]/80 border-b border-black/5") : "bg-transparent")}>

        <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm overflow-hidden border border-black/5 dark:border-white/10">
              {restaurant?.logoUrl ? <Image src={restaurant.logoUrl} alt="Logo" width={40} height={40} className="object-cover" /> : <ChefHat size={20} className={isDark ? "text-white" : "text-[#C8102E]"} />}
            </div>
            <h1 className="font-bold text-[18px] tracking-tight">{restaurant?.name || "Menyu"}</h1>
          </div>

          {/* Theme Switcher */}
          <button onClick={cycleTheme} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
            {themeState === 'system' ? <Monitor size={18} /> : themeState === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {/* TABS (Kategoriyalar) */}
        <div className="px-4 pb-3 pt-1 max-w-7xl mx-auto">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar mask-gradient-right">
            <button onClick={() => setActiveCategoryId("all")} className={cn("relative whitespace-nowrap text-[15px] font-bold transition-colors py-1 outline-none",
              activeCategoryId === "all" ? "text-[#C8102E]" : "text-zinc-500")}>
              Barchasi
              {activeCategoryId === "all" && <motion.div layoutId="underline" className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-[#C8102E]" />}
            </button>

            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)} className={cn("relative whitespace-nowrap text-[15px] font-bold transition-colors py-1 outline-none",
                activeCategoryId === cat.id ? "text-[#C8102E]" : "text-zinc-500")}>
                {String(cat.name || "").split(' / ')[0]}
                {activeCategoryId === cat.id && <motion.div layoutId="underline" className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-[#C8102E]" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-4">
        {/* MOBIL 2 USTUNLI GRID */}
        {filteredItems.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={activeCategoryId}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
          >
            {filteredItems.map((item) => {
              const parentCat = categories.find(c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase());
              const { isAvailable, text: timeText } = getAvailability(parentCat?.startTime || "", parentCat?.endTime || "");

              const isTrulyAvailable = item.isAvailable !== false && isAvailable;

              return (
                <motion.div
                  variants={itemVariants}
                  key={item.id}
                  className={cn("flex flex-col cursor-pointer group", !isTrulyAvailable && "opacity-60 grayscale")}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Rasm qutisi - 100% cover */}
                  <div className="relative w-full aspect-square rounded-[24px] sm:rounded-[28px] overflow-hidden mb-3 bg-zinc-200 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-sm">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 640px) 50vw, 250px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ChefHat className="text-zinc-400 w-12 h-12" /></div>
                    )}

                    {/* Vaqtincha mavjud emas qatlami */}
                    {!isTrulyAvailable && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-2 text-center z-10">
                        <span className="text-white text-[11px] font-bold uppercase tracking-wider drop-shadow-md">
                          {item.isAvailable === false ? "Vaqtincha yo'q" : timeText}
                        </span>
                      </div>
                    )}

                    {/* "+ Tanlash" Button (Onlayn xarid emasligini bildiradi) */}
                    {isTrulyAvailable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                        className={cn("absolute bottom-2 right-2 px-3 py-1.5 rounded-[12px] flex items-center gap-1 backdrop-blur-xl shadow-lg active:scale-90 transition-transform z-10",
                          "bg-white/90 dark:bg-[#1C1C1E]/90 text-[#C8102E]")}
                      >
                        <Plus size={14} strokeWidth={3} />
                        <span className="text-[11px] font-bold tracking-wide">Tanlash</span>
                      </button>
                    )}
                  </div>

                  {/* Karta Yozuvlari va Ajralib turuvchi Narx */}
                  <div className="flex flex-col px-1">
                    <div className="mb-2">
                      <span className={cn("inline-flex px-2.5 py-1.5 rounded-[10px] font-black text-[13px] sm:text-[14px]",
                        isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#C8102E]")}>
                        {Number(item.price).toLocaleString()} <span className="text-[10px] ml-1 uppercase opacity-70">UZS</span>
                      </span>
                    </div>
                    <h3 className={cn("text-[14px] sm:text-[15px] font-bold leading-tight line-clamp-2", isDark ? "text-white/90" : "text-[#1C1C1E]")}>
                      {item.name}
                    </h3>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* BO'SH HOLAT */}
        {filteredItems.length === 0 && !loading && (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Search size={40} className="text-zinc-500 mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-1">Topilmadi</h3>
            <p className="text-sm text-zinc-500">Ushbu bo'limda taomlar mavjud emas</p>
          </div>
        )}
      </main>

      {/* FLOAT SELECTION BUTTON (Savat emas, Ofitsiantga ko'rsatish) */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsCartOpen(true)}
              className={cn("pointer-events-auto flex items-center justify-between w-full max-w-sm p-2.5 rounded-[28px] shadow-[0_20px_40px_rgba(200,16,46,0.3)] backdrop-blur-3xl border",
                isDark ? "bg-[#C8102E]/90 border-white/10 text-white" : "bg-[#C8102E]/95 border-black/5 text-white")}
            >
              <div className="flex items-center gap-3 pl-2">
                <div className="w-11 h-11 bg-white text-[#C8102E] rounded-[16px] flex items-center justify-center font-black text-[16px] shadow-sm">
                  {totalItems}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-[15px] tracking-tight leading-none mb-1">Tanlovni ko'rish</span>
                  <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Ofitsiantga ko'rsatish uchun</span>
                </div>
              </div>
              <div className="pr-4 opacity-90">
                <ClipboardList size={22} strokeWidth={2.5} />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={(qty) => handleAddToCart(selectedItem!, qty)} isDark={isDark} categories={categories} />
      <CartBottomSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQty={handleUpdateCart} total={totalPrice} isDark={isDark} />

      {/* CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-gradient-right { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); mask-image: linear-gradient(to right, black 85%, transparent 100%); }
      `}} />
    </div>
  );
}