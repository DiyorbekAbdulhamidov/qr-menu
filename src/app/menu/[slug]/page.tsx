"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Star, Image as ImageIcon, UtensilsCrossed, ChefHat, Plus } from "lucide-react";

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Barchasi");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef));
        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));

        // Eng yangilari tepada tursin
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setRestaurant({
          id: slug,
          name: "AMIR RESTAURANT", // Ularning haqiqiy nomi
          ownerId: "",
          themeColor: "bg-[#080808]" // Deep Black
        });

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

  const filteredItems = activeCategory === "Barchasi" || activeCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  if (loading) return <MenuSkeleton />;

  if (!restaurant) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-zinc-400 bg-[#FAFAFA]">
      <div className="bg-white p-8 rounded-full shadow-2xl shadow-zinc-200/50 mb-6 border border-zinc-100">
        <UtensilsCrossed size={56} className="text-zinc-300" strokeWidth={1} />
      </div>
      <h2 className="text-3xl font-black text-zinc-800 mb-2 tracking-tight">Menyu topilmadi</h2>
      <p className="text-zinc-500 font-medium">Bunday restoran mavjud emas.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] pb-28 font-sans selection:bg-[#D4AF37] selection:text-white">

      {/* 1. LUXURY HERO BANNER (Ularning rasmiga mos) */}
      <div className="relative h-[35vh] md:h-[45vh] bg-zinc-950 overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-2xl shadow-zinc-900/10">
        {/* Deep Black-to-Transparency Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent z-10" />
        {/* VIZUAL RASP: Uchrashuvdan keyin ularning original rasmi bilan almashtirasiz */}
        <div className="absolute inset-0 opacity-70 group-hover:scale-105 transition-transform duration-[3000ms] ease-out"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        </div>

        {/* Info Container */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col justify-end pb-10">
          <div className="flex items-center gap-3 mb-4">
            {/* Oltin Rangli Premium Nishon */}
            <span className="text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm backdrop-blur-md">
              Amir Signature
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5 text-white drop-shadow-2xl">
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-300">
            {/* Oltin Yulduzlar */}
            <span className="flex items-center gap-1.5 font-medium">
              <Star size={16} className="text-[#D4AF37] fill-[#D4AF37]" /> 4.9 <span className="text-zinc-500 ml-1">/ 5.0</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
              <ChefHat size={16} className="text-[#D4AF37]" /> Milliy & Yevropa
            </span>
          </div>
        </div>
      </div>

      {/* 2. FLOATING CATEGORY NAV (Ultra-Glassmorphism iOS style) */}
      <div className="sticky top-0 z-40 bg-[#080808]/70 backdrop-blur-2xl border-b border-white/5 pt-4 pb-3 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x items-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-[15px] font-bold transition-all duration-300 flex-shrink-0 border",
                  activeCategory === cat
                    ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 transform scale-[1.02]" // Oltin Aktiv
                    : "bg-[#1A1F1A] text-zinc-300 border-white/5 hover:bg-[#1A2F1A] hover:text-white" // To'q Yashil Noaktiv
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 3. MENU ITEMS GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {menuItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-[#101010] rounded-[3rem] border border-white/5 shadow-2xl shadow-black/10">
            <div className="bg-[#1A1F1A] p-6 rounded-full mb-6 border border-white/5">
              <ChefHat size={48} className="text-zinc-300" strokeWidth={1} />
            </div>
            <p className="text-white font-black text-2xl mb-3 tracking-tight">Menyu tayyorlanmoqda</p>
            <p className="text-zinc-500 font-medium max-w-xs mx-auto">Oshpazlarimiz tez orada eng sara taomlarni taqdim etishadi.</p>
          </div>
        )}

        {/* LUXURY APP-LIKE LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group bg-[#101010] rounded-[1.8rem] p-3 shadow-sm hover:shadow-2xl hover:shadow-[#D4AF37]/10 hover:border-[#D4AF37]/30 border border-white/5 transition-all duration-500 flex flex-row gap-4 overflow-hidden relative active:scale-[0.98]",
                !item.isAvailable && "opacity-60 grayscale pointer-events-none"
              )}
            >
              {/* Image Box */}
              <div className="relative w-[110px] h-[110px] md:w-[130px] md:h-[130px] flex-shrink-0 rounded-[1.2rem] overflow-hidden bg-[#1A1F1A] border border-white/5">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-[2000ms] ease-out"
                    sizes="(max-width: 768px) 150px, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 bg-[#0D1C0D]">
                    <ImageIcon size={28} strokeWidth={1} />
                  </div>
                )}

                {/* Not Available Badge (Oltin urg'u) */}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-[#080808]/80 backdrop-blur-md flex items-center justify-center">
                    <span className="bg-[#D4AF37] text-black px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                      Tugagan
                    </span>
                  </div>
                )}
              </div>

              {/* Text & Price Area */}
              <div className="flex flex-col justify-between flex-1 py-1 pr-1">
                <div>
                  <h3 className="font-black text-white leading-tight mb-1.5 text-[17px] tracking-tight group-hover:text-[#D4AF37] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[13px] text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-end justify-between mt-3">
                  {/* Narx: Oltin rangli UZS matni */}
                  <span className="font-black text-lg text-white tracking-tight">
                    {Number(item.price).toLocaleString()}
                    <span className="text-[10px] font-bold text-zinc-400 ml-1 tracking-widest uppercase">uzs</span>
                  </span>

                  {/* Luxury Add Button (Visual for premium feel) */}
                  {item.isAvailable && (
                    <button className="w-8 h-8 rounded-full bg-[#1A1F1A] border border-white/5 flex items-center justify-center text-zinc-300 group-hover:bg-[#D4AF37] group-hover:text-black group-hover:border-[#D4AF37] transition-colors">
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty Search Result */}
        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <div className="bg-[#101010] p-6 rounded-full shadow-sm border border-white/5 mb-6">
              <Search size={40} className="text-zinc-300" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-black text-white mb-2 tracking-tight">Taomlar topilmadi</p>
            <p className="text-zinc-500 font-medium mb-8">Bu bo'limda hozircha taomlar yo'q</p>
            <button
              onClick={() => setActiveCategory("Barchasi")}
              className="bg-[#D4AF37] text-black px-8 py-4 rounded-full font-black hover:bg-white shadow-xl shadow-[#D4AF37]/10 transition-all active:scale-95 tracking-wide text-sm uppercase"
            >
              Barcha menyu
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ULTRA-LUXURY SKELETON
function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero Skeleton */}
      <div className="h-[35vh] md:h-[45vh] bg-[#101010] animate-pulse rounded-b-[2.5rem] md:rounded-b-[4rem]" />

      {/* Floating Nav Skeleton */}
      <div className="sticky top-0 z-40 bg-[#080808]/70 backdrop-blur-2xl border-b border-white/5 pt-4 pb-3">
        <div className="max-w-7xl mx-auto px-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0 bg-zinc-800" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 pb-20">
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-[#101010] p-3 rounded-[1.8rem] border border-white/5 flex flex-row gap-4 h-[134px] shadow-sm">
              <Skeleton className="w-[110px] h-[110px] rounded-[1.2rem] flex-shrink-0 bg-zinc-800" />
              <div className="flex-1 flex flex-col justify-center py-2 pr-2">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-5/6 bg-zinc-800 rounded-md" />
                  <Skeleton className="h-3 w-full bg-zinc-800 rounded-sm" />
                </div>
                <div className="mt-auto flex justify-between items-end">
                  <Skeleton className="h-5 w-20 rounded-md bg-zinc-800" />
                  <Skeleton className="h-8 w-8 rounded-full bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}