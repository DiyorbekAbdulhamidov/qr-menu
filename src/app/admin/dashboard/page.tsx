"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Plus, Trash2, Eye, EyeOff, Download, ImagePlus, LogOut, QrCode, Search, Tag, X, ChefHat, Sparkles, MoveRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const PREDEFINED_CATEGORIES = [
  "Milliy taomlar", "Yevropa taomlari", "Kaboblar (Shashlik)", "Suyuq taomlar",
  "Salatlar va Gazaklar", "Fast Food", "Shirinliklar", "Yaxna ichimliklar",
  "Choy va Qahva", "Qo'shimchalar"
];

export default function AdminDashboard() {
  const { mode, isDark, cycleTheme } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState("");

  const [formData, setFormData] = useState({
    name: "", description: "", price: "", category: "Milliy taomlar", image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setBaseUrl(window.location.origin);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }
      setUser(currentUser);

      try {
        const q = query(collection(db, "restaurants"), where("ownerId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const restDoc = querySnapshot.docs[0];
          const rd = restDoc.data() as { name?: string };
          setRestaurantName(typeof rd.name === "string" && rd.name.trim() ? rd.name : "Premium Restoran");
          setRestaurantSlug(restDoc.id);
          fetchItems(restDoc.id);
        } else {
          setLoading(false);
          toast.error("Hisobingizga biriktirilgan restoran topilmadi.");
        }
      } catch (error) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchItems = async (slug: string) => {
    try {
      const itemsRef = collection(db, "restaurants", slug, "menuItems");
      const q = query(itemsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    } catch (error) {
      toast.error("Menyuni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
        return;
      }
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantSlug || !user) return;
    setIsSubmitting(true);

    try {
      let imageUrl = "";
      if (formData.image) {
        const storageRef = ref(storage, `restaurants/${restaurantSlug}/${Date.now()}_${formData.image.name}`);
        await uploadBytes(storageRef, formData.image);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "restaurants", restaurantSlug, "menuItems"), {
        name: formData.name, description: formData.description, price: Number(formData.price),
        category: formData.category, imageUrl, isAvailable: true, createdAt: Date.now(),
      });

      toast.success("Shedevr muvaffaqiyatli qo'shildi!", { style: { background: '#D4AF37', color: '#000' } });
      closeModal();
      fetchItems(restaurantSlug);
    } catch (error) {
      toast.error("Xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "", description: "", price: "", category: "Milliy taomlar", image: null });
    setImagePreview(null);
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      setItems(items.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));
      await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id), { isAvailable: !currentStatus });
      toast.success(currentStatus ? "Vaqtincha yashirildi" : "Menyuga qaytarildi");
    } catch (e) {
      fetchItems(restaurantSlug);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
    try {
      setItems(items.filter(item => item.id !== id));
      await deleteDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id));
      toast.success("O'chirildi");
    } catch (e) {
      fetchItems(restaurantSlug);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/admin/login");
  }

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      canvas.width = 1200; canvas.height = 1200;
      if (ctx) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, 1200, 1200); }
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl; downloadLink.download = `${restaurantSlug}-qr.png`;
      document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // --- LOADER ---
  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#030303]">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-[1px] border-white/10 border-t-[#D4AF37]" />
        <div className="absolute inset-2 animate-[spin_2s_linear_infinite_reverse] rounded-full border-[1px] border-white/5 border-b-[#D4AF37]" />
        <ChefHat className="h-8 w-8 text-[#D4AF37] animate-pulse" strokeWidth={1} />
      </div>
      <p className="mt-8 text-xs font-medium uppercase tracking-[0.3em] text-[#D4AF37]/70">Tizimga ulanmoqda</p>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-[#D4AF37] selection:text-black relative overflow-hidden pb-20",
      isDark ? "bg-[#030303] text-white" : "bg-[#F9F8F6] text-[#111]"
    )}>

      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={cn("absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-30", isDark ? "bg-[#D4AF37]/20" : "bg-[#D4AF37]/10")} />
        <div className={cn("absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20", isDark ? "bg-white/10" : "bg-black/5")} />
      </div>

      <Toaster position="top-center" toastOptions={{ style: { background: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px' } }} />
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-6 z-50 top-6" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 pt-20">

        {/* ULTRA-PREMIUM HEADER */}
        <header className={cn(
          "mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-[2rem] p-8 backdrop-blur-2xl border transition-all duration-500",
          isDark ? "bg-white/[0.02] border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]" : "bg-white/60 border-black/5 shadow-[0_30px_60px_rgba(0,0,0,0.05)]"
        )}>
          <div className="flex items-center gap-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C] shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <Sparkles size={28} className="text-black" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] mb-1">Eksklyuziv Boshqaruv</p>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight">
                <span className="font-bold">{restaurantName}</span>
              </h1>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-4">
            <button onClick={handleLogout} className={cn(
              "group flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300",
              isDark ? "border-white/10 hover:border-red-500/50 hover:bg-red-500/10" : "border-black/10 hover:border-red-500/50 hover:bg-red-50"
            )}>
              <LogOut size={20} className={cn("transition-colors", isDark ? "text-white/50 group-hover:text-red-400" : "text-black/50 group-hover:text-red-500")} />
            </button>
            <button onClick={() => setIsModalOpen(true)} className="group relative flex h-12 items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] px-8 font-bold text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10 flex items-center gap-2">
                <Plus size={20} /> Yangi Taom
              </span>
              <div className="absolute inset-0 z-0 bg-white/20 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT: MENU GALLERY (Bento Box Style) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-light tracking-tight flex items-center gap-3">
                Kolleksiya <span className="text-sm font-bold text-[#D4AF37] px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">{items.length}</span>
              </h2>
            </div>

            {items.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed py-32 transition-colors", isDark ? "border-white/10 bg-white/[0.01]" : "border-black/10 bg-black/[0.01]")}>
                <div className="h-20 w-20 rounded-full border border-white/10 bg-gradient-to-tr from-[#111] to-[#222] flex items-center justify-center mb-6 shadow-2xl">
                  <ChefHat size={32} className="text-[#D4AF37]" strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-light mb-2">San'at asaringizni yuklang</h3>
                <p className="text-sm text-zinc-500">Hozircha menyu bo'sh. Birinchi taomni kiritib boshlang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <div key={item.id} className={cn(
                    "group relative overflow-hidden rounded-[2rem] border transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.4)]",
                    isDark ? "bg-[#0A0A0A] border-white/5 hover:border-[#D4AF37]/40" : "bg-white border-black/5 hover:border-[#D4AF37]/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]",
                    !item.isAvailable && "opacity-50 grayscale-[50%]"
                  )}>

                    {/* Image Area */}
                    <div className="relative h-60 w-full overflow-hidden bg-[#111]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-[1500ms] group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
                          <ImagePlus size={40} className="text-zinc-800" strokeWidth={1} />
                        </div>
                      )}
                      {/* Gradient Overlay for Text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      {/* Floating Category Badge */}
                      <div className="absolute top-4 left-4 rounded-full bg-black/50 backdrop-blur-md border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                        {item.category}
                      </div>

                      {/* Status Badge */}
                      {!item.isAvailable && (
                        <div className="absolute top-4 right-4 rounded-full bg-red-500/80 backdrop-blur-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                          Yashirilgan
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="relative p-6 -mt-12">
                      <h3 className="text-2xl font-bold tracking-tight text-white mb-1 drop-shadow-md line-clamp-1">{item.name}</h3>
                      <p className="text-2xl font-light text-[#D4AF37] tracking-tighter drop-shadow-md">
                        {Number(item.price).toLocaleString()} <span className="text-sm font-medium opacity-70">UZS</span>
                      </p>
                    </div>

                    {/* Hidden Actions (Reveals on Hover) */}
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      <button onClick={() => toggleAvailability(item.id, item.isAvailable)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white transition-colors hover:bg-white hover:text-black">
                        {item.isAvailable ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/80 backdrop-blur-md border border-red-500 text-white transition-colors hover:bg-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: VIP QR CARD */}
          <div className="lg:col-span-4">
            <div className="sticky top-10">
              <div className={cn(
                "relative overflow-hidden rounded-[2.5rem] border p-8 shadow-2xl transition-all duration-700 group",
                isDark ? "bg-gradient-to-b from-[#111] to-[#050505] border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)]" : "bg-gradient-to-b from-white to-zinc-100 border-black/10 shadow-[0_40px_80px_rgba(0,0,0,0.1)]"
              )}>
                {/* Metallic accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-[60px] pointer-events-none group-hover:bg-[#D4AF37]/20 transition-colors duration-1000" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-8 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] backdrop-blur-sm">
                    Premium Menyu
                  </div>

                  <div className="relative mb-8 flex h-[240px] w-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
                    <div className="absolute inset-0 rounded-3xl border border-black/5" />
                    {baseUrl && restaurantSlug ? (
                      <QRCode id="qr-code-svg" value={`${baseUrl}/menu/${restaurantSlug}`} size={200} level="H" bgColor="#FFFFFF" fgColor="#000000" />
                    ) : (
                      <div className="animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent h-10 w-10" />
                    )}
                  </div>

                  <h3 className="mb-2 text-2xl font-light tracking-tight">VIP QR Code</h3>
                  <p className="mb-8 text-center text-sm font-medium text-zinc-500 leading-relaxed px-4">
                    Stollaringiz uchun eksklyuziv formatda yuklab oling.
                  </p>

                  <button onClick={downloadQR} disabled={!baseUrl || !restaurantSlug} className="group relative w-full overflow-hidden rounded-2xl bg-[#111] border border-white/10 py-5 text-sm font-bold uppercase tracking-widest text-[#D4AF37] transition-all hover:border-[#D4AF37]/50 disabled:opacity-50">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <Download size={18} /> PNG Yuklash
                    </span>
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
                  </button>

                  <a href={restaurantSlug ? `/menu/${restaurantSlug}` : "#"} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#D4AF37]">
                    Jonli ko'rish <MoveRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ULTRA-PREMIUM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xl transition-all duration-500">
          <div className={cn(
            "relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 ease-out",
            isDark ? "bg-[#0A0A0A] border-white/10" : "bg-white border-black/10"
          )}>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-10 py-8">
              <div>
                <h2 className="text-2xl font-light tracking-tight">Yangi Taom</h2>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37] mt-2">Kolleksiyaga qo'shish</p>
              </div>
              <button onClick={closeModal} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:rotate-90">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] overflow-y-auto px-10 py-8 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-8">

                {/* Image Upload Area */}
                <div>
                  <label className="group relative flex h-[280px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] transition-all hover:border-[#D4AF37]/50">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="rounded-full bg-white px-6 py-2 text-xs font-bold uppercase tracking-widest text-black shadow-2xl">O'zgartirish</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-4 rounded-full border border-white/5 bg-white/5 p-5 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:border-[#D4AF37]/30">
                          <ImagePlus size={32} className="text-zinc-400 group-hover:text-[#D4AF37]" strokeWidth={1} />
                        </div>
                        <span className="text-sm font-light text-zinc-300">Suratni yuklang</span>
                        <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">HQ • Max 5MB</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Taom Nomi</label>
                    <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={cn("w-full rounded-2xl border bg-transparent p-5 text-xl font-light outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}
                      placeholder="Masalan: Wagyu Steak" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Kategoriya</label>
                    <div className="relative">
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={cn("w-full cursor-pointer appearance-none rounded-2xl border bg-transparent p-5 text-base font-medium outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}>
                        {PREDEFINED_CATEGORIES.map((cat) => <option key={cat} value={cat} className="bg-[#111] text-white">{cat}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Narxi (UZS)</label>
                    <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={cn("w-full rounded-2xl border bg-transparent p-5 text-base font-medium text-[#D4AF37] outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10" : "border-black/10")}
                      placeholder="0" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Tarkibi (Ixtiyoriy)</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn("min-h-[120px] w-full resize-none rounded-2xl border bg-transparent p-5 text-base font-light outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}
                      placeholder="Taom haqida qisqacha ma'lumot..." />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button type="button" onClick={closeModal} className="h-16 flex-1 rounded-2xl border border-white/10 bg-transparent text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/5">
                    Bekor qilish
                  </Button>
                  <Button type="submit" isLoading={isSubmitting} className="h-16 flex-[2] rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-sm font-bold uppercase tracking-widest text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    {isSubmitting ? "Saqlanmoqda..." : "Kolleksiyaga Qo'shish"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}