"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Plus, Trash2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed, LogOut, LayoutDashboard, QrCode, Search, Tag, X, ChefHat } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

// Tayyor kategoriyalar (Ularga moslashtirilgan)
const PREDEFINED_CATEGORIES = [
  "Milliy taomlar",
  "Yevropa taomlari",
  "Kaboblar (Shashlik)",
  "Suyuq taomlar",
  "Salatlar va Gazaklar",
  "Fast Food",
  "Shirinliklar",
  "Yaxna ichimliklar",
  "Choy va Qahva",
  "Qo'shimchalar"
];

export default function AdminDashboard() {
  const { mode, isDark, cycleTheme } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Premium rebranding - Haqiqiy nomi
  const [restaurantName, setRestaurantName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Milliy taomlar",
    image: null as File | null,
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
          setRestaurantName(typeof rd.name === "string" && rd.name.trim() ? rd.name : "Restoran");

          setRestaurantSlug(restDoc.id);
          fetchItems(restDoc.id);
        } else {
          setLoading(false);
          toast.error("Hisobingizga biriktirilgan restoran topilmadi.");
        }
      } catch (error) {
        console.error(error);
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
      console.error(error);
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
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        imageUrl,
        isAvailable: true,
        createdAt: Date.now(),
      });

      toast.success("Taom muvaffaqiyatli qo'shildi!");
      closeModal();
      fetchItems(restaurantSlug);
    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi. Internetni tekshiring.");
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
      await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id), {
        isAvailable: !currentStatus
      });
      toast.success(currentStatus ? "Taom vaqtincha yashirildi" : "Taom yana menyuda!");
    } catch (e) {
      toast.error("Statusni o'zgartirib bo'lmadi");
      fetchItems(restaurantSlug);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
    try {
      setItems(items.filter(item => item.id !== id));
      await deleteDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id));
      toast.success("Taom o'chirildi");
    } catch (e) {
      toast.error("O'chirishda xatolik");
      fetchItems(restaurantSlug);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/admin/login");
  }

  const downloadQR = () => {
    if (!baseUrl || !restaurantSlug) {
      toast.error("QR tayyor emas — sahifani yangilab qayta urinib ko‘ring.");
      return;
    }
    const svg = document.getElementById("qr-code-svg");
    if (!svg) {
      toast.error("QR topilmadi.");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 1200;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1200, 1200);
      }
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${restaurantSlug}-qr-menu.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        toast.success("PNG yuklandi");
      } catch {
        toast.error("Rasmni yaratib bo‘lmadi.");
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("QR rasmga aylantirilmadi.");
    };
    img.src = url;
  };

  if (loading) return (
    <div
      className={cn(
        "flex h-screen flex-col items-center justify-center",
        isDark ? "bg-[#080808]" : "bg-[#f4f1ea]"
      )}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div
          className={cn(
            "absolute inset-0 animate-pulse rounded-full border-8",
            isDark ? "border-[#0D1C0D]" : "border-[#e8e4dc]"
          )}
        />
        <div className="absolute inset-0 animate-spin rounded-full border-8 border-[#D4AF37] border-t-transparent" />
        <UtensilsCrossed className="relative h-8 w-8 animate-pulse text-[#D4AF37]" strokeWidth={1.5} />
      </div>
      <p className={cn("mt-6 text-lg font-semibold tracking-wide", isDark ? "text-zinc-400" : "text-zinc-600")}>
        Panel yuklanmoqda...
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-screen p-4 font-sans selection:bg-[#D4AF37] md:p-8",
        isDark ? "bg-[#080808] text-white selection:text-white" : "bg-[#f4f1ea] text-[#0a1915] selection:text-[#0a1915]"
      )}
    >
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: isDark
            ? {
                borderRadius: "1.25rem",
                background: "#1A1A1A",
                color: "#D4AF37",
                padding: "1rem",
                border: "1px solid rgba(255,255,255,0.05)",
                fontWeight: 600,
              }
            : {
                borderRadius: "1.25rem",
                background: "#ffffff",
                color: "#0a2f26",
                padding: "1rem",
                border: "1px solid rgba(10,47,38,0.12)",
                fontWeight: 600,
              },
        }}
      />

      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-4 z-50 top-[max(1rem,env(safe-area-inset-top))]" />

      <div className="mx-auto max-w-7xl pt-14">
        {/* HEADER */}
        <header
          className={cn(
            "mb-10 flex flex-col items-start justify-between gap-6 rounded-[2.5rem] border p-7 shadow-2xl md:flex-row md:items-center",
            isDark ? "border-white/5 bg-[#101010] shadow-black/10" : "border-[#0a2f26]/10 bg-white shadow-[#0a2f26]/5"
          )}
        >
          <div className="flex items-center gap-6">
            <div className="rounded-3xl border border-[#D4AF37]/30 bg-[#1A2F1A] p-5 text-[#D4AF37] shadow-lg">
              <LayoutDashboard size={32} strokeWidth={1} />
            </div>
            <div>
              <h1 className={cn("text-4xl font-extrabold tracking-tighter", isDark ? "text-white" : "text-[#0a1915]")}>
                Boshqaruv
              </h1>
              <p className={cn("mt-1 flex flex-wrap items-center gap-3 text-base font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
                Restoran:{" "}
                <span className="rounded-xl bg-[#1A1F1A] px-3 py-1 text-sm font-bold text-[#D4AF37]">
                  {restaurantName || "Restoran"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex w-full gap-3 md:w-auto">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={cn(
                "h-14 flex-1 rounded-xl font-bold transition-all md:flex-none",
                isDark
                  ? "border-white/10 text-zinc-300 hover:border-red-950/30 hover:bg-red-950/20 hover:text-red-400"
                  : "border-[#0a2f26]/15 text-[#0a1915] hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              )}
            >
              <LogOut className="mr-2.5 h-5 w-5" /> Chiqish
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-14 flex-1 rounded-xl bg-[#D4AF37] px-8 text-lg font-bold text-black shadow-2xl shadow-[#D4AF37]/20 transition-colors hover:bg-white md:flex-none"
            >
              <Plus className="mr-2.5 h-6 w-6" /> Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: MENU LIST */}
          <div className="lg:col-span-2 space-y-8">
            <div className="mb-2 flex items-center justify-between p-1">
              <h2
                className={cn(
                  "flex items-center gap-3 text-3xl font-extrabold tracking-tight",
                  isDark ? "text-white" : "text-[#0a1915]"
                )}
              >
                <ChefHat className="h-7 w-7 text-[#D4AF37]" strokeWidth={2} /> Menyudagi taomlar
              </h2>
              <div className="flex items-center gap-2.5 rounded-full border border-white/5 bg-[#1A1F1A] px-5 py-2 text-sm font-extrabold text-[#D4AF37]">
                <Tag className="h-4 w-4" />
                {items.length} ta pozitsiya
              </div>
            </div>

            {items.length === 0 ? (
              <div
                className={cn(
                  "flex flex-col items-center rounded-[3rem] border-2 border-dashed py-28 text-center",
                  isDark ? "border-white/5 bg-[#101010]" : "border-[#0a2f26]/12 bg-white"
                )}
              >
                <div className="mb-6 rounded-full border border-white/5 bg-[#1A1F1A] p-7">
                  <ChefHat className="h-12 w-12 text-[#D4AF37]" strokeWidth={1.5} />
                </div>
                <h3 className={cn("mb-3 text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-[#0a1915]")}>
                  Menyu hozircha bo'sh
                </h3>
                <p className={cn("mx-auto mb-10 max-w-sm text-lg font-medium leading-relaxed", isDark ? "text-zinc-500" : "text-zinc-600")}>
                  Mijozlaringiz ko'rishi uchun birinchi taomni kiritishni boshlang.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="h-auto rounded-2xl bg-[#D4AF37] px-10 py-7 text-xl font-bold text-black shadow-2xl shadow-[#D4AF37]/30 transition-colors hover:bg-white"
                >
                  <Plus className="mr-2.5 h-6 w-6" /> Birinchi taomni qo'shish
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center justify-between rounded-[2rem] border p-6 shadow-sm transition-all hover:border-[#D4AF37]/30 hover:shadow-2xl hover:shadow-[#D4AF37]/10",
                      isDark ? "border-white/5 bg-[#101010]" : "border-[#0a2f26]/10 bg-white",
                      !item.isAvailable && (isDark ? "bg-[#080808]/50 opacity-60" : "bg-zinc-100/80 opacity-70")
                    )}
                  >
                    <div className="flex items-center gap-7">
                      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-3xl border border-white/5 bg-[#1A1F1A] shadow-inner">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#0D1C0D]">
                            <ImagePlus size={36} strokeWidth={1} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3
                          className={cn(
                            "mb-3 text-2xl font-extrabold leading-tight tracking-tight transition-colors group-hover:text-[#D4AF37]",
                            isDark ? "text-white" : "text-[#0a1915]"
                          )}
                        >
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-xl border border-white/5 bg-[#1A1F1A] px-4 py-1.5 text-sm font-extrabold text-[#D4AF37]">
                            {Number(item.price).toLocaleString()} so'm
                          </span>
                          <span
                            className={cn(
                              "rounded-lg border px-3 py-1 text-xs font-bold",
                              isDark ? "border-white/5 bg-[#1A1A1A] text-zinc-300" : "border-[#0a2f26]/10 bg-[#f4f1ea] text-[#0a1915]"
                            )}
                          >
                            {item.category}
                          </span>
                        </div>
                        {!item.isAvailable && (
                          <span className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-400">
                            <EyeOff size={14} /> Vaqtincha menyuda emas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-5">
                      <button
                        type="button"
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={cn(
                          "rounded-2xl p-3.5 transition-all",
                          item.isAvailable
                            ? "text-zinc-500 hover:bg-[#1A2F1A] hover:text-emerald-400"
                            : "text-zinc-500 hover:bg-[#1A1F1A] hover:text-[#D4AF37]"
                        )}
                        title={item.isAvailable ? "Yashirish" : "Ko'rsatish"}
                      >
                        {item.isAvailable ? <Eye size={24} /> : <EyeOff size={24} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="rounded-2xl p-3.5 text-zinc-500 transition-all hover:bg-red-950/30 hover:text-red-400"
                        title="O'chirish"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR */}
          <div className="lg:col-span-1">
            <div className="relative sticky top-10 overflow-hidden rounded-[3rem] border border-[#D4AF37]/20 bg-[#0D1C0D] p-9 text-center shadow-2xl shadow-black/20">

              {/* Oltin va Yashil bezaklar */}
              <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#D4AF37]/10 rounded-full blur-[80px]"></div>
              <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-[#1A2F1A]/50 rounded-full blur-[80px]"></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-2.5 bg-[#1A2F1A]/80 text-[#D4AF37] px-5 py-2.5 rounded-full mb-10 text-sm font-extrabold border border-white/5 backdrop-blur-md shadow-inner">
                  <QrCode size={18} /> Raqamli Menyu
                </div>

                {/* Skaner qilinadigan qism - Oq fonda qora bo'lishi shart */}
                <div className="mb-10 cursor-pointer rounded-[2rem] border border-zinc-100 bg-white p-6 shadow-xl transition-transform duration-500 ease-out hover:scale-[1.02]">
                  {baseUrl && restaurantSlug ? (
                    <QRCode
                      id="qr-code-svg"
                      value={`${baseUrl}/menu/${restaurantSlug}`}
                      size={200}
                      level="H"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  ) : (
                    <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 text-sm text-zinc-500">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
                      QR tayyorlanmoqda...
                    </div>
                  )}
                </div>

                <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white">QR kod</h2>
                <p className="mb-10 text-base font-medium leading-relaxed text-zinc-400">
                  PNG yuklab oling, chop eting va stollarga qo‘ying. Skaner uchun oq fon va qora nuqta tavsiya etiladi.
                </p>

                <Button
                  type="button"
                  onClick={downloadQR}
                  disabled={!baseUrl || !restaurantSlug}
                  className="w-full rounded-2xl border border-[#D4AF37]/30 bg-[#1A1F1A] py-7 text-xl font-extrabold text-[#D4AF37] shadow-xl shadow-black/10 transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="mr-3 h-6 w-6" /> PNG yuklash
                </Button>

                <a
                  href={restaurantSlug ? `/menu/${restaurantSlug}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-8 flex items-center justify-center gap-2.5 text-base font-semibold transition-colors",
                    restaurantSlug ? "text-zinc-500 hover:text-[#D4AF37]" : "pointer-events-none text-zinc-600"
                  )}
                >
                  <Search size={18} /> Menyuni brauzerda ochish
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM MODAL: ADD ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div
            className={cn(
              "max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-[3rem] border p-10 shadow-2xl",
              isDark ? "border-white/5 bg-[#101010]" : "border-[#0a2f26]/10 bg-white"
            )}
          >
            <div className="mb-10 flex items-start justify-between gap-4">
              <div>
                <h2 className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-[#0a1915]")}>
                  Menyuga taom qo&apos;shish
                </h2>
                <p className={cn("mt-2 text-base font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  Barcha kerakli ma&apos;lumotlarni kiriting va saqlang
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={cn(
                  "rounded-full p-3 transition-colors",
                  isDark ? "bg-[#1A1A1A] text-zinc-500 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">

              {/* Rasm */}
              <div>
                <label className="group block w-full cursor-pointer">
                  <div
                    className={cn(
                      "relative flex h-60 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all",
                      imagePreview
                        ? "border-transparent bg-[#1A1F1A]"
                        : isDark
                          ? "border-white/5 bg-[#101010] hover:border-[#D4AF37]/40 hover:bg-[#1A1F1A]/50"
                          : "border-[#0a2f26]/15 bg-[#f4f1ea] hover:border-[#D4AF37]/50"
                    )}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="" className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-base font-extrabold text-white shadow-lg backdrop-blur-lg">
                            Boshqa rasm tanlash
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-5 rounded-2xl border border-white/5 bg-[#1A1F1A] p-5 shadow-lg transition-all duration-300 group-hover:scale-110">
                          <ImagePlus className="h-10 w-10 text-zinc-500 group-hover:text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <span className={cn("mb-1 text-lg font-extrabold", isDark ? "text-white" : "text-[#0a1915]")}>
                          Yuqori sifatli rasm yuklang
                        </span>
                        <span className="text-sm font-medium text-zinc-500">PNG, JPG (max 5MB)</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              <div>
                <label className={cn("mb-2.5 block pl-1 text-sm font-extrabold", isDark ? "text-zinc-300" : "text-[#0a1915]")}>
                  Taom nomi <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="Masalan: maxsus palov"
                  className={cn(
                    "w-full rounded-2xl border p-5 text-lg font-semibold outline-none transition-all placeholder:text-zinc-500 focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10",
                    isDark
                      ? "border-white/5 bg-[#1A1F1A] text-white focus:bg-[#101010]"
                      : "border-[#0a2f26]/12 bg-[#f4f1ea] text-[#0a1915] focus:bg-white"
                  )}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className={cn("mb-2.5 block pl-1 text-sm font-extrabold", isDark ? "text-zinc-300" : "text-[#0a1915]")}>
                    Menyu bo&apos;limi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={cn(
                        "w-full cursor-pointer appearance-none rounded-2xl border p-5 text-lg font-semibold outline-none transition-all focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10",
                        isDark
                          ? "border-white/5 bg-[#1A1F1A] text-white focus:bg-[#101010]"
                          : "border-[#0a2f26]/12 bg-[#f4f1ea] text-[#0a1915] focus:bg-white"
                      )}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PREDEFINED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 font-bold">▼</div>
                  </div>
                </div>
                <div>
                  <label className={cn("mb-2.5 block pl-1 text-sm font-extrabold", isDark ? "text-zinc-300" : "text-[#0a1915]")}>
                    Narx <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      placeholder="0"
                      type="number"
                      className={cn(
                        "w-full rounded-2xl border p-5 pl-5 pr-20 text-xl font-extrabold text-[#D4AF37] outline-none transition-all focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10",
                        isDark ? "border-white/5 bg-[#1A1F1A] focus:bg-[#101010]" : "border-[#0a2f26]/12 bg-[#f4f1ea] focus:bg-white"
                      )}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 font-extrabold bg-[#1A1A1A] px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider border border-white/5">so&apos;m</span>
                  </div>
                </div>
              </div>

              <div>
                <label className={cn("mb-2.5 block pl-1 text-sm font-extrabold", isDark ? "text-zinc-300" : "text-[#0a1915]")}>
                  Tarkib yoki izoh <span className="font-normal text-zinc-500">(ixtiyoriy)</span>
                </label>
                <textarea
                  placeholder="Masalan: guruch, go'sht, ziravorlar..."
                  className={cn(
                    "min-h-[120px] w-full resize-none rounded-2xl border p-5 text-base font-medium leading-relaxed outline-none transition-all placeholder:text-zinc-500 focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10",
                    isDark
                      ? "border-white/5 bg-[#1A1F1A] text-white focus:bg-[#101010]"
                      : "border-[#0a2f26]/12 bg-[#f4f1ea] text-[#0a1915] focus:bg-white"
                  )}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className={cn("flex gap-4 border-t pt-6", isDark ? "border-white/5" : "border-[#0a2f26]/10")}>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-auto flex-1 rounded-2xl py-7 text-lg font-extrabold transition-colors",
                    isDark
                      ? "border-white/10 text-zinc-400 hover:bg-[#1A1A1A] hover:text-white"
                      : "border-[#0a2f26]/15 text-zinc-600 hover:bg-zinc-100"
                  )}
                  onClick={closeModal}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" className="h-auto flex-1 rounded-2xl bg-[#D4AF37] py-7 text-xl font-extrabold text-black shadow-2xl shadow-[#D4AF37]/30 transition-all hover:bg-white" isLoading={isSubmitting}>
                  {isSubmitting ? "Saqlanmoqda..." : "Menyuga qo'shish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}