"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Star, Clock, Image as ImageIcon, UtensilsCrossed, Info, MapPin } from "lucide-react";

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
          name: slug.toUpperCase(),
          ownerId: "",
          themeColor: "bg-indigo-600"
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
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 bg-slate-50">
      <div className="bg-slate-100 p-6 rounded-full mb-4">
        <UtensilsCrossed size={48} className="text-slate-300" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Restoran topilmadi</h2>
      <p className="text-slate-500">Bunday menyu mavjud emas yoki o'chirilgan.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans selection:bg-indigo-500 selection:text-white">

      {/* 1. PREMIUM HEADER BANNER */}
      <div className="relative h-56 md:h-72 lg:h-80 bg-slate-900 overflow-hidden group rounded-b-[2rem] md:rounded-none shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
        <div className="absolute inset-0 opacity-60 group-hover:scale-105 transition-transform duration-[2000ms] ease-out" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

        {/* Info Container */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-col justify-end pb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg shadow-indigo-500/30">
              Lutsente Premium
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-white drop-shadow-lg">
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-bold text-slate-200">
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-sm">
              <Star size={16} className="text-yellow-400 fill-yellow-400" /> 4.9
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-sm">
              <MapPin size={16} className="text-indigo-300" /> Markaz
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/20 shadow-sm">
              <Clock size={16} /> Ochiq
            </span>
          </div>
        </div>
      </div>

      {/* 2. STICKY CATEGORY NAV (iOS Style) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 snap-x">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex-shrink-0",
                  activeCategory === cat
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 transform scale-105"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 3. MENU ITEMS GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {menuItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300 shadow-sm">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <UtensilsCrossed size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-800 font-bold text-xl mb-2">Menyu yopilayotgan ko'rinadi</p>
            <p className="text-base text-slate-500">Tez orada yangi taomlar qo'shiladi.</p>
          </div>
        )}

        {/* MASONRY/GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group bg-white rounded-[1.5rem] p-3.5 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 border border-slate-100 transition-all duration-300 flex flex-row md:flex-col gap-4 overflow-hidden relative cursor-pointer",
                !item.isAvailable && "opacity-50 grayscale pointer-events-none"
              )}
            >
              {/* Image Box */}
              <div className="relative w-[110px] h-[110px] md:w-full md:h-52 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/50">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 150px, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon size={32} />
                  </div>
                )}

                {/* Not Available Badge */}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                      Tugagan
                    </span>
                  </div>
                )}
              </div>

              {/* Text & Price Area */}
              <div className="flex flex-col justify-between flex-1 py-1 pr-1">
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight mb-1.5 text-[17px] group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 md:line-clamp-3 leading-relaxed mb-4 font-medium">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-100/50">
                    <span className="font-black text-lg text-indigo-700">
                      {Number(item.price).toLocaleString()}
                      <span className="text-xs font-bold text-indigo-500/70 ml-1 tracking-wide uppercase">uzs</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty Search Result */}
        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="bg-white p-6 rounded-full shadow-sm border border-slate-100 mb-6">
              <Search size={40} className="text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-800 mb-2">Bu bo'limda taomlar topilmadi</p>
            <p className="text-sm text-slate-500 mb-6">Boshqa bo'limlarni ko'rib chiqing</p>
            <button
              onClick={() => setActiveCategory("Barchasi")}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-colors"
            >
              Barcha taomlarni ko'rish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// PREMIUM SKELETON
function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Skeleton */}
      <div className="h-56 md:h-72 bg-slate-200 animate-pulse rounded-b-[2rem] md:rounded-none" />

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-20">
        {/* Nav Skeleton */}
        <div className="flex gap-3 overflow-hidden mb-10">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-11 w-28 rounded-full flex-shrink-0 bg-slate-200" />)}
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white p-3.5 rounded-[1.5rem] border border-slate-100 flex flex-row md:flex-col gap-4 h-[140px] md:h-[340px] shadow-sm">
              <Skeleton className="w-[110px] h-[110px] md:w-full md:h-52 rounded-2xl flex-shrink-0 bg-slate-100" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="space-y-3 mt-1">
                  <Skeleton className="h-5 w-3/4 bg-slate-100 rounded-md" />
                  <Skeleton className="h-3 w-full bg-slate-100 rounded-md" />
                  <Skeleton className="h-3 w-2/3 md:hidden bg-slate-100 rounded-md" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-10 w-28 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}