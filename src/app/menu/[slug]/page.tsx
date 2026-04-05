"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Image as ImageIcon, Flame } from "lucide-react";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { mode, isDark, cycleTheme } = useAppTheme();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restSnap = await getDoc(doc(db, "restaurants", slug));
        if (!restSnap.exists()) {
          setRestaurant(null);
          setMenuItems([]);
          return;
        }
        const r = restSnap.data();
        setRestaurant({
          id: slug,
          name: (r.name as string) || "BODRUM",
          ownerId: (r.ownerId as string) || "",
          logoUrl: r.logoUrl as string | undefined,
        });

        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef));
        const items = itemsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem);
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);
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
    return (
      <div className={cn("flex min-h-screen items-center justify-center", isDark ? "bg-[#030303] text-white" : "bg-[#F5F5F5] text-black")}>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-playfair)" }}>Topilmadi</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "touch-manipulation min-h-screen pb-32 font-sans selection:bg-[#D4AF37]/30 relative overflow-x-hidden",
      isDark ? "bg-[#050505] text-[#F8FAFC]" : "bg-[#FAFAFA] text-[#0A0A0A]"
    )}>
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-5 top-5 z-50 bg-black/20 backdrop-blur-md border border-white/10" />

      {/* ULTRA PREMIUM HERO (MOODY & DARK) */}
      <div className="relative h-[40vh] min-h-[300px] w-full bg-[#000]">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=1920&auto=format&fit=crop"
            alt="Bodrum Premium"
            fill
            priority
            className="object-cover opacity-50 mix-blend-luminosity"
          />
        </div>
        <div className={cn(
          "absolute inset-0",
          isDark ? "bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" : "bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/80 to-black/40"
        )} />

        <div className="relative z-20 mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-12 text-center">
          <div className="mb-4 flex justify-center">
            <span className="border-b border-[#D4AF37] pb-1 text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37]">
              Premium Turkish Cuisine
            </span>
          </div>
          <h1 className={cn(
            "text-5xl font-black uppercase tracking-[0.1em] sm:text-7xl",
            isDark ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" : "text-[#0A0A0A]"
          )} style={{ fontFamily: "var(--font-playfair)" }}>
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* SHARP & MINIMAL CATEGORY NAV */}
      <div className={cn(
        "sticky top-0 z-40 border-y py-4 backdrop-blur-2xl transition-all",
        isDark ? "bg-[#050505]/90 border-white/10" : "bg-[#FAFAFA]/90 border-black/10"
      )}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <nav className="no-scrollbar flex snap-x items-center gap-8 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "relative snap-center whitespace-nowrap pb-1 text-[13px] font-bold uppercase tracking-[0.15em] transition-all duration-300",
                  activeCategory === cat
                    ? "text-[#D4AF37]"
                    : isDark ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                )}
              >
                {cat}
                {activeCategory === cat && (
                  <span className="absolute -bottom-4 left-0 h-[2px] w-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* EDITORIAL MENU LIST (Luxury Grid) */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              disabled={!item.isAvailable}
              onClick={() => item.isAvailable && setSelectedItem(item)}
              className={cn(
                "group relative flex w-full flex-row items-center gap-6 text-left transition-all duration-500 hover:opacity-80 animate-in fade-in slide-in-from-bottom-8",
                !item.isAvailable && "pointer-events-none opacity-40 grayscale"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* SHARP SQUARE IMAGE */}
              <div className={cn(
                "relative h-[140px] w-[140px] flex-shrink-0 overflow-hidden bg-[#111] shadow-2xl transition-transform duration-700 group-hover:scale-105",
                isDark ? "border border-white/10" : "border border-black/10"
              )}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 140px, 160px"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/30 bg-[#0A0A0A]">
                    <ImageIcon size={24} strokeWidth={1} />
                  </div>
                )}
                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="border border-[#D4AF37] bg-black/80 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-[#D4AF37]">Tugagan</span>
                  </div>
                )}
              </div>

              {/* TEXT AREA - FINE DINING STYLE */}
              <div className="flex flex-1 flex-col justify-center py-2">
                <h3 className={cn(
                  "mb-2 line-clamp-2 text-xl font-bold leading-snug tracking-tight",
                  isDark ? "text-white" : "text-[#0A0A0A]"
                )} style={{ fontFamily: "var(--font-playfair)" }}>
                  {item.name}
                </h3>

                <p className={cn(
                  "mb-4 line-clamp-2 text-[12px] font-light leading-relaxed tracking-wide",
                  isDark ? "text-zinc-400" : "text-zinc-600"
                )}>
                  {item.description || "Taom uchun maxsus ta'rif kiritilmagan."}
                </p>

                {/* THE GOLDEN PRICE */}
                <div className="mt-auto">
                  <span className={cn(
                    "text-xl font-bold tracking-tighter",
                    isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
                  )}>
                    {Number(item.price).toLocaleString()} <span className="text-[10px] uppercase tracking-widest opacity-80">UZS</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="py-32 text-center">
            <Search size={32} className="mx-auto mb-4 text-[#D4AF37]" strokeWidth={1} />
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Bo'lim bo'sh</p>
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

// EDITORIAL SKELETON
function MenuSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#050505]" : "bg-[#FAFAFA]")}>
      <div className={cn("h-[40vh] animate-pulse", isDark ? "bg-[#111]" : "bg-zinc-200")} />
      <div className="border-y border-white/10 px-6 py-4">
        <div className="flex gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-4 w-24 rounded-sm", isDark ? "bg-[#1A1A1A]" : "bg-zinc-300")} />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-6">
              <Skeleton className={cn("h-[140px] w-[140px] flex-shrink-0", isDark ? "bg-[#1A1A1A]" : "bg-zinc-200")} />
              <div className="flex flex-1 flex-col justify-center">
                <Skeleton className={cn("mb-3 h-6 w-3/4 rounded-sm", isDark ? "bg-[#1A1A1A]" : "bg-zinc-200")} />
                <Skeleton className={cn("mb-6 h-3 w-full rounded-sm", isDark ? "bg-[#1A1A1A]" : "bg-zinc-200")} />
                <Skeleton className={cn("h-5 w-24 rounded-sm", isDark ? "bg-[#1A1A1A]" : "bg-zinc-200")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}