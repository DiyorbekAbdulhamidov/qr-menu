"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, ChefHat, Moon, Sun, MapPin, Phone, Instagram } from "lucide-react";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal";
import { useAppTheme } from "@/lib/useAppTheme";

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { mode, isDark, cycleTheme } = useAppTheme();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Sayt fonini to'liq nazorat qilish (tepa qora, past oq bo'lib qolmasligi uchun)
    document.body.style.backgroundColor = isDark ? "#050505" : "#FAFAFA";
  }, [isDark]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) return;

        const r = restSnap.data();
        setRestaurant({
          id: slug,
          name: (r.name as string) || "BODRUM UZ",
          ownerId: (r.ownerId as string) || "",
          logoUrl: r.logoUrl as string | undefined,
        });

        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef));
        const items = itemsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem);
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMenuItems(items);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const categories = ["Barchasi", ...Array.from(new Set(menuItems.map((item) => item.category)))];
  const filteredItems = activeCategory === "Barchasi" ? menuItems : menuItems.filter((item) => item.category === activeCategory);

  if (loading) return <MenuSkeleton isDark={isDark} />;

  if (!restaurant) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-playfair text-xl tracking-widest">Topilmadi</div>;
  }

  return (
    <div className={cn(
      "min-h-screen pb-24 font-sans transition-colors duration-500",
      isDark ? "bg-[#050505] text-white" : "bg-[#FAFAFA] text-[#111]"
    )}>

      {/* 1. HEADER (Bodrum Instagram Style) */}
      <div className={cn(
        "w-full pt-12 pb-6 flex flex-col items-center justify-center transition-colors",
        isDark ? "bg-[#0A0A0A] border-b border-white/5" : "bg-white border-b border-black/5 shadow-sm"
      )}>
        {/* Tungi/Kunduzgi rejim tugmasi */}
        <button
          onClick={cycleTheme}
          className={cn(
            "absolute top-5 right-5 p-2 rounded-full border transition-all",
            isDark ? "border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10" : "border-black/10 text-black hover:bg-black/5"
          )}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Logo xuddi Instagram profildek */}
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 mb-4 rounded-full p-1 border-2 border-[#D4AF37]">
          <div className={cn("w-full h-full rounded-full overflow-hidden flex items-center justify-center", isDark ? "bg-black" : "bg-white")}>
            {restaurant.logoUrl ? (
              <Image src={restaurant.logoUrl} alt="Logo" fill className="object-cover" unoptimized />
            ) : (
              <ChefHat size={40} className="text-[#D4AF37]" />
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-playfair)" }}>
          {restaurant.name}
        </h1>
        <p className={cn("text-xs font-medium mt-1 uppercase tracking-widest", isDark ? "text-zinc-400" : "text-zinc-500")}>
          Bodrum Oilaviy Turk Restorani
        </p>

        {/* Info Links */}
        <div className="flex items-center gap-6 mt-4">
          <a href="#" className="flex flex-col items-center text-[#D4AF37] hover:opacity-80"><Phone size={18} /><span className="text-[9px] mt-1">Aloqa</span></a>
          <a href="#" className="flex flex-col items-center text-[#D4AF37] hover:opacity-80"><MapPin size={18} /><span className="text-[9px] mt-1">Manzil</span></a>
          <a href="#" className="flex flex-col items-center text-[#D4AF37] hover:opacity-80"><Instagram size={18} /><span className="text-[9px] mt-1">Instagram</span></a>
        </div>
      </div>

      {/* 2. INSTAGRAM HIGHLIGHTS (Kategoriyalar navigatsiyasi) */}
      <div className={cn("sticky top-0 z-40 py-4 shadow-sm backdrop-blur-xl transition-all", isDark ? "bg-[#050505]/95 border-b border-white/5" : "bg-[#FAFAFA]/95 border-b border-black/5")}>
        <div className="max-w-4xl mx-auto px-2">
          <nav className="flex items-start gap-4 overflow-x-auto no-scrollbar px-2 pb-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex flex-col items-center flex-shrink-0 w-16 sm:w-20 gap-2 group outline-none"
                >
                  {/* Dumaloq Highlight Ikonkasi */}
                  <div className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-[2px] transition-all p-[2px]",
                    isActive ? "border-[#D4AF37]" : isDark ? "border-zinc-800 group-hover:border-zinc-600" : "border-zinc-300 group-hover:border-zinc-400"
                  )}>
                    <div className={cn(
                      "w-full h-full rounded-full flex items-center justify-center transition-colors",
                      isActive ? "bg-[#D4AF37] text-black" : isDark ? "bg-[#111] text-[#D4AF37]" : "bg-white text-[#B38F24] border border-black/5"
                    )}>
                      {/* Barchasi uchun yulduz, qolgani uchun dumaloq nuqta yoki bosh harf */}
                      <span className="text-sm font-bold">{cat.substring(0, 2).toUpperCase()}</span>
                    </div>
                  </div>
                  {/* Kategoriya nomi */}
                  <span className={cn(
                    "text-[10px] sm:text-[11px] font-bold text-center leading-tight transition-colors",
                    isActive ? (isDark ? "text-white" : "text-black") : "text-zinc-500"
                  )}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. ASOSIY MENYU KARTALARI (Xato to'g'irlandi: Rasm to'liq, narx alohida joyda) */}
      <main className="max-w-4xl mx-auto px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              disabled={!item.isAvailable}
              onClick={() => item.isAvailable && setSelectedItem(item)}
              className={cn(
                "group flex flex-col rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98]",
                isDark ? "bg-[#111] border border-white/5" : "bg-white border border-black/10 shadow-sm",
                !item.isAvailable && "opacity-40 grayscale pointer-events-none"
              )}
            >
              {/* RASM QISMI: Narxdan xoli, toza aspect ratio */}
              <div className="relative w-full aspect-[4/5] bg-zinc-900 overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    unoptimized={true} // Qotishni oldini oladi
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/30">
                    <ChefHat size={32} />
                  </div>
                )}

                {/* Vaqtincha yo'q statusi */}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-[#D4AF37] text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">Tugagan</span>
                  </div>
                )}
              </div>

              {/* MA'LUMOT VA NARX QISMI (Rasm ostida, aniq va ko'zga tashlanadigan) */}
              <div className="flex flex-col flex-1 p-3 sm:p-4">
                <h3 className={cn(
                  "text-sm sm:text-base font-bold leading-tight mb-1",
                  isDark ? "text-white" : "text-black"
                )} style={{ fontFamily: "var(--font-playfair)" }}>
                  {item.name}
                </h3>

                <p className={cn("text-[10px] sm:text-[11px] line-clamp-2 leading-snug mb-3 flex-1", isDark ? "text-zinc-400" : "text-zinc-500")}>
                  {item.description || "Taom tarkibi va ma'lumotlari."}
                </p>

                {/* NARX: Eng asosiysi hammaga birinchi ko'rinadigan qism */}
                <div className="mt-auto">
                  <span className={cn("text-base sm:text-lg font-black tracking-tight", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
                    {Number(item.price).toLocaleString()} <span className="text-[9px] uppercase ml-0.5 opacity-80">UZS</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="py-20 text-center">
            <Search size={32} className="mx-auto mb-3 text-zinc-500" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Hech narsa topilmadi</p>
          </div>
        )}
      </main>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isDark={isDark} />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// SKELETON
function MenuSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#050505]" : "bg-[#FAFAFA]")}>
      <div className="pt-12 pb-6 flex flex-col items-center">
        <Skeleton className={cn("w-28 h-28 rounded-full mb-4", isDark ? "bg-[#111]" : "bg-zinc-200")} />
        <Skeleton className={cn("w-48 h-6 rounded-md", isDark ? "bg-[#111]" : "bg-zinc-200")} />
      </div>
      <div className="flex gap-4 px-4 py-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className={cn("w-16 h-16 rounded-full", isDark ? "bg-[#111]" : "bg-zinc-200")} />
            <Skeleton className={cn("w-12 h-2", isDark ? "bg-[#111]" : "bg-zinc-200")} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 pt-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn("rounded-2xl overflow-hidden", isDark ? "bg-[#111]" : "bg-white border border-black/5")}>
            <Skeleton className={cn("w-full aspect-[4/5]", isDark ? "bg-[#1a1a1a]" : "bg-zinc-200")} />
            <div className="p-3">
              <Skeleton className={cn("w-3/4 h-4 mb-2", isDark ? "bg-[#222]" : "bg-zinc-200")} />
              <Skeleton className={cn("w-full h-3 mb-4", isDark ? "bg-[#222]" : "bg-zinc-200")} />
              <Skeleton className={cn("w-1/2 h-5", isDark ? "bg-[#222]" : "bg-zinc-200")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}