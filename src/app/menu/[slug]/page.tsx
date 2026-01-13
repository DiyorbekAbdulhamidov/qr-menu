"use client";

import { useEffect, useState, use } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Clock, Star, UtensilsCrossed, Image as ImageIcon } from "lucide-react";

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef, orderBy("createdAt", "desc")));

        // Bu yerda kelajakda restoran infosini DB dan olishingiz mumkin
        // Hozircha statik ma'lumotlar bilan to'ldiramiz
        setRestaurant({
          id: slug,
          name: slug.toUpperCase(),
          ownerId: "",
          // Logotip bo'lmasa shu rang chiqadi
          themeColor: "bg-orange-500"
        });

        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const categories = ["All", ...Array.from(new Set(menuItems.map((item) => item.category)))];

  const filteredItems = activeCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  if (loading) return <MenuSkeleton />;
  if (!restaurant) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400">
      <UtensilsCrossed size={48} className="mb-4 opacity-20" />
      <p>Restoran topilmadi</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans">

      {/* 1. Hero / Header Section */}
      <div className="relative h-48 bg-neutral-900 overflow-hidden">
        {/* Orqa fon rasmi (yoki gradient) */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-neutral-800 opacity-90 z-0" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

        <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-6 text-white">
          <h1 className="text-3xl font-bold tracking-tight mb-1">{restaurant.name}</h1>
          <div className="flex items-center gap-3 text-sm text-neutral-300">
            <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400" /> 4.8</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={14} /> 15-20 min</span>
            <span>•</span>
            <span className="flex items-center gap-1">$$$</span>
          </div>
        </div>
      </div>

      {/* 2. Sticky Category Nav */}
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-neutral-100">
        <nav className="max-w-md mx-auto px-4 py-3 overflow-x-auto no-scrollbar flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                activeCategory === cat
                  ? "bg-black text-white shadow-md transform scale-105"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              )}
            >
              {cat}
            </button>
          ))}
        </nav>
      </header>

      {/* 3. Menu Grid */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              key={item.id}
              className={cn(
                "group bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 flex gap-4 overflow-hidden relative active:scale-[0.98] transition-transform",
                !item.isAvailable && "opacity-60 grayscale pointer-events-none"
              )}
            >
              {/* Image Section */}
              <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 bg-neutral-50">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-neutral-900 leading-tight mb-1">{item.name}</h3>
                    {!item.isAvailable && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Tugagan</span>}
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-medium">Narxi</span>
                    <span className="font-bold text-lg text-neutral-900">{Number(item.price).toLocaleString()} <span className="text-xs font-normal">so'm</span></span>
                  </div>

                  {/* Add Button (Visual) */}
                  <button className="bg-neutral-900 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black transition-colors shadow-lg shadow-neutral-200">
                    <span className="text-lg font-light leading-none pb-0.5">+</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Search size={48} className="mb-2 opacity-20" />
            <p>Bu bo'limda taomlar yo'q</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Skeleton Loader (Yuklanish effekti)
function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="h-48 bg-neutral-200 animate-pulse" />
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-xl flex-shrink-0" />)}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 bg-white p-3 rounded-2xl border border-neutral-100">
            <Skeleton className="w-28 h-28 rounded-xl" />
            <div className="flex-1 space-y-2 py-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
              <div className="pt-2 flex justify-between items-end">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}