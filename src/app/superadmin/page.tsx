"use client";

import { useEffect, useState, useActionState } from "react"; // <-- O'ZGARISH: useActionState react'dan olinadi
import { createRestaurantAction } from "@/app/actions/createRestaurant";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { Trash2, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

const SUPER_ADMIN_EMAIL = "admin@webleaders.uz";

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const router = useRouter();

  // O'ZGARISH: useFormState -> useActionState
  // Uchinchi parametr (isPending) ham qaytadi, agar kerak bo'lsa loading uchun ishlatsa bo'ladi
  const [state, formAction, isPending] = useActionState(createRestaurantAction, { success: false, message: "" });

  useEffect(() => {
    // 1. Super Admin tekshiruvi
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        // toast.error("Ruxsat yo'q!"); // Login qilinmagan bo'lsa xato bermaslik uchun commentga olish mumkin
        router.push("/admin/login");
      }
    });

    fetchRestaurants();
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        fetchRestaurants();
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const fetchRestaurants = async () => {
    try {
      const q = query(collection(db, "restaurants"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleDelete = async (slug: string) => {
    if (confirm("Rostdan ham o'chirmoqchimisiz?")) {
      await deleteDoc(doc(db, "restaurants", slug));
      fetchRestaurants();
      toast.success("Restoran o'chirildi");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-black text-white rounded-xl">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <p className="text-neutral-500">Barcha restoranlarni boshqarish markazi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chap taraf: Yangi qo'shish formasi */}
          <div className="bg-white p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4">Yangi Restoran Qo'shish</h2>
            <form action={formAction} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Restoran Nomi</label>
                <input name="name" required className="w-full p-2 border rounded-lg mt-1" placeholder="Rayhon Milliy Taomlar" />
              </div>
              <div>
                <label className="text-sm font-medium">Slug (URL uchun)</label>
                <input name="slug" required className="w-full p-2 border rounded-lg mt-1" placeholder="rayhon" />
                <p className="text-xs text-neutral-400 mt-1">Link: .../menu/rayhon bo'ladi</p>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Email</label>
                <input name="email" type="email" required className="w-full p-2 border rounded-lg mt-1" placeholder="client@gmail.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Parol</label>
                <input name="password" type="text" required className="w-full p-2 border rounded-lg mt-1" placeholder="parol123" />
              </div>
              {/* isLoading o'rniga isPending ishlatish mumkin */}
              <Button type="submit" className="w-full mt-2" isLoading={isPending}>
                {isPending ? "Yaratilmoqda..." : "Yaratish"}
              </Button>
            </form>
          </div>

          {/* O'ng taraf: Ro'yxat */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Mavjud Restoranlar ({restaurants.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-sm text-neutral-500">
                    <th className="py-2">Nomi / Slug</th>
                    <th className="py-2">Link</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((res) => (
                    <tr key={res.id} className="border-b last:border-0 hover:bg-neutral-50">
                      <td className="py-3">
                        <div className="font-medium">{res.name}</div>
                        <div className="text-xs text-neutral-400">ID: {res.id}</div>
                      </td>
                      <td className="py-3">
                        <Link href={`/menu/${res.id}`} target="_blank" className="text-blue-600 flex items-center gap-1 text-sm hover:underline">
                          Ko'rish <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">Active</span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDelete(res.id)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {restaurants.length === 0 && <p className="text-center py-4 text-neutral-400">Hozircha restoranlar yo'q</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}