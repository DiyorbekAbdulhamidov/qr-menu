"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Star, Clock, Image as ImageIcon, UtensilsCrossed, Info } from "lucide-react";

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
          themeColor: "bg-orange-500"
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
    <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400 bg-neutral-50">
      <UtensilsCrossed size={48} className="mb-4 opacity-20" />
      <p>Restoran topilmadi</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans">

      {/* 1. Header Banner (Katta ekranlarda ham chiroyli turishi uchun) */}
      <div className="relative h-48 md:h-64 lg:h-80 bg-neutral-900 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />
        <div className="absolute inset-0 opacity-60 group-hover:scale-105 transition-transform duration-1000" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

        {/* Container: Max-width 7xl (Laptop uchun) */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-6">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-white drop-shadow-lg">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm md:text-base font-medium text-neutral-200">
            <span className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Star size={16} className="text-yellow-400 fill-yellow-400" /> 4.8
            </span>
            {/* <span className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Clock size={16} className="text-blue-300" /> 15-20 min
            </span> */}
            <span className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Info size={16} className="text-green-300" /> Ochiq
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sticky Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md shadow-sm border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-shrink-0",
                  activeCategory === cat
                    ? "bg-black text-white shadow-lg transform scale-105"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 3. Main Grid (RESPONSIVE QISM SHU YERDA) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {menuItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-300">
            <p className="text-neutral-500 font-medium text-lg">Menyu bo'sh</p>
            <p className="text-sm text-neutral-400 mt-2">Admin paneldan taom qo'shing.</p>
          </div>
        )}

        {/* GRID TIZIMI:
            grid-cols-1 -> Telefonda 1 ta ustun
            md:grid-cols-2 -> Planshetda 2 ta ustun
            lg:grid-cols-3 -> Kichik laptopda 3 ta ustun
            xl:grid-cols-4 -> Katta monitorda 4 ta ustun
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl border border-neutral-100 transition-all duration-300 flex flex-row md:flex-col gap-4 overflow-hidden relative",
                !item.isAvailable && "opacity-60 grayscale pointer-events-none"
              )}
            >
              {/* Rasm: Telefonda kichik (row), Katta ekranda katta (column) */}
              <div className="relative w-28 h-28 md:w-full md:h-56 flex-shrink-0 rounded-2xl overflow-hidden bg-neutral-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 768px) 150px, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 bg-neutral-50">
                    <ImageIcon size={32} />
                  </div>
                )}

                {/* Status Badge (faqat rasm ustida chiroyli turishi uchun) */}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Vaqtincha yo'q
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <h3 className="font-bold text-neutral-900 leading-tight mb-1.5 text-lg group-hover:text-orange-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-neutral-500 line-clamp-2 md:line-clamp-3 leading-relaxed mb-3">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">Narxi</span>
                    <span className="font-bold text-xl text-neutral-900">
                      {Number(item.price).toLocaleString()}
                      <span className="text-sm font-normal text-neutral-500 ml-1">so'm</span>
                    </span>
                  </div>

                  {/* <button className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-orange-600 hover:scale-110 transition-all shadow-lg shadow-neutral-200 active:scale-95">
                    <span className="text-2xl font-light leading-none pb-1">+</span>
                  </button> */}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-neutral-400">
            <Search size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Bu bo'limda taomlar topilmadi</p>
            <button onClick={() => setActiveCategory("Barchasi")} className="mt-4 text-orange-600 hover:underline">
              Barcha taomlarni ko'rish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="h-48 md:h-64 bg-neutral-200 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-20">
        {/* Nav Skeleton */}
        <div className="flex gap-3 overflow-hidden mb-8">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-32 rounded-xl flex-shrink-0" />)}
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white p-3 rounded-3xl border border-neutral-100 flex flex-row md:flex-col gap-4 h-32 md:h-[340px]">
              <Skeleton className="w-28 h-28 md:w-full md:h-48 rounded-2xl flex-shrink-0" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 md:hidden" />
                </div>
                <div className="flex justify-between items-end mt-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}