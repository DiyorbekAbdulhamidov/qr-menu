"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Loader2, Plus, Trash2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed, LogOut, LayoutDashboard } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";

// Tayyor kategoriyalar (Yozib o'tirmaslik uchun)
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
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Vercel/Server xatoligini oldini olish uchun Base URL
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Form states
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

  // 1. Tizim ishga tushganda (Auth & URL check)
  useEffect(() => {
    // Brauzerda ekanligimizni tekshirib URLni olamiz (Vercel fix)
    setBaseUrl(window.location.origin);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }
      setUser(currentUser);

      // Foydalanuvchining restoranini topish
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

  // Taomlarni yuklash funksiyasi
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

  // 2. Handlers (Boshqaruv funksiyalari)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
      // Agar rasm tanlangan bo'lsa, Firebase Storagega yuklaymiz
      if (formData.image) {
        const storageRef = ref(storage, `restaurants/${restaurantSlug}/${Date.now()}_${formData.image.name}`);
        await uploadBytes(storageRef, formData.image);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Firestorega yozamiz
      await addDoc(collection(db, "restaurants", restaurantSlug, "menuItems"), {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        imageUrl, // Bo'sh bo'lsa ham mayli
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
      // Optimistik UI (kutib o'tirmasdan darhol o'zgartirish)
      setItems(items.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));

      await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id), {
        isAvailable: !currentStatus
      });
      toast.success(currentStatus ? "Taom vaqtincha yashirildi" : "Taom yana menyuda!");
    } catch (e) {
      toast.error("Statusni o'zgartirib bo'lmadi");
      fetchItems(restaurantSlug); // Xato bo'lsa orqaga qaytarish
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
    try {
      setItems(items.filter(item => item.id !== id)); // Darhol ro'yxatdan olib tashlash
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

  // QR Code Download Logic
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
        canvas.width = 1200; // High Quality
        canvas.height = 1200;

        // Oq fon qo'shish (muhim, aks holda shaffof bo'lib qoladi)
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
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-neutral-50">
      <Loader2 className="animate-spin w-10 h-10 text-neutral-400" />
      <p className="text-neutral-500 text-sm">Tizim yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-black text-white p-3 rounded-xl">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-neutral-500 text-sm mt-1">Restoran ID: <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded text-black">{restaurantSlug}</span></p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={handleLogout} className="flex-1 md:flex-none border-red-100 text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4 mr-2" /> Chiqish
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-black text-white hover:bg-neutral-800 shadow-lg shadow-neutral-200">
              <Plus className="w-5 h-5 mr-2" /> Taom Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: MENU LIST */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-neutral-400" /> Menyudagi taomlar
              </h2>
              <span className="text-sm text-neutral-500 bg-white px-3 py-1 rounded-full border border-neutral-200">{items.length} ta taom</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-neutral-300 flex flex-col items-center">
                <div className="bg-neutral-50 p-4 rounded-full mb-4">
                  <UtensilsCrossed className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">Menyu hozircha bo'sh</h3>
                <p className="text-neutral-500 mb-6 max-w-xs mx-auto">Mijozlaringiz ko'rishi uchun birinchi taomni qo'shing.</p>
                <Button onClick={() => setIsModalOpen(true)}>Birinchi taomni qo'shish</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className={`group bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between transition-all hover:shadow-md ${!item.isAvailable ? 'opacity-70 bg-neutral-50' : ''}`}>
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 bg-neutral-50 rounded-xl overflow-hidden relative border border-neutral-100 flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <ImagePlus size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-neutral-900">{item.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md text-sm">
                            {Number(item.price).toLocaleString()} so'm
                          </span>
                          <span className="text-xs text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        {!item.isAvailable && <span className="text-xs text-red-500 font-bold mt-1 block">• Vaqtincha yo'q</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-4">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={`p-2.5 rounded-xl transition-all ${item.isAvailable ? 'text-neutral-400 hover:text-green-600 hover:bg-green-50' : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        title={item.isAvailable ? "Yashirish" : "Ko'rsatish"}
                      >
                        {item.isAvailable ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2.5 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="O'chirish"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: QR CODE */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-xl w-full mb-6 text-sm font-medium">
                ⚡️ Tezkor havola
              </div>

              <div className="bg-white p-4 rounded-xl shadow-inner border border-neutral-200 mb-6">
                <QRCode
                  id="qr-code-svg"
                  value={baseUrl ? `${baseUrl}/menu/${restaurantSlug}` : ""}
                  size={200}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>

              <h2 className="text-lg font-bold mb-1">QR Kodni yuklab oling</h2>
              <p className="text-sm text-neutral-400 mb-6">Stollar uchun chop etishga tayyor</p>

              <Button onClick={downloadQR} className="w-full bg-neutral-900 text-white hover:bg-black py-6 rounded-xl">
                <Download className="w-5 h-5 mr-2" /> PNG Yuklash
              </Button>

              <a
                href={`/menu/${restaurantSlug}`}
                target="_blank"
                className="mt-4 text-sm text-blue-600 hover:underline flex items-center justify-center gap-1"
              >
                Menyuni brauzerda ko'rish ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl scale-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Yangi Taom</h2>
                <p className="text-neutral-500 text-sm">Menyuga yangi pozitsiya qo'shish</p>
              </div>
              <button onClick={closeModal} className="p-2 bg-neutral-100 rounded-full hover:bg-neutral-200 text-neutral-500">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Image Upload Area */}
              <div>
                <label className="block w-full cursor-pointer group">
                  <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-neutral-200 bg-white' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400'}`}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white font-medium text-sm">Rasmni o'zgartirish</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                          <ImagePlus className="w-6 h-6 text-neutral-400" />
                        </div>
                        <span className="text-sm text-neutral-600 font-medium">Rasm yuklash</span>
                        <span className="text-xs text-neutral-400 mt-1">PNG, JPG (max 5MB)</span>
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
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Taom nomi</label>
                <input
                  placeholder="Masalan: Choyxona palov"
                  className="w-full p-3.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 placeholder:text-neutral-400 font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Bo'lim</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 appearance-none font-medium"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Narxi</label>
                  <div className="relative">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full p-3.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 font-medium pl-3"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">so'm</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Izoh (ixtiyoriy)</label>
                <textarea
                  placeholder="Tarkibi: qo'y go'shti, guruch..."
                  className="w-full p-3.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 placeholder:text-neutral-400 font-medium min-h-[80px]"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button type="button" variant="ghost" className="py-6 rounded-xl hover:bg-neutral-100 text-neutral-600" onClick={closeModal}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="py-6 rounded-xl bg-black text-white hover:bg-neutral-800 shadow-xl shadow-black/10" isLoading={isSubmitting}>
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