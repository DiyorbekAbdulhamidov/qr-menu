"use client";

import { useEffect, useState, useActionState } from "react";
import { createRestaurantAction } from "@/app/actions/createRestaurant";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Trash2, ExternalLink, Command, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

const SUPER_ADMIN_EMAIL = "admin@qr-menu-webleaders.uz";

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(createRestaurantAction, { success: false, message: "" });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        router.push("/admin/login");
      }
    });

    fetchRestaurants();
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message, {
          style: { background: '#fff', color: '#000', borderRadius: '8px', border: '1px solid #E5E5E5' }
        });
        fetchRestaurants();
      } else {
        toast.error(state.message, {
          style: { background: '#000', color: '#fff', borderRadius: '8px', border: '1px solid #333' }
        });
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
    if (confirm("Bu loyihani o'chirishga ishonchingiz komilmi?")) {
      await deleteDoc(doc(db, "restaurants", slug));
      fetchRestaurants();
      toast.success("O'chirildi");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12 border-b border-[#222] pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4 text-[#888]">
              <Command size={20} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Webleaders System</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight">
              Boshqaruv paneli
            </h1>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[#888] text-sm mb-1">Jami loyihalar</p>
            <p className="text-3xl font-light">{restaurants.length}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT: FORM (Minimalist) */}
          <div className="lg:col-span-4">
            <div className="sticky top-12">
              <h2 className="text-lg font-medium mb-6">Yangi loyiha qo'shish</h2>

              <form action={formAction} className="space-y-5">
                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-wider mb-2">Restoran Nomi</label>
                  <input
                    name="name"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm"
                    placeholder="Rayhon"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-wider mb-2">URL Slug</label>
                  <input
                    name="slug"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm font-mono"
                    placeholder="rayhon"
                  />
                  <p className="text-[11px] text-[#666] mt-2">menu.webleaders.uz/slug</p>
                </div>

                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-wider mb-2">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm"
                    placeholder="admin@rayhon.uz"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-wider mb-2">Parol</label>
                  <input
                    name="password"
                    type="text"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm"
                    placeholder="Parolni kiriting"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-6 bg-white text-black hover:bg-[#E5E5E5] font-medium py-3.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isPending ? "Yaratilmoqda..." : (
                    <>
                      Yaratish <Plus size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: TABLE (Minimalist) */}
          <div className="lg:col-span-8">
            <h2 className="text-lg font-medium mb-6">Faol loyihalar</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-4 text-xs font-normal text-[#888] uppercase tracking-wider border-b border-[#222]">Loyiha</th>
                    <th className="pb-4 text-xs font-normal text-[#888] uppercase tracking-wider border-b border-[#222]">Status</th>
                    <th className="pb-4 text-xs font-normal text-[#888] uppercase tracking-wider border-b border-[#222]">Havola</th>
                    <th className="pb-4 text-xs font-normal text-[#888] uppercase tracking-wider border-b border-[#222] text-right">Boshqaruv</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((res) => (
                    <tr key={res.id} className="group">
                      <td className="py-5 border-b border-[#111] group-hover:bg-[#0A0A0A] transition-colors pl-2 rounded-l-lg">
                        <div className="font-medium text-white">{res.name}</div>
                        <div className="text-xs text-[#666] font-mono mt-1">{res.id}</div>
                      </td>
                      <td className="py-5 border-b border-[#111] group-hover:bg-[#0A0A0A] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                          <span className="text-xs text-[#888]">Faol</span>
                        </div>
                      </td>
                      <td className="py-5 border-b border-[#111] group-hover:bg-[#0A0A0A] transition-colors">
                        <Link href={`/menu/${res.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors">
                          Ochish <ArrowRight size={14} />
                        </Link>
                      </td>
                      <td className="py-5 border-b border-[#111] group-hover:bg-[#0A0A0A] transition-colors text-right pr-2 rounded-r-lg">
                        <button
                          onClick={() => handleDelete(res.id)}
                          className="text-[#666] hover:text-white transition-colors p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {restaurants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#666] text-sm">
                        Hech qanday loyiha topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}