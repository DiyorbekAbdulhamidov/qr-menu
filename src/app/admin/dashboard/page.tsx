"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Loader2, Plus, Trash2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed, LogOut, LayoutDashboard, QrCode, Search, Tag } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";

// Tayyor kategoriyalar
const PREDEFINED_CATEGORIES = [
  "Quyuq taomlar",
  "Suyuq taomlar",
  "Fast Food",
  "Salatlar",
  "Ichimliklar",
  "Shirinliklar",
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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Quyuq taomlar",
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
    setFormData({ name: "", description: "", price: "", category: "Quyuq taomlar", image: null });
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
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        <UtensilsCrossed className="w-6 h-6 text-indigo-600 animate-pulse" />
      </div>
      <p className="mt-4 text-slate-500 font-medium tracking-wide">Lutsente tizimi yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      <Toaster position="top-center" reverseOrder={false}
        toastOptions={{
          style: { borderRadius: '1rem', background: '#333', color: '#fff' }
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* PREMIUM HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Boshqaruv Paneli</h1>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                Restoran ID: <span className="font-mono bg-slate-100 text-indigo-700 px-2.5 py-1 rounded-lg font-bold">{restaurantSlug}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={handleLogout} className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors rounded-xl h-12">
              <LogOut className="w-4 h-4 mr-2" /> Chiqish
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 rounded-xl h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> Taom Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: MENU LIST */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                Menyudagi taomlar
              </h2>
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-bold text-sm">
                <Tag className="w-4 h-4" />
                {items.length} ta pozitsiya
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                <div className="bg-indigo-50 p-6 rounded-full mb-5">
                  <UtensilsCrossed className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Menyu hozircha bo'sh</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-lg">Mijozlaringiz ko'rishi uchun birinchi taomni menyuga kiriting.</p>
                <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 py-6 h-auto text-lg">
                  Birinchi taomni qo'shish
                </Button>
              </div>
            ) : (
              <div className="grid gap-5">
                {items.map((item) => (
                  <div key={item.id} className={`group bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-xl hover:shadow-indigo-100/40 ${!item.isAvailable ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-100 flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                            <ImagePlus size={28} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-bold text-xl text-slate-900 mb-2 leading-tight">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg text-sm">
                            {Number(item.price).toLocaleString()} so'm
                          </span>
                          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-lg">
                            {item.category}
                          </span>
                        </div>
                        {!item.isAvailable && <span className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><EyeOff size={12} /> Vaqtincha yashirilgan</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-4">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={`p-3 rounded-xl transition-all ${item.isAvailable ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={item.isAvailable ? "Yashirish" : "Ko'rsatish"}
                      >
                        {item.isAvailable ? <Eye size={22} /> : <EyeOff size={22} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="O'chirish"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: PREMIUM QR CODE PANEL */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 border border-slate-800 flex flex-col items-center text-center overflow-hidden relative">

              {/* Decorative background blur */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/30 rounded-full blur-[60px]"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px]"></div>

              <div className="relative z-10 w-full">
                <div className="inline-flex items-center gap-2 bg-slate-800/50 text-indigo-300 px-4 py-2 rounded-full mb-8 text-sm font-bold border border-slate-700/50 backdrop-blur-md">
                  <QrCode size={16} /> Raqamli Menyu
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-xl mb-8 mx-auto w-fit transform hover:scale-105 transition-transform duration-500">
                  <QRCode
                    id="qr-code-svg"
                    value={baseUrl ? `${baseUrl}/menu/${restaurantSlug}` : ""}
                    size={180}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#0f172a"
                  />
                </div>

                <h2 className="text-2xl font-black mb-2 text-white">QR Kod tayyor</h2>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">Stollarga qo'yish uchun PNG formatida yuklab oling va chop eting.</p>

                <Button onClick={downloadQR} className="w-full bg-indigo-500 text-white hover:bg-indigo-600 py-6 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/25 border border-indigo-400/50">
                  <Download className="w-5 h-5 mr-2" /> Yuklab olish
                </Button>

                <a
                  href={`/menu/${restaurantSlug}`}
                  target="_blank"
                  className="mt-6 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Search size={16} /> Menyuni ko'rish
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM MODAL: ADD ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl scale-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Yangi Taom</h2>
                <p className="text-slate-500 text-sm mt-1">Menyuga yangi pozitsiya qo'shish</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Image Upload Area */}
              <div>
                <label className="block w-full cursor-pointer group">
                  <div className={`relative w-full h-52 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-transparent bg-slate-900' : 'border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-400'}`}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium text-sm border border-white/30">
                            Boshqa rasm tanlash
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover:scale-110 group-hover:text-indigo-600 transition-all duration-300">
                          <ImagePlus className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <span className="text-base text-slate-700 font-bold">Rasm yuklash</span>
                        <span className="text-sm text-slate-400 mt-1">PNG, JPG (Max: 5MB)</span>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Taom nomi <span className="text-red-500">*</span></label>
                <input
                  placeholder="Masalan: Choyxona palov"
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400 font-semibold text-slate-900"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Bo'lim <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none font-semibold text-slate-900 cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Narxi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold text-slate-900 pl-4 pr-16"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md text-xs">Uzs</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Izoh <span className="text-slate-400 font-normal">(ixtiyoriy)</span></label>
                <textarea
                  placeholder="Tarkibi: qo'y go'shti, lazzatli guruch va hk..."
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400 font-medium min-h-[100px] resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1 py-6 rounded-2xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50" onClick={closeModal}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="flex-[2] py-6 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 text-lg" isLoading={isSubmitting}>
                  {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}