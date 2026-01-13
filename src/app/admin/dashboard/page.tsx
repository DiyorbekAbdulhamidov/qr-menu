"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { MenuItem } from "@/lib/types";
import { Loader2, Plus, Trash2, Edit2, Eye, EyeOff, Download, ImagePlus, UtensilsCrossed } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";

// Tayyor kategoriyalar ro'yxati (yozish shart emas, tanlash kifoya)
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

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Quyuq taomlar", // Default qiymat
    image: null as File | null,
  });
  // Rasm preview uchun
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // 1. Auth & Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }
      setUser(currentUser);

      const q = query(collection(db, "restaurants"), where("ownerId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const restDoc = querySnapshot.docs[0];
        setRestaurantSlug(restDoc.id);
        fetchItems(restDoc.id);
      } else {
        toast.error("Sizga tegishli restoran topilmadi.");
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
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Menyuni yuklashda xatolik");
    }
  };

  // 2. Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, image: file });
      // Rasm preview qilish
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

      toast.success("Taom menyuga qo'shildi!");
      setIsModalOpen(false);
      // Formani tozalash
      setFormData({ name: "", description: "", price: "", category: "Quyuq taomlar", image: null });
      setImagePreview(null);
      fetchItems(restaurantSlug);
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id), {
        isAvailable: !currentStatus
      });
      fetchItems(restaurantSlug);
      toast.success(currentStatus ? "Taom vaqtincha o'chirildi" : "Taom yana menyuda");
    } catch (e) { toast.error("Status o'zgarmadi"); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id));
      toast.success("Taom o'chirildi");
      fetchItems(restaurantSlug);
    } catch (e) { toast.error("O'chirishda xatolik"); }
  };

  // QR Downloader
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
        canvas.width = 1000; // Yuqori sifat uchun
        canvas.height = 1000;
        ctx?.drawImage(img, 0, 0, 1000, 1000); // Resize
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${restaurantSlug}-qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      img.src = url;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10">
      <Toaster position="top-center" />

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Mening Restoranim</h1>
            <p className="text-neutral-500">ID: {restaurantSlug}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-5 h-5 mr-2" /> Taom Qo'shish
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5" /> Menyudagi taomlar
            </h2>

            {items.length === 0 && (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-neutral-300">
                <p className="text-neutral-400">Hozircha menyu bo'sh. "Taom qo'shish" tugmasini bosing.</p>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-neutral-100 rounded-lg overflow-hidden relative border border-neutral-200">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <ImagePlus size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-800">{item.name}</h3>
                    <p className="text-sm text-neutral-500 font-medium">{Number(item.price).toLocaleString()} so'm</p>
                    <span className="inline-block mt-1 text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailability(item.id, item.isAvailable)}
                    className={`p-2.5 rounded-xl transition-colors ${item.isAvailable ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-neutral-400 bg-neutral-100 hover:bg-neutral-200'}`}
                    title={item.isAvailable ? "Menyudan yashirish" : "Menyuda ko'rsatish"}
                  >
                    {item.isAvailable ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    title="O'chirib tashlash"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
              <h2 className="text-lg font-bold mb-2">QR Menyu kodi</h2>
              <p className="text-sm text-neutral-500 mb-6">Mijozlar ushbu kodni skanerlab menyuni ko'rishadi</p>

              <div className="bg-white p-3 rounded-xl shadow-inner border border-neutral-200 mb-6">
                <QRCode
                  id="qr-code-svg"
                  value={`${window.location.origin}/menu/${restaurantSlug}`}
                  size={200}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>

              <Button onClick={downloadQR} className="w-full bg-black text-white hover:bg-neutral-800">
                <Download className="w-4 h-4 mr-2" /> QR Kodni Yuklab Olish
              </Button>

              <div className="mt-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg w-full text-left">
                <strong>Maslahat:</strong> Bu QR kodni chop etib, stollarga yopishtiring.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl scale-100">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold">Yangi Taom Qo'shish</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Rasm Yuklash */}
              <div className="flex justify-center">
                <label className="cursor-pointer group relative w-full h-40 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors flex flex-col items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-neutral-400 mb-2 group-hover:text-neutral-600" />
                      <span className="text-sm text-neutral-500 font-medium">Rasm yuklash uchun bosing</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              {/* Nomi */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Taom nomi</label>
                <input
                  placeholder="Masalan: Osh, Kabob..."
                  className="w-full p-3 bg-white rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black focus:outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Kategoriya va Narx */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Bo'lim</label>
                  <select
                    className="w-full p-3 bg-white rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black focus:outline-none"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {PREDEFINED_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Narxi (so'm)</label>
                  <input
                    placeholder="0"
                    type="number"
                    className="w-full p-3 bg-white rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black focus:outline-none"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tarkibi / Izoh (ixtiyoriy)</label>
                <textarea
                  placeholder="Masalan: Go'sht, guruch, sabzi..."
                  className="w-full p-3 bg-white rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black focus:outline-none"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1 py-6 rounded-xl" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
                <Button type="submit" className="flex-1 py-6 bg-black text-white hover:bg-neutral-800 rounded-xl" isLoading={isSubmitting}>
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