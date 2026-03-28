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
          name: (r.name as string) || "Restoran",
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
      <div
        className={cn(
          "relative flex min-h-screen flex-col items-center justify-center px-6",
          isDark ? "bg-[#050808] text-zinc-400" : "bg-[#f4f1ea] text-zinc-600"
        )}
      >
        <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-4 z-50 top-[max(1rem,env(safe-area-inset-top))]" />
        <div
          className={cn(
            "mb-6 rounded-full border p-8 shadow-2xl",
            isDark ? "border-white/10 bg-[#0d1814]" : "border-[#0a2f26]/10 bg-white"
          )}
        >
          <UtensilsCrossed size={56} className={isDark ? "text-zinc-500" : "text-zinc-400"} strokeWidth={1} />
        </div>
        <h2
          className={cn("mb-2 text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-[#0a1915]")}
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Menyu topilmadi
        </h2>
        <p className="font-medium">Bunday restoran mavjud emas.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "touch-manipulation min-h-screen pb-28 font-[family-name:var(--font-dm-sans)] selection:bg-[#D4AF37]/40 selection:text-inherit safe-pb",
        isDark
          ? "bg-[#050808] text-zinc-100"
          : "bg-[#f4f1ea] text-[#0a1915]"
      )}
    >
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-4 z-50 top-[max(1rem,env(safe-area-inset-top))]" />

      {/* Hero */}
      <div
        className={cn(
          "relative h-[32vh] min-h-[220px] overflow-hidden rounded-b-[2rem] shadow-2xl sm:h-[38vh] sm:rounded-b-[3rem] md:h-[42vh]",
          isDark ? "shadow-black/40" : "shadow-[#0a2f26]/10"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 z-10",
            isDark
              ? "bg-gradient-to-t from-[#050808] via-[#050808]/65 to-transparent"
              : "bg-gradient-to-t from-[#f4f1ea] via-[#f4f1ea]/50 to-transparent"
          )}
        />
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-[3s] ease-out",
            isDark ? "opacity-55" : "opacity-85"
          )}
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="relative z-20 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-8 sm:px-8 lg:px-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {restaurant.logoUrl ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-black/20 sm:h-16 sm:w-16">
                <Image src={restaurant.logoUrl} alt="" fill className="object-cover" sizes="64px" />
              </div>
            ) : null}
            <span className="rounded-sm border border-[#D4AF37]/45 bg-[#D4AF37]/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37] backdrop-blur-md">
              {(restaurant.name.split(/\s+/)[0] || "Restoran").toUpperCase()} Signature
            </span>
          </div>
          <h1
            className={cn(
              "mb-3 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight drop-shadow-lg sm:text-5xl md:text-6xl",
              isDark ? "text-white" : "text-[#0a1915]"
            )}
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <Star size={16} className="fill-[#D4AF37] text-[#D4AF37]" /> 4.9{" "}
              <span className={isDark ? "text-zinc-500" : "text-zinc-500"}>/ 5.0</span>
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-2xl border px-3 py-2 backdrop-blur-xl",
                isDark ? "border-white/10 bg-white/5" : "border-[#0a2f26]/10 bg-white/80"
              )}
            >
              <ChefHat size={16} className="text-[#D4AF37]" /> Milliy & Yevropa
            </span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div
        className={cn(
          "sticky top-0 z-40 border-b pt-3 pb-3 backdrop-blur-2xl transition-colors",
          isDark ? "border-white/[0.06] bg-[#050808]/75" : "border-[#0a2f26]/8 bg-[#f4f1ea]/85"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="no-scrollbar flex snap-x items-center gap-2 overflow-x-auto pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "snap-start flex-shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-all duration-300",
                  activeCategory === cat
                    ? "scale-[1.02] border-[#D4AF37] bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/25"
                    : isDark
                      ? "border-white/8 bg-[#0d1814] text-zinc-300 hover:border-[#D4AF37]/25 hover:text-white"
                      : "border-[#0a2f26]/12 bg-white text-[#0a1915] hover:border-[#D4AF37]/35"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {menuItems.length === 0 && !loading && (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-[2rem] border py-24 text-center shadow-xl",
              isDark ? "border-white/8 bg-[#0d1814]" : "border-[#0a2f26]/10 bg-white"
            )}
          >
            <div
              className={cn("mb-6 rounded-full border p-6", isDark ? "border-white/8 bg-[#0a1512]" : "border-[#0a2f26]/10")}
            >
              <ChefHat size={48} className="text-zinc-400" strokeWidth={1} />
            </div>
            <p
              className="mb-2 text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Menyu tayyorlanmoqda
            </p>
            <p className={isDark ? "text-zinc-500" : "text-zinc-600"}>
              Oshpazlarimiz tez orada eng sara taomlarni taqdim etishadi.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.isAvailable}
              onClick={() => item.isAvailable && setSelectedItem(item)}
              className={cn(
                "group relative flex w-full flex-row gap-3 overflow-hidden rounded-[1.5rem] border p-3 text-left transition-all duration-300 sm:gap-4",
                "min-h-[120px] active:scale-[0.99] sm:min-h-[128px]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]",
                isDark
                  ? "border-white/[0.06] bg-[#0d1814] hover:border-[#D4AF37]/30 hover:shadow-xl hover:shadow-[#D4AF37]/8"
                  : "border-[#0a2f26]/10 bg-white hover:border-[#D4AF37]/35 hover:shadow-lg",
                !item.isAvailable && "pointer-events-none opacity-55 grayscale"
              )}
            >
              <div
                className={cn(
                  "relative h-[104px] w-[104px] flex-shrink-0 overflow-hidden rounded-[1.1rem] border sm:h-[118px] sm:w-[118px]",
                  isDark ? "border-white/8 bg-[#0a1512]" : "border-[#0a2f26]/8 bg-[#e8e4dc]"
                )}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 120px, 140px"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-[#D4AF37]/45">
                    <ImageIcon size={28} strokeWidth={1} />
                  </div>
                )}
                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <span className="rounded-md bg-[#D4AF37] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                      Tugagan
                    </span>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 pr-1">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "mb-1 line-clamp-2 text-[16px] font-bold leading-snug tracking-tight transition-colors sm:text-[17px]",
                      isDark ? "text-white group-hover:text-[#e8d5a3]" : "text-[#0a1915] group-hover:text-[#0a2f26]"
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {item.name}
                  </h3>
                  <p
                    className={cn(
                      "line-clamp-2 text-[13px] leading-relaxed",
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    )}
                  >
                    {item.description}
                  </p>
                </div>

                <div className="mt-2 flex items-end justify-between gap-2">
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      isDark ? "text-[#e8d5a3]" : "text-[#0a2f26]"
                    )}
                  >
                    {Number(item.price).toLocaleString()}
                    <span
                      className={cn(
                        "ml-1 text-[10px] font-bold uppercase tracking-widest",
                        isDark ? "text-zinc-500" : "text-zinc-500"
                      )}
                    >
                      so&apos;m
                    </span>
                  </span>
                  {item.isAvailable && (
                    <span
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                        isDark
                          ? "border-[#D4AF37]/35 bg-[#0a1512] text-[#D4AF37] group-hover:bg-[#D4AF37]/15"
                          : "border-[#D4AF37]/40 bg-[#f4f1ea] text-[#0a2f26] group-hover:bg-[#D4AF37]/15"
                      )}
                      aria-hidden
                    >
                      <Eye size={18} strokeWidth={2.2} />
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className={cn("mb-6 rounded-full border p-6", isDark ? "border-white/8 bg-[#0d1814]" : "border-[#0a2f26]/10 bg-white")}
            >
              <Search size={40} className="text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="mb-2 text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Taomlar topilmadi
            </p>
            <p className={cn("mb-8 font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>
              Bu bo‘limda hozircha taomlar yo‘q
            </p>
            <button
              type="button"
              onClick={() => setActiveCategory("Barchasi")}
              className="rounded-full bg-[#D4AF37] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-black shadow-xl shadow-[#D4AF37]/20 transition-transform active:scale-95"
            >
              Barcha menyu
            </button>
          </div>
        )}
      </main>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isDark={isDark} />
    </div>
  );
}

function MenuSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn("min-h-screen font-[family-name:var(--font-dm-sans)]", isDark ? "bg-[#050808]" : "bg-[#f4f1ea]")}>
      <div
        className={cn(
          "h-[32vh] min-h-[220px] animate-pulse rounded-b-[2rem] sm:h-[38vh] sm:rounded-b-[3rem]",
          isDark ? "bg-[#0d1814]" : "bg-[#e8e4dc]"
        )}
      />
      <div className={cn("sticky top-0 border-b px-4 py-3 backdrop-blur-xl", isDark ? "border-white/8 bg-[#050808]/80" : "border-[#0a2f26]/10 bg-[#f4f1ea]/90")}>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={cn("h-10 w-24 flex-shrink-0 rounded-full", isDark ? "bg-zinc-800" : "bg-zinc-300/80")} />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "flex h-[128px] flex-row gap-3 rounded-[1.5rem] border p-3",
                isDark ? "border-white/8 bg-[#0d1814]" : "border-[#0a2f26]/10 bg-white"
              )}
            >
              <Skeleton className={cn("h-[104px] w-[104px] flex-shrink-0 rounded-[1.1rem] sm:h-[118px] sm:w-[118px]", isDark ? "bg-zinc-800" : "bg-zinc-200")} />
              <div className="flex flex-1 flex-col justify-center gap-2 pr-1">
                <Skeleton className={cn("h-4 w-[85%] rounded-md", isDark ? "bg-zinc-800" : "bg-zinc-200")} />
                <Skeleton className={cn("h-3 w-full rounded-sm", isDark ? "bg-zinc-800" : "bg-zinc-200")} />
                <div className="mt-auto flex justify-between">
                  <Skeleton className={cn("h-5 w-20 rounded-md", isDark ? "bg-zinc-800" : "bg-zinc-200")} />
                  <Skeleton className={cn("h-10 w-10 rounded-full", isDark ? "bg-zinc-800" : "bg-zinc-200")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
