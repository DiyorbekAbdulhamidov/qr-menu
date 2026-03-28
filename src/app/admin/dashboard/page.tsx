"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Loader2, Plus, Trash2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed, LogOut, LayoutDashboard, QrCode, Search, Tag, X } from "lucide-react";
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

  // Premium rebranding - Display name instead of slug
  const [restaurantName, setRestaurantName] = useState("Sizning Brendingiz");

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
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 border-8 border-indigo-100 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        <UtensilsCrossed className="w-8 h-8 text-indigo-600 animate-pulse" strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-slate-500 font-semibold tracking-wide text-lg">Lutsente tizimi yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-950 selection:bg-indigo-500 selection:text-white">
      <Toaster position="top-center" reverseOrder={false}
        toastOptions={{
          style: { borderRadius: '1.25rem', background: '#1e293b', color: '#fff', padding: '1rem', fontWeight: 600 }
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* REFINED HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-100/50">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 rounded-3xl shadow-xl shadow-indigo-500/30">
              <LayoutDashboard size={32} strokeWidth={1} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-slate-950">Boshqaruv</h1>
              <p className="text-slate-600 text-base mt-1 font-medium flex items-center gap-3">
                Restoran: <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl text-sm">{restaurantName}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={handleLogout} className="flex-1 md:flex-none border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all rounded-xl h-14 font-bold">
              <LogOut className="w-5 h-5 mr-2.5" /> Chiqish
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-slate-950 text-white hover:bg-slate-800 shadow-2xl shadow-slate-950/20 rounded-xl h-14 px-8 font-bold text-lg">
              <Plus className="w-6 h-6 mr-2.5" /> Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: MENU LIST */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2 p-1">
              <h2 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
                <UtensilsCrossed className="w-7 h-7 text-indigo-400" strokeWidth={2} /> Menyudagi taomlar
              </h2>
              <div className="flex items-center gap-2.5 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full font-extrabold text-sm border border-indigo-100">
                <Tag className="w-4 h-4" />
                {items.length} ta pozitsiya
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-28 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-inner shadow-slate-50">
                <div className="bg-indigo-50 p-7 rounded-full mb-6">
                  <UtensilsCrossed className="w-12 h-12 text-indigo-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-950 mb-3 tracking-tight">Menyuingiz bo'sh</h3>
                <p className="text-slate-600 mb-10 max-w-sm mx-auto text-lg font-medium leading-relaxed">Mijozlaringiz ko'rishi uchun birinchi taomni kiritishni boshlang.</p>
                <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl px-10 py-7 h-auto text-xl font-bold shadow-2xl shadow-indigo-600/30">
                  <Plus className="w-6 h-6 mr-2.5" /> Birinchi taomni qo'shish
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {items.map((item) => (
                  <div key={item.id} className={`group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100/70 flex items-center justify-between transition-all hover:shadow-2xl hover:shadow-indigo-100/70 hover:border-indigo-100 ${!item.isAvailable ? 'opacity-60 bg-slate-50' : ''}`}>
                    <div className="flex items-center gap-7">
                      <div className="w-28 h-28 bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200 flex-shrink-0 shadow-inner">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImagePlus size={36} strokeWidth={1} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-extrabold text-2xl text-slate-950 mb-3 leading-tight tracking-tight">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-xl text-sm border border-indigo-100">
                            {Number(item.price).toLocaleString()} so'm
                          </span>
                          <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                            {item.category}
                          </span>
                        </div>
                        {!item.isAvailable && <span className="text-xs text-red-600 font-bold mt-3 flex items-center gap-1.5"><EyeOff size={14} /> Vaqtincha menyuda emas</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-5">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={`p-3.5 rounded-2xl transition-all ${item.isAvailable ? 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:text-indigo-700 hover:bg-indigo-50'}`}
                        title={item.isAvailable ? "Yashirish" : "Ko'rsatish"}
                      >
                        {item.isAvailable ? <Eye size={24} /> : <EyeOff size={24} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-3.5 rounded-2xl text-slate-400 hover:text-red-700 hover:bg-red-50 transition-all"
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

          {/* RIGHT: DEEP DARK QR CODE PANEL */}
          <div className="lg:col-span-1">
            <div className="sticky top-10 bg-slate-950 p-9 rounded-[3rem] shadow-2xl shadow-slate-950/30 border border-slate-800 flex flex-col items-center text-center overflow-hidden relative">

              {/* Decorative premium blurs */}
              <div className="absolute -top-16 -right-16 w-52 h-52 bg-indigo-600/40 rounded-full blur-[80px]"></div>
              <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-violet-600/30 rounded-full blur-[80px]"></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-2.5 bg-slate-800/80 text-indigo-300 px-5 py-2.5 rounded-full mb-10 text-sm font-extrabold border border-slate-700/50 backdrop-blur-md shadow-inner">
                  <QrCode size={18} /> Raqamli Menyu
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-3xl mb-10 transform hover:scale-105 transition-transform duration-500 ease-out cursor-pointer border border-slate-100">
                  <QRCode
                    id="qr-code-svg"
                    value={baseUrl ? `${baseUrl}/menu/${restaurantSlug}` : ""}
                    size={200}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#1e293b"
                  />
                </div>

                <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">QR Kod Tayyor</h2>
                <p className="text-slate-400 mb-10 text-base leading-relaxed font-medium">PNG formatida yuklab oling, chop eting va stollarga joylashtiring.</p>

                <Button onClick={downloadQR} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-7 rounded-2xl font-extrabold text-xl shadow-xl shadow-indigo-600/30 border border-indigo-500/50">
                  <Download className="w-6 h-6 mr-3" /> PNG Yuklash
                </Button>

                <a
                  href={`/menu/${restaurantSlug}`}
                  target="_blank"
                  className="mt-8 text-base text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2.5 font-semibold group"
                >
                  <Search size={18} className="group-hover:text-indigo-400 transition-colors" /> Menyuni ochiq havola orqali ko'rish
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM MODAL: ADD ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-3xl scale-100 overflow-y-auto max-h-[95vh] border border-slate-100">
            <div className="flex justify-between items-start mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Menyuga Taom Qo'shish</h2>
                <p className="text-slate-600 text-base mt-2 font-medium">Barcha kerakli ma'lumotlarni kiriting va saqlang</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">

              {/* Enhanced Image Upload Area */}
              <div>
                <label className="block w-full cursor-pointer group">
                  <div className={`relative w-full h-60 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-transparent bg-slate-950' : 'border-slate-300 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400'}`}>
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
                        <div className="p-5 bg-white rounded-2xl shadow-lg border border-slate-100 mb-5 group-hover:scale-110 group-hover:text-indigo-600 transition-all duration-300">
                          <ImagePlus className="w-10 h-10 text-slate-400 group-hover:text-indigo-500" strokeWidth={1.5} />
                        </div>
                        <span className="text-lg text-slate-800 font-extrabold mb-1">Yuqori sifatli rasm yuklang</span>
                        <span className="text-sm text-slate-500 font-medium">PNG, JPG (Tavsiya: kvadrat shakl, max: 5MB)</span>
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
                <label className="block text-sm font-extrabold text-slate-800 mb-2.5 pl-1">Taom Nomi <span className="text-red-500">*</span></label>
                <input
                  placeholder="Masalan: Maxsus Choyxona Palovi"
                  className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400 font-semibold text-slate-950 text-lg"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-2.5 pl-1">Menyu Bo'limi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none font-semibold text-slate-950 cursor-pointer text-lg"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-2.5 pl-1">Sotuv Narxi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-extrabold text-slate-950 text-xl pl-5 pr-20"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold bg-slate-100 px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider border border-slate-200">Uzs</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2.5 pl-1">Tarkibi yoki Izoh <span className="text-slate-400 font-medium">(ixtiyoriy)</span></label>
                <textarea
                  placeholder="Tarkibi: lazzatli guruch, go'sht, sabzi, maxsus ziravorlar va hk..."
                  className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400 font-medium min-h-[120px] resize-none text-base leading-relaxed"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1 py-7 rounded-2xl border-slate-200 text-slate-700 font-extrabold hover:bg-slate-100 h-auto text-lg transition-colors" onClick={closeModal}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="flex-[2] py-7 rounded-2xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 text-xl h-auto transition-all" isLoading={isSubmitting}>
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