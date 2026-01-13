"use client";

import { useEffect, useState, use } from "react"; // 1. "use" ni import qiling
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";

// 2. Props tipini Promise deb belgilaymiz
export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  // 3. Parametrni "unwrap" qilamiz
  const { slug } = use(params);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // "slug" o'zgaruvchisini to'g'ridan-to'g'ri ishlatamiz (params.slug EMAS)
        const itemsRef = collection(db, "restaurants", slug, "menuItems");
        const itemsSnapshot = await getDocs(query(itemsRef, orderBy("createdAt", "desc")));

        setRestaurant({
          id: slug,
          name: slug.toUpperCase(),
          ownerId: "",
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
  }, [slug]); // 4. Dependency arrayda ham faqat "slug" bo'ladi

  // ... (qolgan kod o'zgarishsiz qoladi) ...

  const categories = ["All", ...Array.from(new Set(menuItems.map((item) => item.category)))];

  const filteredItems = activeCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  if (loading) return <MenuSkeleton />;
  if (!restaurant) return <div className="p-10 text-center">Restaurant not found.</div>;

  return (
    <div className="min-h-screen bg-neutral-50 pb-10">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {restaurant.name}
          </h1>
        </div>

        <nav className="max-w-md mx-auto px-4 pb-2 overflow-x-auto no-scrollbar flex gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeCategory === cat
                  ? "bg-black text-white shadow-md"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {cat}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {filteredItems.map((item) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={item.id}
            className={cn(
              "bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex gap-4",
              !item.isAvailable && "opacity-60 grayscale"
            )}
          >
            <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">No Img</div>
              )}
            </div>

            <div className="flex flex-col justify-between flex-1">
              <div>
                <h3 className="font-semibold text-neutral-900">{item.name}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{item.description}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-medium text-neutral-900">{formatCurrency(item.price)}</span>
                {!item.isAvailable && <span className="text-xs text-red-500 font-medium">Sold Out</span>}
              </div>
            </div>
          </motion.div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-neutral-400">No items in this category.</div>
        )}
      </main>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Skeleton className="h-12 w-full mb-6" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-24 h-24 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}