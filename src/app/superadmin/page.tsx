"use client";

import { useEffect, useState, useActionState, useRef } from "react";
import { createRestaurantAction } from "@/app/actions/createRestaurant";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
// BUG FIX: <Toaster> import olib tashlandi — layout.tsx da bitta global Toaster bor
import {
  Trash2,
  Command,
  Plus,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SUPER_ADMIN_EMAIL = "admin@qr-menu-webleaders.uz";

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<
    Array<{ id: string; name?: string; createdAt?: number }>
  >([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const router = useRouter();

  // BUG FIX: formRef orqali formni React tashqarisida reset qilamiz (DOM manipulation emas)
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    createRestaurantAction,
    { success: false, message: "" }
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        router.push("/admin/login");
      } else {
        setIsAuthLoading(false);
        fetchRestaurants();
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!state.message) return;

    if (state.success) {
      toast.success(state.message, {
        style: {
          background: "#fff",
          color: "#000",
          borderRadius: "8px",
          border: "1px solid #E5E5E5",
          fontSize: "14px",
          fontWeight: "500",
        },
      });
      // BUG FIX: form ref orqali reset — getElementById ishlatilmaydi
      formRef.current?.reset();
      fetchRestaurants();
    } else {
      toast.error(state.message, {
        style: {
          background: "#111",
          color: "#fff",
          borderRadius: "8px",
          border: "1px solid #333",
          fontSize: "14px",
        },
      });
    }
  }, [state]);

  const fetchRestaurants = async () => {
    setIsDataLoading(true);
    try {
      const q = query(
        collection(db, "restaurants"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setRestaurants(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as { name?: string; createdAt?: number }),
        }))
      );
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (
      confirm(
        "Diqqat! Bu loyihani o'chirsangiz, barcha ma'lumotlari yo'qoladi. Ishonchingiz komilmi?"
      )
    ) {
      try {
        await deleteDoc(doc(db, "restaurants", slug));
        // Optimistic update
        setRestaurants((prev) => prev.filter((r) => r.id !== slug));
        toast.success("Loyiha butunlay o'chirildi");
      } catch {
        toast.error("O'chirishda xatolik yuz berdi");
        fetchRestaurants(); // Rollback
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#000] text-white">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite] rounded-full border border-white/10 border-t-white" />
          <Command size={32} className="text-white animate-pulse" strokeWidth={1} />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
          Tizimga ulanmoqda
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* BUG FIX: <Toaster> olib tashlandi */}

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-white/[0.02] blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/[0.015] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 md:py-20">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-16 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4 text-zinc-400">
              <div className="bg-white/10 p-1.5 rounded-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Command size={16} className="text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
                Webleaders Core System
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white drop-shadow-sm">
              Boshqaruv markazi
            </h1>
          </div>
          <div className="flex flex-col items-start md:items-end p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">
              Aktiv Loyihalar
            </p>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-black" />
              </span>
              <p className="text-3xl font-light text-white">
                {restaurants.length}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* LEFT: FORM */}
          <div className="lg:col-span-4 order-2 lg:order-1">
            <div className="sticky top-12">
              <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                <ShieldCheck size={18} className="text-zinc-400" />
                <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-300">
                  Yangi Loyiha Qo&apos;shish
                </h2>
              </div>

              {/* BUG FIX: ref qo'shildi — form reset uchun */}
              <form
                ref={formRef}
                action={formAction}
                className="space-y-6"
              >
                <div className="group">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-white">
                    Restoran Nomi
                  </label>
                  <input
                    name="name"
                    required
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/40 focus:bg-[#111] transition-all text-sm shadow-inner"
                    placeholder="Masalan: Rayhon"
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-white">
                    URL Slug (Havola)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-zinc-600 text-sm font-mono select-none">
                      /menu/
                    </span>
                    <input
                      name="slug"
                      required
                      pattern="[a-z0-9-]+"
                      title="Faqat kichik harflar, raqamlar va defis (-)"
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl pl-16 pr-4 py-3.5 focus:outline-none focus:border-white/40 focus:bg-[#111] transition-all text-sm font-mono shadow-inner"
                      placeholder="rayhon"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-white">
                    Boshqaruv Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/40 focus:bg-[#111] transition-all text-sm shadow-inner"
                    placeholder="admin@rayhon.uz"
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-white">
                    Kirish Paroli
                  </label>
                  <input
                    name="password"
                    type="text"
                    required
                    minLength={6}
                    autoComplete="off"
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/40 focus:bg-[#111] transition-all text-sm shadow-inner"
                    placeholder="Kamida 6 ta belgi"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="group relative w-full mt-4 bg-white text-black hover:bg-zinc-200 font-bold py-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-3 disabled:opacity-50 overflow-hidden active:scale-[0.98]"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />{" "}
                      Yaratilmoqda...
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} /> Loyihani Yaratish
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: LIST */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
              <Search size={18} className="text-zinc-400" />
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-300">
                Tizimdagi Loyihalar
              </h2>
            </div>

            {isDataLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 w-full bg-white/5 rounded-2xl animate-pulse border border-white/5"
                  />
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                <Command size={40} className="text-zinc-600 mb-4" />
                <p className="text-zinc-500 font-medium">
                  Hozircha tizimda loyihalar yo&apos;q
                </p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-2">
                  Yangi loyiha qo&apos;shing
                </p>
              </div>
            ) : (
              <>
                {/* MOBIL: KARTOCHKA */}
                <div className="md:hidden space-y-4">
                  {restaurants.map((res) => (
                    <div
                      key={res.id}
                      className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-1">
                            {res.name || res.id}
                          </h3>
                          <p className="text-xs text-zinc-500 font-mono">
                            ID: {res.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                            Faol
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <Link
                          href={`/menu/${res.id}`}
                          target="_blank"
                          className="flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                        >
                          Saytni ko&apos;rish <ExternalLink size={12} />
                        </Link>
                        <button
                          onClick={() => handleDelete(res.id)}
                          className="flex items-center gap-2 text-xs font-medium text-red-500 hover:text-red-400"
                        >
                          O&apos;chirish <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP: JADVAL */}
                <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#111]">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                          Loyiha Nomi
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                          Holati
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                          Havola
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 text-right">
                          Boshqaruv
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {restaurants.map((res) => (
                        <tr
                          key={res.id}
                          className="group transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-5">
                            <div className="font-medium text-white text-sm">
                              {res.name || "—"}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-1">
                              {res.id}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                                Aktiv
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Link
                              href={`/menu/${res.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg bg-black hover:bg-white/5"
                            >
                              Tashrif <ArrowRight size={12} />
                            </Link>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => handleDelete(res.id)}
                              className="text-zinc-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                              title="Loyihani o'chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}