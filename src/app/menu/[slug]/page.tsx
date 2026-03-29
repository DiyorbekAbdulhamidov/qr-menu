"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Search,
  Star,
  Image as ImageIcon,
  UtensilsCrossed,
  ChefHat,
  Eye,
  ChevronRight,
  Sparkles
} from "lucide-react";
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
          name: (r.name as string) || "Premium Restoran",
          ownerId: (r.ownerId as string) || "",
          logoUrl: r.logoUrl as string | undefined,
          themeColor: r.themeColor as string | undefined,
        });

        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef));
        const items = itemsSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as MenuItem
        );
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

  useEffect(() => {
    if (selectedItem) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedItem]);

  const categories = ["Barchasi", ...Array.from(new Set(menuItems.map((item) => item.category)))];

  const filteredItems =
    activeCategory === "Barchasi" || activeCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  if (loading) return <MenuSkeleton isDark={isDark} />;

  if (!restaurant) {
    return (
      <div className={cn("relative flex min-h-screen flex-col items-center justify-center px-6", isDark ? "bg-[#050505] text-zinc-400" : "bg-[#FAF9F6] text-zinc-600")}>
        <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-6 z-50 top-6" />
        <div className={cn("mb-6 rounded-full border p-8 shadow-2xl", isDark ? "border-white/10 bg-[#111]" : "border-black/5 bg-white")}>
          <UtensilsCrossed size={56} className="text-[#D4AF37]" strokeWidth={1} />
        </div>
        <h2 className={cn("mb-2 text-3xl font-light tracking-tight", isDark ? "text-white" : "text-black")} style={{ fontFamily: "var(--font-playfair)" }}>
          Menyu topilmadi
        </h2>
        <p className="font-medium text-sm uppercase tracking-widest text-zinc-500">Bunday manzil mavjud emas</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "touch-manipulation min-h-screen pb-32 font-sans selection:bg-[#D4AF37]/40 selection:text-inherit relative overflow-hidden",
      isDark ? "bg-[#050505] text-zinc-100" : "bg-[#FAF9F6] text-[#0a1915]"
    )}>
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-4 z-50 top-[max(1rem,env(safe-area-inset-top))]" />

      {/* AMBIENT BACKGROUND GLOW (Luxury light scattering) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={cn("absolute top-[-10%] left-[-10%] w-[60%] h-[40%] rounded-full blur-[150px] opacity-20", isDark ? "bg-[#D4AF37]/20" : "bg-[#D4AF37]/10")} />
        <div className={cn("absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] rounded-full blur-[120px] opacity-20", isDark ? "bg-white/5" : "bg-[#0a2f26]/5")} />
      </div>

      {/* CINEMATIC HERO */}
      <div className={cn(
        "relative h-[38vh] min-h-[280px] overflow-hidden rounded-b-[2.5rem] shadow-2xl sm:h-[45vh] sm:rounded-b-[3.5rem] md:h-[50vh]",
        isDark ? "shadow-black/60" : "shadow-[#D4AF37]/10"
      )}>
        <div className={cn(
          "absolute inset-0 z-10",
          isDark ? "bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" : "bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/60 to-black/10"
        )} />
        <div
          className={cn("absolute inset-0 animate-[cinematic-zoom_30s_infinite_alternate]", isDark ? "opacity-60" : "opacity-90")}
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}
        />

        <div className="relative z-20 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-10 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            {restaurant.logoUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-[1.2rem] border border-[#D4AF37]/40 bg-black/40 shadow-xl backdrop-blur-md">
                <Image src={restaurant.logoUrl} alt="Logo" fill className="object-cover" sizes="64px" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-[#D4AF37]/40 bg-black/40 shadow-xl backdrop-blur-md">
                <Sparkles className="text-[#D4AF37]" size={24} />
              </div>
            )}
            <span className="rounded-full border border-[#D4AF37]/30 bg-[#111]/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] backdrop-blur-xl shadow-lg">
              Signature Collection
            </span>
          </div>

          <h1 className={cn(
            "mb-3 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tighter drop-shadow-2xl sm:text-6xl md:text-7xl",
            isDark ? "text-white" : "text-[#0a1915]"
          )} style={{ fontFamily: "var(--font-playfair)" }}>
            {restaurant.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-2.5 backdrop-blur-xl shadow-lg",
              isDark ? "border-white/10 bg-white/5 text-white" : "border-[#0a2f26]/10 bg-white/80 text-[#0a1915]"
            )}>
              <Star size={16} className="fill-[#D4AF37] text-[#D4AF37]" />
              5.0 <span className="text-zinc-500 opacity-60 font-light px-1">|</span> Premium
            </span>
            <span className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-2.5 backdrop-blur-xl shadow-lg",
              isDark ? "border-white/10 bg-white/5 text-white" : "border-[#0a2f26]/10 bg-white/80 text-[#0a1915]"
            )}>
              <ChefHat size={16} className="text-[#D4AF37]" /> Milliy & Yevropa
            </span>
          </div>
        </div>
      </div>

      {/* FLOATING GLASS NAVIGATION */}
      <div className={cn(
        "sticky top-4 z-40 mx-4 mt-6 rounded-[2rem] border px-2 py-2 shadow-2xl backdrop-blur-[40px] transition-all duration-500 sm:mx-auto sm:max-w-max",
        isDark ? "bg-white/[0.03] border-white/10 shadow-black/50" : "bg-white/70 border-white shadow-[#D4AF37]/10"
      )}>
        <nav className="no-scrollbar flex snap-x items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "snap-center flex-shrink-0 whitespace-nowrap rounded-[1.5rem] px-6 py-3 text-[13px] font-bold uppercase tracking-wider transition-all duration-500",
                activeCategory === cat
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-black shadow-[0_10px_20px_rgba(212,175,55,0.3)] scale-[1.02]"
                  : isDark
                    ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                    : "text-zinc-600 hover:bg-black/5 hover:text-black"
              )}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>

      {/* MENU LIST (Premium Card Layout) */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">

        {menuItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-[3rem] py-24 text-center animate-in fade-in duration-1000">
            <div className={cn("mb-6 rounded-full border p-8 shadow-2xl", isDark ? "border-white/5 bg-[#111]" : "border-black/5 bg-white")}>
              <ChefHat size={48} className="text-[#D4AF37]" strokeWidth={1} />
            </div>
            <p className="mb-2 text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>Tayyorgarlik jarayonida</p>
            <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Oshpazlarimiz tez orada taomlarni taqdim etadi</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.isAvailable}
              onClick={() => item.isAvailable && setSelectedItem(item)}
              className={cn(
                "group relative flex w-full flex-row gap-4 overflow-hidden rounded-[2rem] border p-3.5 text-left transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-8",
                "min-h-[140px] active:scale-[0.98]",
                isDark
                  ? "bg-white/[0.02] border-white/5 hover:border-[#D4AF37]/40 hover:bg-white/[0.04] hover:shadow-[#D4AF37]/10"
                  : "bg-white border-[#0a2f26]/5 hover:border-[#D4AF37]/40 hover:shadow-[#D4AF37]/10",
                !item.isAvailable && "pointer-events-none opacity-60 grayscale-[50%]"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Luxury Image Container */}
              <div className={cn(
                "relative h-[116px] w-[116px] flex-shrink-0 overflow-hidden rounded-[1.2rem] border shadow-inner sm:h-[130px] sm:w-[130px]",
                isDark ? "border-white/10 bg-[#111]" : "border-black/5 bg-zinc-100"
              )}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110" sizes="(max-width: 640px) 130px, 150px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/40">
                    <ImageIcon size={32} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="rounded-md bg-[#D4AF37] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black shadow-xl">
                      Tugagan
                    </span>
                  </div>
                )}
              </div>

              {/* Card Content Area */}
              <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-1">
                <div className="min-w-0">
                  <h3 className={cn(
                    "mb-1.5 line-clamp-2 text-lg font-bold leading-snug tracking-tight transition-colors sm:text-xl",
                    isDark ? "text-white group-hover:text-[#D4AF37]" : "text-[#0a1915] group-hover:text-[#B38F24]"
                  )} style={{ fontFamily: "var(--font-playfair)" }}>
                    {item.name}
                  </h3>
                  <p className={cn(
                    "line-clamp-2 text-[13px] leading-relaxed font-light",
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  )}>
                    {item.description || "Taom haqida to'liq ma'lumotni ko'rish uchun ustiga bosing."}
                  </p>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <span className={cn(
                    "text-xl font-bold tabular-nums tracking-tight",
                    isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
                  )}>
                    {Number(item.price).toLocaleString()}
                    <span className="ml-1 text-[10px] uppercase tracking-widest opacity-70">UZS</span>
                  </span>

                  {item.isAvailable && (
                    <div className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      isDark
                        ? "border-white/10 bg-white/5 text-zinc-400 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-black"
                        : "border-black/5 bg-black/5 text-zinc-500 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-black"
                    )}>
                      <ChevronRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
            <div className={cn("mb-6 rounded-full border p-6", isDark ? "border-white/5 bg-[#111]" : "border-black/5 bg-white")}>
              <Search size={32} className="text-zinc-500" strokeWidth={1.5} />
            </div>
            <p className="mb-2 text-2xl font-light tracking-tight">Kategoriya bo'sh</p>
            <button
              type="button"
              onClick={() => setActiveCategory("Barchasi")}
              className="mt-6 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B38F24] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-xl shadow-[#D4AF37]/20 transition-transform active:scale-95"
            >
              Barcha menyuni ko'rish
            </button>
          </div>
        )}
      </main>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isDark={isDark} />

      {/* GLOBAL STYLES FOR CINEMATIC ANIMATIONS */}
      <style jsx global>{`
        @keyframes cinematic-zoom {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.15) translate(1%, 2%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// PREMIUM SKELETON (LOADER)
function MenuSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#050505]" : "bg-[#FAF9F6]")}>
      <div className={cn("h-[38vh] min-h-[280px] animate-pulse rounded-b-[2.5rem] sm:h-[45vh] sm:rounded-b-[3.5rem]", isDark ? "bg-[#111]" : "bg-[#E5E5E5]")} />

      <div className="sticky top-4 z-40 mx-4 mt-6 sm:mx-auto sm:max-w-max">
        <div className="flex gap-3 overflow-hidden rounded-[2rem] p-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={cn("h-12 w-28 rounded-full", isDark ? "bg-white/10" : "bg-black/10")} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={cn("flex h-[140px] flex-row gap-4 rounded-[2rem] border p-3.5", isDark ? "border-white/5 bg-[#0A0A0A]" : "border-black/5 bg-white")}>
              <Skeleton className={cn("h-[116px] w-[116px] flex-shrink-0 rounded-[1.2rem] sm:h-[130px] sm:w-[130px]", isDark ? "bg-[#1A1A1A]" : "bg-zinc-200")} />
              <div className="flex flex-1 flex-col justify-center gap-2 pr-1">
                <Skeleton className={cn("h-5 w-[85%] rounded-md", isDark ? "bg-white/10" : "bg-black/10")} />
                <Skeleton className={cn("h-3 w-full rounded-sm", isDark ? "bg-white/5" : "bg-black/5")} />
                <Skeleton className={cn("h-3 w-2/3 rounded-sm", isDark ? "bg-white/5" : "bg-black/5")} />
                <div className="mt-auto flex justify-between items-end">
                  <Skeleton className={cn("h-6 w-20 rounded-md", isDark ? "bg-white/10" : "bg-black/10")} />
                  <Skeleton className={cn("h-9 w-9 rounded-full", isDark ? "bg-white/10" : "bg-black/10")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}