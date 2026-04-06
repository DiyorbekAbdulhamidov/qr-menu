"use client";

import { useEffect, useState, use, useRef } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, ChefHat, Moon, Sun, Monitor, MapPin, Phone, Instagram } from "lucide-react";
import { ItemDetailModal } from "@/components/menu/ItemDetailModal";
import { useAppTheme } from "@/lib/useAppTheme";

export default function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { mode, isDark, setThemeMode } = useAppTheme();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // BUG FIX: theme menu container ref — click-outside aniqlash uchun
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // BUG FIX: body background — cleanup bilan (navigatsiyada qolmasligi uchun)
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDark ? "#050505" : "#FAFAFA";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [isDark]);

  // BUG FIX: theme menu — tashqariga bosish va Escape klavishi bilan yopiladi
  useEffect(() => {
    if (!themeMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setThemeMenuOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(e.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // setTimeout — opening click ni e'tiborsiz qoldirmaslik uchun
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [themeMenuOpen]);

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
        const items = itemsSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as MenuItem)
        );
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMenuItems(items);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const categories = [
    "Barchasi",
    ...Array.from(new Set(menuItems.map((item) => item.category))),
  ];
  const filteredItems =
    activeCategory === "Barchasi"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  if (loading) return <MenuSkeleton isDark={isDark} />;

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#D4AF37] flex items-center justify-center text-xl tracking-widest font-bold">
        Topilmadi
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen pb-20 font-sans transition-colors duration-300 overflow-x-hidden",
        isDark ? "bg-[#050505] text-white" : "bg-[#FAFAFA] text-[#111]"
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          "w-full pt-8 pb-4 flex flex-col items-center justify-center relative transition-colors",
          isDark
            ? "bg-[#0A0A0A] border-b border-white/5"
            : "bg-white border-b border-black/5 shadow-sm"
        )}
      >
        {/* BUG FIX: ref qo'shildi — click-outside uchun */}
        <div
          ref={themeMenuRef}
          className="absolute top-4 right-4 sm:top-6 sm:right-8 lg:right-12 z-50"
        >
          <button
            onClick={() => setThemeMenuOpen((prev) => !prev)}
            aria-label="Mavzuni o'zgartirish"
            aria-expanded={themeMenuOpen}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95",
              isDark
                ? "border-[#D4AF37]/30 text-[#D4AF37] bg-black/50 hover:bg-[#D4AF37]/10"
                : "border-black/10 text-black bg-white/50 hover:bg-black/5"
            )}
          >
            {mode === "system" ? (
              <Monitor size={18} />
            ) : isDark ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}
          </button>

          {themeMenuOpen && (
            <div
              className={cn(
                "absolute right-0 mt-3 w-40 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 origin-top-right",
                isDark
                  ? "bg-[#111]/95 border-white/10"
                  : "bg-white/95 border-black/10"
              )}
            >
              <button
                onClick={() => {
                  setThemeMode("light");
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all",
                  isDark
                    ? "text-zinc-400 hover:bg-white/10 hover:text-white"
                    : "text-zinc-600 hover:bg-black/5 hover:text-black"
                )}
              >
                <Sun size={16} /> Kunduzgi
              </button>
              <button
                onClick={() => {
                  setThemeMode("dark");
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all",
                  isDark
                    ? "text-zinc-400 hover:bg-white/10 hover:text-white"
                    : "text-zinc-600 hover:bg-black/5 hover:text-black"
                )}
              >
                <Moon size={16} /> Tungi
              </button>
              <button
                onClick={() => {
                  setThemeMode("system");
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all",
                  isDark
                    ? "text-zinc-400 hover:bg-white/10 hover:text-white"
                    : "text-zinc-600 hover:bg-black/5 hover:text-black"
                )}
              >
                <Monitor size={16} /> Sistema
              </button>
            </div>
          )}
        </div>

        {/* LOGO & TITLE */}
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 mb-3 rounded-full p-[2px] border-2 border-[#D4AF37] transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]">
          <div
            className={cn(
              "w-full h-full rounded-full overflow-hidden flex items-center justify-center relative",
              isDark ? "bg-[#050505]" : "bg-white"
            )}
          >
            {restaurant.logoUrl ? (
              // BUG FIX: unoptimized olib tashlandi — remotePatterns configuratsiya qilingan
              <Image
                src={restaurant.logoUrl}
                alt="Logo"
                fill
                priority
                sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, 112px"
                className="object-cover"
              />
            ) : (
              <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-[#D4AF37]" />
            )}
          </div>
        </div>

        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-[0.2em] text-center"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {restaurant.name}
        </h1>

        <div className="flex items-center gap-6 mt-4">
          <a
            href="tel:"
            className="text-[#D4AF37] hover:text-white transition-colors active:scale-90"
            aria-label="Telefon"
          >
            <Phone size={18} />
          </a>
          <a
            href="#"
            className="text-[#D4AF37] hover:text-white transition-colors active:scale-90"
            aria-label="Manzil"
          >
            <MapPin size={18} />
          </a>
          <a
            href="#"
            className="text-[#D4AF37] hover:text-white transition-colors active:scale-90"
            aria-label="Instagram"
          >
            <Instagram size={18} />
          </a>
        </div>
      </div>

      {/* KATEGORIYALAR */}
      <div
        className={cn(
          "sticky top-0 z-40 py-4 shadow-sm backdrop-blur-xl transition-all",
          isDark
            ? "bg-[#050505]/95 border-b border-white/5"
            : "bg-[#FAFAFA]/95 border-b border-black/5"
        )}
      >
        <div className="max-w-7xl mx-auto w-full px-2 lg:px-8">
          <nav className="flex items-start gap-3 sm:gap-5 overflow-x-auto no-scrollbar px-2 pb-2 mx-auto w-max min-w-full lg:min-w-0 lg:justify-center lg:flex-wrap">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex flex-col items-center flex-shrink-0 w-16 sm:w-20 gap-2 outline-none group"
                >
                  <div
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-[2px] transition-all p-[2px]",
                      isActive
                        ? "border-[#D4AF37]"
                        : isDark
                          ? "border-zinc-800 hover:border-[#D4AF37]/50"
                          : "border-zinc-300 hover:border-[#D4AF37]/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full h-full rounded-full flex items-center justify-center transition-colors",
                        isActive
                          ? "bg-[#D4AF37] text-black"
                          : isDark
                            ? "bg-[#111] text-[#D4AF37]"
                            : "bg-white text-[#B38F24]"
                      )}
                    >
                      <span className="text-xs sm:text-sm font-bold">
                        {cat.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] font-bold text-center leading-tight transition-colors w-full truncate px-1",
                      isActive
                        ? isDark
                          ? "text-white"
                          : "text-black"
                        : "text-zinc-500"
                    )}
                  >
                    {cat}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* KARTALAR GRIDI */}
      <main className="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              disabled={!item.isAvailable}
              onClick={() => item.isAvailable && setSelectedItem(item)}
              className={cn(
                "group flex flex-col rounded-2xl overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]",
                isDark
                  ? "bg-[#111] border border-white/5 hover:border-[#D4AF37]/30"
                  : "bg-white border border-black/5 shadow-md hover:border-[#D4AF37]/30",
                !item.isAvailable &&
                "opacity-40 grayscale pointer-events-none hover:translate-y-0"
              )}
            >
              <div className="relative w-full aspect-[4/5] bg-zinc-900 overflow-hidden">
                {item.imageUrl ? (
                  // BUG FIX: unoptimized olib tashlandi — birinchi 4 ta karta priority
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    priority={index < 4}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    className="object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/30 bg-[#0A0A0A]">
                    <ChefHat size={32} />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 z-10 pointer-events-none" />

                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                    <span className="bg-[#D4AF37] text-black px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded">
                      Tugagan
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 p-3 sm:p-4 z-20 relative">
                <h3
                  className={cn(
                    "text-[14px] sm:text-[16px] font-bold leading-tight mb-1.5 line-clamp-2",
                    isDark ? "text-white" : "text-[#111]"
                  )}
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {item.name}
                </h3>

                <p
                  className={cn(
                    "text-[10px] sm:text-[11px] line-clamp-2 leading-snug mb-3 flex-1",
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  )}
                >
                  {item.description ||
                    "Taom tarkibi va retsepti haqida ma'lumot."}
                </p>

                <div
                  className={cn(
                    "mt-auto pt-3 border-t",
                    isDark ? "border-[#D4AF37]/15" : "border-[#D4AF37]/15"
                  )}
                >
                  <span
                    className={cn(
                      "text-[15px] sm:text-[18px] font-black tracking-tighter",
                      isDark ? "text-[#D4AF37]" : "text-[#B38F24]"
                    )}
                  >
                    {Number(item.price).toLocaleString()}{" "}
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest opacity-80">
                      UZS
                    </span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="py-32 text-center">
            <Search size={40} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Hech narsa topilmadi
            </p>
          </div>
        )}
      </main>

      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        isDark={isDark}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function MenuSkeleton({ isDark }: { isDark: boolean }) {
  const pulseBg = isDark ? "bg-[#1a1a1a]" : "bg-zinc-200";
  const lineBg = isDark ? "bg-[#222]" : "bg-zinc-300";
  const baseBg = isDark ? "bg-[#111]" : "bg-white";

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden",
        isDark ? "bg-[#050505]" : "bg-[#FAFAFA]"
      )}
    >
      <div className="pt-8 pb-4 flex flex-col items-center">
        <Skeleton
          className={cn(
            "w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full mb-3",
            pulseBg
          )}
        />
        <Skeleton className={cn("w-48 h-6 sm:h-8 rounded-md mb-4", pulseBg)} />
        <div className="flex gap-6">
          <Skeleton className={cn("w-5 h-5 rounded", pulseBg)} />
          <Skeleton className={cn("w-5 h-5 rounded", pulseBg)} />
          <Skeleton className={cn("w-5 h-5 rounded", pulseBg)} />
        </div>
      </div>

      <div className="flex lg:justify-center gap-4 px-4 py-4 overflow-hidden max-w-7xl mx-auto w-full">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                pulseBg
              )}
            />
            <Skeleton className={cn("w-10 h-2 rounded-sm", pulseBg)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6 px-4 pt-6 max-w-7xl mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl overflow-hidden flex flex-col border",
              baseBg,
              isDark ? "border-white/5" : "border-black/5"
            )}
          >
            <Skeleton
              className={cn("w-full aspect-[4/5] rounded-none", pulseBg)}
            />
            <div className="flex flex-col p-3 sm:p-4 flex-1">
              <Skeleton className={cn("w-full h-4 mb-1.5 rounded", lineBg)} />
              <Skeleton className={cn("w-2/3 h-4 mb-4 rounded", lineBg)} />
              <Skeleton className={cn("w-full h-2 mb-2 rounded", lineBg)} />
              <Skeleton className={cn("w-4/5 h-2 mb-4 rounded", lineBg)} />
              <div
                className={cn(
                  "mt-auto pt-3 border-t",
                  isDark ? "border-white/10" : "border-black/5"
                )}
              >
                <Skeleton className={cn("w-1/2 h-5 sm:h-6 rounded", lineBg)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}