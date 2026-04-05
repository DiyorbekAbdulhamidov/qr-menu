"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { MenuItem } from "@/lib/types";
import { Plus, Trash2, Eye, EyeOff, Download, ImagePlus, LogOut, X, ChefHat, Sparkles, MoveRight, Pencil } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import imageCompression from 'browser-image-compression';
import { Button } from "@/components/ui/Button";
import Image from "next/image";

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

  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "", description: "", price: "", category: "Milliy taomlar",
    image: null as File | null, existingImageUrl: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Xotirani tozalash (Memory Leak ni oldini olish)
  useEffect(() => {
    return () => {
      if (imagePreview && !imagePreview.startsWith('http')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

  // INTELLEKTUAL RASM KOMPRESSIYASI
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      try {
        // Agar rasm hajmi 500 KB dan katta bo'lsagina kompressiya qilamiz (Sifatni yo'qotmaslik uchun)
        if (file.size > 500 * 1024) {
          const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
          const compressedFile = await imageCompression(file, options);
          setFormData({ ...formData, image: compressedFile });
          setImagePreview(URL.createObjectURL(compressedFile));
        } else {
          // Hajmi kichik bo'lsa, originalni saqlaymiz
          setFormData({ ...formData, image: file });
          setImagePreview(URL.createObjectURL(file));
        }
      } catch (error) {
        toast.error("Rasmni yuklashda xatolik");
      }
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", price: "", category: activeCategory !== "Barchasi" ? activeCategory : "Milliy taomlar", image: null, existingImageUrl: "" });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name, description: item.description || "", price: item.price.toString(),
      category: item.category, image: null, existingImageUrl: item.imageUrl || ""
    });
    setImagePreview(item.imageUrl || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantSlug || !user) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.existingImageUrl;
      if (formData.image) {
        const storageRef = ref(storage, `restaurants/${restaurantSlug}/${Date.now()}_${formData.image.name}`);
        await uploadBytes(storageRef, formData.image);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const itemData = {
        name: formData.name, description: formData.description, price: Number(formData.price),
        category: formData.category, imageUrl: finalImageUrl, isAvailable: true,
      };

      if (editingId) {
        await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", editingId), itemData);
        toast.success("Taom yangilandi!", { style: { background: '#10B981', color: '#fff' } });
      } else {
        await addDoc(collection(db, "restaurants", restaurantSlug, "menuItems"), { ...itemData, createdAt: Date.now() });
        toast.success("Kolleksiyaga qo'shildi!", { style: { background: '#D4AF37', color: '#000' } });
      }

      closeModal();
      fetchItems(restaurantSlug);
    } catch (error) {
      toast.error("Xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      setItems(items.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));
      await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id), { isAvailable: !currentStatus });
      toast.success(currentStatus ? "Menyudan yashirildi" : "Menyuga qaytarildi");
    } catch (e) {
      fetchItems(restaurantSlug);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Diqqat! Ushbu pozitsiyani butunlay o'chirib tashlamoqchimisiz?")) return;
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
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `${restaurantSlug}-qr.png`;
      downloadLink.click();
    };
    img.src = url;
  };

  const categories = ["Barchasi", ...Array.from(new Set(items.map((item) => item.category)))];
  const filteredItems = activeCategory === "Barchasi" ? items : items.filter(item => item.category === activeCategory);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#050505]">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-[1px] border-white/10 border-t-[#D4AF37]" />
        <ChefHat className="h-8 w-8 text-[#D4AF37] animate-pulse" strokeWidth={1} />
      </div>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Boshqaruv yuklanmoqda</p>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-[#D4AF37] selection:text-black relative pb-20 transition-colors duration-500",
      isDark ? "bg-[#050505] text-white" : "bg-[#FAF9F6] text-[#111]"
    )}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={cn("absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-20", isDark ? "bg-[#D4AF37]/20" : "bg-[#D4AF37]/10")} />
      </div>

      <Toaster position="top-center" toastOptions={{ style: { background: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px' } }} />
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-6 z-50 top-6" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 pt-20">

        {/* HEADER */}
        <header className={cn(
          "mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-[2rem] p-6 sm:p-8 backdrop-blur-2xl border transition-all duration-500",
          isDark ? "bg-white/[0.02] border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]" : "bg-white/60 border-black/5 shadow-[0_30px_60px_rgba(0,0,0,0.05)]"
        )}>
          <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C] shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <Sparkles size={24} className="text-black" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] mb-1">Eksklyuziv Boshqaruv</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight truncate" style={{ fontFamily: "var(--font-playfair)" }}>
                {restaurantName}
              </h1>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-3 sm:gap-4">
            <button onClick={handleLogout} className={cn(
              "group flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
              isDark ? "border-white/10 hover:border-red-500/50 hover:bg-red-500/10" : "border-black/10 hover:border-red-500/50 hover:bg-red-50"
            )}>
              <LogOut size={18} className={cn("transition-colors", isDark ? "text-white/50 group-hover:text-red-400" : "text-black/50 group-hover:text-red-500")} />
            </button>
            <button onClick={openAddModal} className="group relative flex h-12 flex-1 md:flex-none items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] px-6 sm:px-8 font-bold text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10 flex items-center gap-2 text-xs sm:text-sm tracking-wide">
                <Plus size={18} strokeWidth={2.5} /> Yangi Taom
              </span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* LEFT: RO'YXAT */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className={cn(
              "sticky top-4 z-40 mb-8 rounded-[2rem] border px-2 py-2 shadow-2xl backdrop-blur-[40px] transition-all",
              isDark ? "bg-[#0A0A0A]/80 border-white/10" : "bg-white/90 border-black/10"
            )}>
              <nav className="no-scrollbar flex snap-x items-center gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "snap-center flex-shrink-0 whitespace-nowrap rounded-[1.5rem] px-5 py-2.5 sm:px-6 sm:py-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-300",
                      activeCategory === cat
                        ? "bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-black shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                        : isDark
                          ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                          : "text-zinc-600 hover:bg-black/5 hover:text-black"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            </div>

            {filteredItems.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center rounded-[2.5rem] border py-24 sm:py-32 transition-colors", isDark ? "border-white/5 bg-white/[0.01]" : "border-black/5 bg-black/[0.01]")}>
                <div className={cn("h-20 w-20 rounded-full border flex items-center justify-center mb-6 shadow-2xl", isDark ? "border-white/10 bg-gradient-to-tr from-[#111] to-[#222]" : "border-black/10 bg-gradient-to-tr from-zinc-100 to-white")}>
                  <ChefHat size={32} className="text-[#D4AF37]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl sm:text-2xl font-light mb-2">Bu bo'lim hozircha bo'sh</h3>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500">Tepadan "Yangi Taom" orqali to'ldiring</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredItems.map((item) => (
                  <div key={item.id} className={cn(
                    "group flex flex-col justify-between overflow-hidden rounded-[2rem] border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
                    isDark ? "bg-[#0A0A0A] border-white/5 hover:border-[#D4AF37]/30" : "bg-white border-black/5 shadow-sm hover:border-[#D4AF37]/30",
                    !item.isAvailable && "opacity-60 grayscale-[30%]"
                  )}>
                    <div className="flex items-stretch gap-3 sm:gap-4 p-3 sm:p-4">
                      {/* QOTMAYDIGAN Next.js IMAGE */}
                      <div className={cn("relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-[1.2rem]", isDark ? "bg-[#111]" : "bg-zinc-100")}>
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#D4AF37]/30">
                            <ImagePlus size={24} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        {!item.isAvailable && (
                          <div className="absolute top-2 left-2 rounded bg-red-500/90 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur-md">Yashirin</div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col py-1">
                        <h3 className="mb-1 line-clamp-2 text-base sm:text-lg font-bold leading-tight tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>
                        <p className={cn("mb-2 sm:mb-3 line-clamp-2 text-[10px] sm:text-[11px] font-light leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
                          {item.description || "Taom haqida ma'lumot."}
                        </p>
                        <div className="mt-auto">
                          <span className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>
                            {Number(item.price).toLocaleString()} <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-70">UZS</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className={cn(
                      "flex items-center justify-between border-t px-2 py-2",
                      isDark ? "border-white/5 bg-[#111]/50" : "border-black/5 bg-zinc-50/50"
                    )}>
                      <button onClick={() => openEditModal(item)} className={cn("flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-xl py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors", isDark ? "text-blue-400 hover:bg-blue-500/10" : "text-blue-600 hover:bg-blue-500/10")}>
                        <Pencil size={14} strokeWidth={2} /> <span className="hidden sm:inline">Tahrirlash</span>
                      </button>
                      <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-black/10")} />
                      <button onClick={() => toggleAvailability(item.id, item.isAvailable)} className={cn("flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-xl py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors", item.isAvailable ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-600 hover:bg-emerald-500/10")}>
                        {item.isAvailable ? <><EyeOff size={14} strokeWidth={2} /> <span className="hidden sm:inline">Yashirish</span></> : <><Eye size={14} strokeWidth={2} /> <span className="hidden sm:inline">Ko'rsatish</span></>}
                      </button>
                      <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-black/10")} />
                      <button onClick={() => deleteItem(item.id)} className={cn("flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-xl py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors", isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-500/10")}>
                        <Trash2 size={14} strokeWidth={2} /> <span className="hidden sm:inline">O'chirish</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: VIP QR CARD */}
          <div className="lg:col-span-4 order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="sticky top-10">
              <div className={cn(
                "relative overflow-hidden rounded-[2.5rem] border p-6 sm:p-8 shadow-2xl transition-all duration-700",
                isDark ? "bg-gradient-to-b from-[#111] to-[#050505] border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)]" : "bg-gradient-to-b from-white to-zinc-50 border-black/10 shadow-[0_40px_80px_rgba(0,0,0,0.05)]"
              )}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-[60px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-6 sm:mb-8 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] backdrop-blur-sm">
                    Stollar Uchun
                  </div>

                  <div className="relative mb-6 sm:mb-8 flex h-[200px] w-[200px] sm:h-[240px] sm:w-[240px] items-center justify-center rounded-3xl bg-white p-4 sm:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                    <div className="absolute inset-0 rounded-3xl border border-black/5" />
                    {baseUrl && restaurantSlug ? (
                      <QRCode id="qr-code-svg" value={`${baseUrl}/menu/${restaurantSlug}`} size={200} style={{ width: "100%", height: "100%" }} level="H" bgColor="#FFFFFF" fgColor="#000000" />
                    ) : (
                      <div className="animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent h-10 w-10" />
                    )}
                  </div>

                  <h3 className="mb-2 text-xl sm:text-2xl font-light tracking-tight">Eksklyuziv QR Code</h3>
                  <p className="mb-6 sm:mb-8 text-center text-xs sm:text-sm font-medium text-zinc-500 leading-relaxed px-2 sm:px-4">
                    Yuqori sifatda yuklab oling va stollarga joylashtiring.
                  </p>

                  <button onClick={downloadQR} disabled={!baseUrl || !restaurantSlug} className={cn(
                    "group relative w-full overflow-hidden rounded-2xl border py-4 sm:py-5 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all hover:border-[#D4AF37]/50 disabled:opacity-50",
                    isDark ? "bg-[#111] border-white/10 text-[#D4AF37]" : "bg-black border-black text-[#D4AF37]"
                  )}>
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <Download size={18} /> PNG Yuklash
                    </span>
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
                  </button>

                  <a href={restaurantSlug ? `/menu/${restaurantSlug}` : "#"} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#D4AF37]">
                    Jonli ko'rish <MoveRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ULTRA-PREMIUM EDIT MODAL (Dark/Light Mode To'liq moslangan) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-md transition-all duration-500">
          <div className={cn(
            "relative w-full max-w-3xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden rounded-[2rem] border shadow-2xl animate-in zoom-in-95 duration-300 ease-out flex flex-col",
            isDark ? "bg-[#0A0A0A] border-white/10" : "bg-white border-black/10"
          )}>
            <div className={cn("flex items-center justify-between border-b px-6 py-5 sm:px-10 sm:py-6 flex-shrink-0", isDark ? "border-white/5" : "border-black/5")}>
              <div>
                <h2 className="text-xl sm:text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
                  {editingId ? "Taomni Tahrirlash" : "Yangi Taom"}
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-1 sm:mt-2">Kolleksiya sozlamalari</p>
              </div>
              <button onClick={closeModal} className={cn("flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border transition-all hover:rotate-90", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-black/5 hover:bg-black/10 text-black")}>
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 no-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div>
                  <label className={cn(
                    "group relative flex h-[200px] sm:h-[240px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border transition-all hover:border-[#D4AF37]/50",
                    isDark ? "bg-[#111] border-white/10" : "bg-zinc-50 border-black/10"
                  )}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105 opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="rounded-full bg-white px-4 sm:px-6 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-black shadow-2xl">Boshqa rasm yuklash</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className={cn("mb-3 sm:mb-4 rounded-full border p-4 sm:p-5 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:border-[#D4AF37]/30", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                          <ImagePlus size={28} className={cn("group-hover:text-[#D4AF37]", isDark ? "text-zinc-500" : "text-zinc-400")} strokeWidth={1.5} />
                        </div>
                        <span className={cn("text-xs sm:text-sm font-light", isDark ? "text-zinc-300" : "text-zinc-600")}>Suratni yuklang (Ixtiyoriy)</span>
                        <span className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Avtomatik siqiladi</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Taom Nomi <span className="text-red-500">*</span></label>
                    <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={cn("w-full rounded-2xl border bg-transparent p-4 sm:p-5 text-lg sm:text-xl font-light outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}
                      placeholder="Masalan: Wagyu Steak" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Kategoriya <span className="text-red-500">*</span></label>
                    <div className="relative">
                      {/* Oq rejimdagi xato to'liq tuzatildi */}
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={cn("w-full cursor-pointer appearance-none rounded-2xl border bg-transparent p-4 sm:p-5 text-sm sm:text-base font-medium outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}>
                        {PREDEFINED_CATEGORIES.map((cat) => <option key={cat} value={cat} className={isDark ? "bg-[#111] text-white" : "bg-white text-black"}>{cat}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Narxi (UZS) <span className="text-red-500">*</span></label>
                    <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={cn("w-full rounded-2xl border bg-transparent p-4 sm:p-5 text-sm sm:text-base font-medium text-[#D4AF37] outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10" : "border-black/10")}
                      placeholder="0" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-2">Tarkibi (Ixtiyoriy)</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn("min-h-[100px] sm:min-h-[120px] w-full resize-none rounded-2xl border bg-transparent p-4 sm:p-5 text-sm sm:text-base font-light outline-none transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")}
                      placeholder="Taom haqida qisqacha ma'lumot..." />
                  </div>
                </div>

                <div className={cn("flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 mt-4 border-t", isDark ? "border-white/5" : "border-black/5")}>
                  <Button type="button" onClick={closeModal} className={cn("h-14 sm:h-16 w-full sm:flex-1 rounded-2xl border bg-transparent text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors", isDark ? "border-white/10 hover:bg-white/5 text-zinc-400" : "border-black/10 hover:bg-black/5 text-zinc-600")}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" isLoading={isSubmitting} className="h-14 sm:h-16 w-full sm:flex-[2] rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    {isSubmitting ? "Saqlanmoqda..." : editingId ? "O'zgarishlarni Saqlash" : "Kolleksiyaga Qo'shish"}
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