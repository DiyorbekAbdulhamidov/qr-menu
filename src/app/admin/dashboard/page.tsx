"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Loader2, Plus, Trash2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed, LogOut, LayoutDashboard, QrCode, Search, Tag, X, MapPin, ChefHat } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";

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
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Premium rebranding - Haqiqiy nomi
  const [restaurantName, setRestaurantName] = useState("AMIR RESTAURANT");

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
          // XATO TO'G'IRLANDI: docs[0] qilib birinchi elementni oldik
          const restDoc = querySnapshot.docs[0];

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
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
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
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${restaurantSlug}-qr-menu.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      img.src = url;
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#080808]">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 border-8 border-[#0D1C0D] rounded-full animate-pulse"></div>
        <div className="absolute inset-0 border-8 border-[#D4AF37] rounded-full border-t-transparent animate-spin"></div>
        <UtensilsCrossed className="w-8 h-8 text-[#D4AF37] animate-pulse" strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-zinc-400 font-semibold tracking-wide text-lg">Amir paneli yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] p-4 md:p-8 font-sans text-white selection:bg-[#D4AF37] selection:text-white">
      <Toaster position="top-center" reverseOrder={false}
        toastOptions={{
          style: { borderRadius: '1.25rem', background: '#1A1A1A', color: '#D4AF37', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* PREMIUM HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-[#101010] p-7 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/10">
          <div className="flex items-center gap-6">
            <div className="bg-[#1A2F1A] border border-[#D4AF37]/30 text-[#D4AF37] p-5 rounded-3xl shadow-lg">
              <LayoutDashboard size={32} strokeWidth={1} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-white">Boshqaruv</h1>
              <p className="text-zinc-400 text-base mt-1 font-medium flex items-center gap-3">
                Restoran: <span className="font-bold text-[#D4AF37] bg-[#1A1F1A] px-3 py-1 rounded-xl text-sm">{restaurantName}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={handleLogout} className="flex-1 md:flex-none border-white/5 text-zinc-300 hover:bg-red-950/20 hover:text-red-400 hover:border-red-950/20 transition-all rounded-xl h-14 font-bold">
              <LogOut className="w-5 h-5 mr-2.5" /> Chiqish
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-[#D4AF37] text-black hover:bg-white shadow-2xl shadow-[#D4AF37]/20 rounded-xl h-14 px-8 font-bold text-lg transition-colors">
              <Plus className="w-6 h-6 mr-2.5" /> Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: MENU LIST */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2 p-1">
              <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white tracking-tight">
                <ChefHat className="w-7 h-7 text-[#D4AF37]" strokeWidth={2} /> Menyudagi taomlar
              </h2>
              <div className="flex items-center gap-2.5 bg-[#1A1F1A] text-[#D4AF37] px-5 py-2 rounded-full font-extrabold text-sm border border-white/5">
                <Tag className="w-4 h-4" />
                {items.length} ta pozitsiya
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-28 bg-[#101010] rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                <div className="bg-[#1A1F1A] p-7 rounded-full mb-6 border border-white/5">
                  <ChefHat className="w-12 h-12 text-[#D4AF37]" strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Menyu hozircha bo'sh</h3>
                <p className="text-zinc-500 mb-10 max-w-sm mx-auto text-lg font-medium leading-relaxed">Mijozlaringiz ko'rishi uchun birinchi taomni kiritishni boshlang.</p>
                <Button onClick={() => setIsModalOpen(true)} className="bg-[#D4AF37] text-black hover:bg-white rounded-2xl px-10 py-7 h-auto text-xl font-bold shadow-2xl shadow-[#D4AF37]/30 transition-colors">
                  <Plus className="w-6 h-6 mr-2.5" /> Birinchi taomni qo'shish
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {items.map((item) => (
                  <div key={item.id} className={`group bg-[#101010] p-6 rounded-[2rem] shadow-sm border border-white/5 flex items-center justify-between transition-all hover:shadow-2xl hover:shadow-[#D4AF37]/10 hover:border-[#D4AF37]/30 ${!item.isAvailable ? 'opacity-60 bg-[#080808]/50' : ''}`}>
                    <div className="flex items-center gap-7">
                      <div className="w-28 h-28 bg-[#1A1F1A] rounded-3xl overflow-hidden relative border border-white/5 flex-shrink-0 shadow-inner">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#0D1C0D]">
                            <ImagePlus size={36} strokeWidth={1} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-extrabold text-2xl text-white mb-3 leading-tight tracking-tight group-hover:text-[#D4AF37] transition-colors">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-extrabold text-[#D4AF37] bg-[#1A1F1A] px-4 py-1.5 rounded-xl text-sm border border-white/5">
                            {Number(item.price).toLocaleString()} so'm
                          </span>
                          <span className="text-xs text-zinc-300 font-bold bg-[#1A1A1A] px-3 py-1 rounded-lg border border-white/5">
                            {item.category}
                          </span>
                        </div>
                        {!item.isAvailable && <span className="text-xs text-red-400 font-bold mt-3 flex items-center gap-1.5"><EyeOff size={14} /> Vaqtincha menyuda emas</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-5">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={`p-3.5 rounded-2xl transition-all ${item.isAvailable ? 'text-zinc-500 hover:text-emerald-400 hover:bg-[#1A2F1A]' : 'text-zinc-500 hover:text-[#D4AF37] hover:bg-[#1A1F1A]'}`}
                        title={item.isAvailable ? "Yashirish" : "Ko'rsatish"}
                      >
                        {item.isAvailable ? <Eye size={24} /> : <EyeOff size={24} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-3.5 rounded-2xl text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
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

          {/* RIGHT: PREMIUM QR CODE PANEL (Deep Green) */}
          <div className="lg:col-span-1">
            <div className="sticky top-10 bg-[#0D1C0D] p-9 rounded-[3rem] shadow-2xl shadow-black/20 border border-[#D4AF37]/20 flex flex-col items-center text-center overflow-hidden relative">

              {/* Oltin va Yashil bezaklar */}
              <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#D4AF37]/10 rounded-full blur-[80px]"></div>
              <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-[#1A2F1A]/50 rounded-full blur-[80px]"></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-2.5 bg-[#1A2F1A]/80 text-[#D4AF37] px-5 py-2.5 rounded-full mb-10 text-sm font-extrabold border border-white/5 backdrop-blur-md shadow-inner">
                  <QrCode size={18} /> Raqamli Menyu
                </div>

                {/* Skaner qilinadigan qism - Oq fonda qora bo'lishi shart */}
                <div className="bg-white p-6 rounded-[2rem] shadow-3xl mb-10 transform hover:scale-105 transition-transform duration-500 ease-out cursor-pointer border border-zinc-100">
                  <QRCode
                    id="qr-code-svg"
                    value={baseUrl ? `${baseUrl}/menu/${restaurantSlug}` : ""}
                    size={200}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#000000" // Qora rangda bo'lishi skaner uchun yaxshi
                  />
                </div>

                <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">QR Kod Tayyor</h2>
                <p className="text-zinc-400 mb-10 text-base leading-relaxed font-medium">PNG formatida yuklab oling, chop eting va stollarga joylashtiring.</p>

                <Button onClick={downloadQR} className="w-full bg-[#1A1F1A] text-[#D4AF37] hover:bg-white hover:text-black py-7 rounded-2xl font-extrabold text-xl shadow-xl shadow-black/10 border border-[#D4AF37]/30 transition-all">
                  <Download className="w-6 h-6 mr-3" /> PNG Yuklash
                </Button>

                <a
                  href={`/menu/${restaurantSlug}`}
                  target="_blank"
                  className="mt-8 text-base text-zinc-500 hover:text-[#D4AF37] transition-colors flex items-center justify-center gap-2.5 font-semibold group"
                >
                  <Search size={18} className="group-hover:text-[#D4AF37] transition-colors" /> Menyuni ochiq havola orqali ko'rish
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM MODAL: ADD ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-[#101010] rounded-[3rem] w-full max-w-2xl p-10 shadow-3xl scale-100 overflow-y-auto max-h-[95vh] border border-white/5">
            <div className="flex justify-between items-start mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Menyuga Taom Qo'shish</h2>
                <p className="text-zinc-400 text-base mt-2 font-medium">Barcha kerakli ma'lumotlarni kiriting va saqlang</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-[#1A1A1A] rounded-full hover:bg-zinc-800 text-zinc-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">

              {/* Enhanced Image Upload Area */}
              <div>
                <label className="block w-full cursor-pointer group">
                  <div className={`relative w-full h-60 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-transparent bg-[#1A1F1A]' : 'border-white/5 bg-[#101010] hover:bg-[#1A1F1A]/50 hover:border-[#D4AF37]/40'}`}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white/10 backdrop-blur-lg text-white px-6 py-3 rounded-2xl font-extrabold text-base border border-white/20 shadow-lg">
                            Boshqa rasm tanlash
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-5 bg-[#1A1F1A] rounded-2xl shadow-lg border border-white/5 mb-5 group-hover:scale-110 transition-all duration-300">
                          <ImagePlus className="w-10 h-10 text-zinc-500 group-hover:text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <span className="text-lg text-white font-extrabold mb-1">Yuqori sifatli rasm yuklang</span>
                        <span className="text-sm text-zinc-500 font-medium">PNG, JPG (Max: 5MB)</span>
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

              {/* Name */}
              <div>
                <label className="block text-sm font-extrabold text-zinc-300 mb-2.5 pl-1">Taom Nomi <span className="text-red-500">*</span></label>
                <input
                  placeholder="Masalan: Maxsus Choyxona Palovi"
                  className="w-full p-5 bg-[#1A1F1A] rounded-2xl border border-white/5 focus:bg-[#101010] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all outline-none placeholder:text-zinc-600 font-semibold text-white text-lg"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-extrabold text-zinc-300 mb-2.5 pl-1">Menyu Bo'limi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full p-5 bg-[#1A1F1A] rounded-2xl border border-white/5 focus:bg-[#101010] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all outline-none appearance-none font-semibold text-white cursor-pointer text-lg"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 font-bold">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-zinc-300 mb-2.5 pl-1">Sotuv Narxi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full p-5 bg-[#1A1F1A] rounded-2xl border border-white/5 focus:bg-[#101010] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all outline-none font-extrabold text-[#D4AF37] text-xl pl-5 pr-20"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 font-extrabold bg-[#1A1A1A] px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider border border-white/5">Uzs</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-extrabold text-zinc-300 mb-2.5 pl-1">Tarkibi yoki Izoh <span className="text-zinc-500 font-normal">(ixtiyoriy)</span></label>
                <textarea
                  placeholder="Tarkibi: lazzatli guruch, go'sht, sabzi, maxsus ziravorlar va hk..."
                  className="w-full p-5 bg-[#1A1F1A] rounded-2xl border border-white/5 focus:bg-[#101010] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all outline-none placeholder:text-zinc-600 font-medium min-h-[120px] resize-none text-base leading-relaxed"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t border-white/5">
                <Button type="button" variant="outline" className="flex-1 py-7 rounded-2xl border-white/5 text-zinc-400 font-extrabold hover:bg-[#1A1A1A] h-auto text-lg transition-colors hover:text-white" onClick={closeModal}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="flex- py-7 rounded-2xl bg-[#D4AF37] text-black font-extrabold hover:bg-white shadow-2xl shadow-[#D4AF37]/30 text-xl h-auto transition-all" isLoading={isSubmitting}>
                  {isSubmitting ? "Saqlanmoqda..." : "Menyuga Qo'shish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}