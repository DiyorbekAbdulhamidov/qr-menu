"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, orderBy, getDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { MenuItem as BaseMenuItem } from "@/lib/types";
import { Plus, Trash2, Eye, EyeOff, Download, ImagePlus, X, ChefHat, Pencil, Settings, Clock, Square, CheckSquare, Search, AlertCircle, Layers, Check } from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";
import Image from "next/image";

export interface MenuItem extends BaseMenuItem { subCategory?: string; }
export interface CategoryData { id: string; name: string; startTime: string; endTime: string; isActive: boolean; }
interface FormData { name: string; description: string; price: string; categoryId: string; subCategory: string; image: File | null; existingImageUrl: string; isAvailable: boolean; }

const INITIAL_FORM: FormData = { name: "", description: "", price: "", categoryId: "", subCategory: "", image: null, existingImageUrl: "", isAvailable: true };
const DRINK_SUBCATEGORIES = ["Чай/Tea", "Кофе/Coffee", "Холодные напитки/Ice Drinks", "Фрешь/Fresh juices", "Фирменний чай/Specialty tea", "Молочные коктейли/Milkshake", "Напитки/Soft Drinks"];
const isDrinkCategory = (name: string) => /ichimlik|napitki|drink|напитки|bar/i.test(name);

export default function AdminDashboard() {
  const { mode, isDark, cycleTheme } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSavingCats, setIsSavingCats] = useState(false);
  const [draftCategories, setDraftCategories] = useState<CategoryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState("all");

  const router = useRouter();
  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  const fetchSettings = useCallback(async (slug: string) => {
    try {
      const snap = await getDoc(doc(db, "restaurants", slug));
      if (snap.exists()) {
        const data = snap.data();
        setCategories(data.categories || []);
      }
    } catch { toast.error("Sozlamalarni yuklashda xatolik"); }
  }, []);

  const fetchItems = useCallback(async (slug: string) => {
    try {
      const q = query(collection(db, "restaurants", slug, "menuItems"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)));
    } catch { toast.error("Menyuni yuklashda xatolik"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/admin/login"); return; }
      setUser(currentUser);
      try {
        const q = query(collection(db, "restaurants"), where("ownerId", "==", currentUser.uid));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const restDoc = qs.docs[0];
          setRestaurantName(restDoc.data().name?.trim() || "Premium Restoran");
          setRestaurantSlug(restDoc.id);
          fetchSettings(restDoc.id); fetchItems(restDoc.id);
        } else { setLoading(false); toast.error("Restoran topilmadi."); }
      } catch { setLoading(false); }
    });
    return () => unsub();
  }, [router, fetchItems, fetchSettings]);

  const filteredItems = useMemo(() => {
    if (activeCategoryId === "all") return items;
    const catName = categories.find(c => c.id === activeCategoryId)?.name;
    return items.filter(i => i.category === catName);
  }, [items, activeCategoryId, categories]);

  // HAMMASINI TANLASH MANTIQI (Faqat joriy kategoriyadagilarni tanlaydi/o'chiradi)
  const toggleSelectAll = () => {
    if (filteredItems.length === 0) return;
    const allFilteredIds = filteredItems.map(i => i.id);
    const isAllSelected = allFilteredIds.every(id => selectedIds.has(id));

    const newSet = new Set(selectedIds);
    if (isAllSelected) {
      allFilteredIds.forEach(id => newSet.delete(id));
    } else {
      allFilteredIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkAvailability = async (makeAvailable: boolean) => {
    if (!restaurantSlug || selectedIds.size === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.update(doc(db, "restaurants", restaurantSlug, "menuItems", id), { isAvailable: makeAvailable }));
      await batch.commit();
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, isAvailable: makeAvailable } : i));
      setSelectedIds(new Set()); toast.success(`Tanlangan taomlar ${makeAvailable ? "ochildi" : "yopildi"}`);
    } catch { toast.error("Xatolik yuz berdi"); }
  };

  const handleBulkDelete = async () => {
    if (!restaurantSlug || selectedIds.size === 0) return;
    if (!confirm(`Haqiqatan ham tanlangan ${selectedIds.size} ta taomni o'chirmoqchimisiz?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.delete(doc(db, "restaurants", restaurantSlug, "menuItems", id)));
      await batch.commit();
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set()); toast.success("Muvaffaqiyatli o'chirildi");
    } catch { toast.error("Xatolik yuz berdi"); }
  };

  const saveCategories = async () => {
    if (draftCategories.some(c => !c.name.trim())) return toast.error("Kategoriya nomi bo'sh bo'lishi mumkin emas!");
    setIsSavingCats(true);
    try {
      await updateDoc(doc(db, "restaurants", restaurantSlug), { categories: draftCategories });
      setCategories(draftCategories); toast.success("Kategoriyalar saqlandi!"); setIsCatModalOpen(false);
    } catch { toast.error("Xatolik yuz berdi"); } finally { setIsSavingCats(false); }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return; setIsCompressing(true);
    try {
      // YUQORI SIFATLI RASM YUKLASH (HD lekin optimizatsiya qilingan)
      const options = { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: true };
      const file = await imageCompression(e.target.files[0], options);
      setFormData(p => ({ ...p, image: file })); setImagePreview(URL.createObjectURL(file));
    } catch { toast.error("Rasm yuklashda xato"); } finally { setIsCompressing(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const catName = categories.find(c => c.id === formData.categoryId)?.name;
    if (!catName) return toast.error("Kategoriya tanlang!");
    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.existingImageUrl;
      if (formData.image) {
        const storageRef = ref(storage, `restaurants/${restaurantSlug}/${Date.now()}_${formData.image.name}`);
        await uploadBytes(storageRef, formData.image); finalImageUrl = await getDownloadURL(storageRef);
      }
      const itemData = {
        name: formData.name, description: formData.description, price: Number(formData.price),
        category: catName, subCategory: formData.subCategory, imageUrl: finalImageUrl, isAvailable: formData.isAvailable
      };
      if (editingId) await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", editingId), itemData);
      else await addDoc(collection(db, "restaurants", restaurantSlug, "menuItems"), { ...itemData, createdAt: Date.now() });
      toast.success("Muvaffaqiyatli saqlandi!"); setIsModalOpen(false); fetchItems(restaurantSlug);
    } catch { toast.error("Xato"); } finally { setIsSubmitting(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "restaurants", restaurantSlug, "menuItems", id));
      fetchItems(restaurantSlug); toast.success("Muvaffaqiyatli o'chirildi");
    } catch { toast.error("Xatolik yuz berdi"); }
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg"); if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new window.Image();
    const url = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      canvas.width = 1200; canvas.height = 1200;
      if (ctx) { ctx.fillStyle = "#FFF"; ctx.fillRect(0, 0, 1200, 1200); ctx.drawImage(img, 0, 0, 1200, 1200); }
      const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `${restaurantSlug}-qr.png`; a.click(); URL.revokeObjectURL(url);
    }; img.src = url;
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><ChefHat className="text-[#D4AF37] animate-pulse w-12 h-12" /></div>;
  const isDrinksSelected = isDrinkCategory(categories.find(c => c.id === formData.categoryId)?.name || "");

  return (
    <div className={cn("min-h-screen font-sans selection:bg-[#D4AF37] selection:text-black relative pb-32 transition-colors duration-500", isDark ? "bg-[#050505] text-white" : "bg-[#F5F5F7] text-[#111]")}>
      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-6 z-50 top-6" />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn("absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-30", isDark ? "bg-[#D4AF37]/10" : "bg-[#D4AF37]/5")} />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 pt-24">
        <header className={cn("mb-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 rounded-[2rem] p-6 sm:p-8 border shadow-xl backdrop-blur-3xl transition-all", isDark ? "bg-[#0A0A0A]/80 border-white/5" : "bg-white/80 border-black/5")}>
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C] flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.4)]"><Layers className="text-black w-8 h-8" strokeWidth={1.5} /></div>
            <div><p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-1">Restoran Boshqaruvi</p><h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>{restaurantName}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button onClick={() => { setDraftCategories(categories.length ? categories : [{ id: Math.random().toString(), name: "Yangi", startTime: "08:00", endTime: "23:00", isActive: true }]); setIsCatModalOpen(true); }} className={cn("flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-xs font-bold uppercase transition-all duration-300 hover:scale-105", isDark ? "border-white/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 text-white/70 hover:text-[#D4AF37]" : "border-black/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 text-black/70 hover:text-[#B38F24]")}>
              <Settings size={18} /> Kategoriyalar
            </button>
            <button onClick={() => { setFormData({ ...INITIAL_FORM, categoryId: categories.find(c => c.isActive)?.id || "" }); setIsModalOpen(true); setEditingId(null); setImagePreview(null); }} disabled={!categories.some(c => c.isActive)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-8 py-4 text-xs font-bold uppercase text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all duration-300 hover:scale-105 hover:bg-[#B38F24] disabled:opacity-50">
              <Plus size={18} strokeWidth={2.5} /> Yangi Taom
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 snap-x">
                <button onClick={() => { setActiveCategoryId("all"); setSelectedIds(new Set()) }} className={cn("snap-center flex-shrink-0 px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-sm", activeCategoryId === "all" ? "bg-[#D4AF37] text-black scale-105" : isDark ? "bg-[#111] text-zinc-400 hover:text-white" : "bg-white text-zinc-600 hover:text-black")}>Barchasi</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => { setActiveCategoryId(c.id); setSelectedIds(new Set()) }} className={cn("snap-center flex-shrink-0 px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-sm flex items-center gap-2", activeCategoryId === c.id ? "bg-[#D4AF37] text-black scale-105" : isDark ? "bg-[#111] text-zinc-400 hover:text-white" : "bg-white text-zinc-600 hover:text-black", !c.isActive && "opacity-40 grayscale")}>
                    {c.name} {!c.isActive && <span className="text-[8px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">Yopiq</span>}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={toggleSelectAll} className={cn("flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors", selectedIds.size > 0 && selectedIds.size === filteredItems.length ? "text-[#D4AF37]" : "text-zinc-500 hover:text-[#D4AF37]")}>
                  {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? "Barchasi tanlandi" : "Shu bo'limdagi barchasini tanlash"}
                </button>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center rounded-[2.5rem] border py-32 text-center transition-all", isDark ? "border-white/5 bg-[#111]/50" : "border-black/5 bg-white/50")}>
                <ChefHat size={48} className="text-[#D4AF37] mb-6 opacity-50" />
                <h3 className="text-2xl font-light mb-2">Bu joy hozircha bo'sh</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Yangi taom qo'shing yoki kategoriyani o'zgartiring</p>
              </div>
            ) : (
              // GORIZONTAL KARTALAR (Aynan rasmdagidek)
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {filteredItems.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div key={item.id} className={cn("relative flex flex-col rounded-[2rem] overflow-hidden border shadow-sm transition-all duration-300",
                      isDark ? "bg-[#111] border-white/5" : "bg-white border-black/5",
                      isSelected && "ring-2 ring-[#D4AF37] shadow-[0_10px_30px_rgba(212,175,55,0.15)]",
                      !item.isAvailable && "opacity-60")}>

                      {/* TANLASH TUGMASI */}
                      <button onClick={() => toggleSelect(item.id)} className="absolute top-4 right-4 z-20 p-2 rounded-full hover:scale-110 transition-transform">
                        {isSelected ? (
                          <div className="bg-[#D4AF37] text-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg"><Check size={14} strokeWidth={3} /></div>
                        ) : (
                          <div className={cn("w-6 h-6 rounded-full border-2 transition-colors", isDark ? "border-white/20 hover:border-white/50" : "border-black/20 hover:border-black/50")} />
                        )}
                      </button>

                      <div className="flex flex-row p-4 sm:p-5 pr-14 cursor-pointer" onClick={() => toggleSelect(item.id)}>
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[1.5rem] overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 border dark:border-white/5">
                          {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="128px" className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-zinc-400"><ChefHat size={32} /></div>}
                          {!item.isAvailable && <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-2 py-0.5 text-[8px] font-black uppercase rounded shadow-lg">Yashirin</div>}
                        </div>
                        <div className="ml-4 sm:ml-5 flex flex-col justify-center flex-1">
                          <h3 className={cn("font-bold text-[17px] sm:text-[20px] leading-tight", isDark ? "text-white" : "text-black")} style={{ fontFamily: "var(--font-playfair)" }}>{item.name}</h3>
                          <p className={cn("text-[11px] sm:text-[13px] mt-1 line-clamp-2 leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>{item.description || "Taom haqida ma'lumot yo'q."}</p>
                          <p className={cn("text-[17px] sm:text-[20px] font-black mt-3", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>{Number(item.price).toLocaleString()} <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-70">UZS</span></p>
                        </div>
                      </div>

                      {/* TUGMALAR BAR */}
                      <div className={cn("flex flex-row items-center border-t", isDark ? "border-white/5 bg-[#0A0A0A]" : "border-black/5 bg-zinc-50")}>
                        <button onClick={() => {
                          const catObj = categories.find(c => c.name.trim() === item.category.trim());
                          setEditingId(item.id);
                          setFormData({ name: item.name, description: item.description || "", price: String(item.price), categoryId: catObj?.id || (categories[0]?.id || ""), subCategory: item.subCategory || "", image: null, existingImageUrl: item.imageUrl || "", isAvailable: item.isAvailable });
                          setImagePreview(item.imageUrl || null); setIsModalOpen(true);
                        }} className="flex-1 py-3.5 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                          <Pencil size={14} /> Tahrirlash
                        </button>
                        <div className={cn("w-px h-6", isDark ? "bg-white/10" : "bg-black/10")} />
                        <button onClick={async () => { await updateDoc(doc(db, "restaurants", restaurantSlug, "menuItems", item.id), { isAvailable: !item.isAvailable }); fetchItems(restaurantSlug); }} className={cn("flex-1 py-3.5 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors", item.isAvailable ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10")}>
                          {item.isAvailable ? <><EyeOff size={14} /> Yashirish</> : <><Eye size={14} /> Ko'rsatish</>}
                        </button>
                        <div className={cn("w-px h-6", isDark ? "bg-white/10" : "bg-black/10")} />
                        <button onClick={() => deleteItem(item.id)} className="flex-1 py-3.5 flex items-center justify-center gap-2 text-red-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <Trash2 size={14} /> O'chirish
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className={cn("rounded-[2.5rem] border p-8 shadow-2xl flex flex-col items-center text-center transition-all", isDark ? "bg-gradient-to-b from-[#111] to-[#050505] border-white/5" : "bg-gradient-to-b from-white to-zinc-50 border-black/5")}>
                <div className="mb-6 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Stollar Uchun</div>
                <div className="relative mb-8 w-48 h-48 sm:w-56 sm:h-56 bg-white rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                  {baseUrl && restaurantSlug ? <QRCode id="qr-code-svg" value={`${baseUrl}/menu/${restaurantSlug}`} size={200} style={{ width: "100%", height: "100%" }} level="H" bgColor="#FFFFFF" fgColor="#000000" /> : <div className="w-full h-full animate-pulse bg-zinc-200 rounded-xl" />}
                </div>
                <h3 className="text-2xl font-light mb-3">Eksklyuziv QR Menu</h3>
                <p className="text-xs text-zinc-500 mb-8 px-4 leading-relaxed">Ushbu QR kodni yuklab oling va dizayn qilib stollarga joylashtiring.</p>
                <button onClick={downloadQR} className={cn("w-full py-4 rounded-2xl flex justify-center items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all", isDark ? "bg-[#111] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50" : "bg-black text-[#D4AF37] hover:bg-zinc-800")}><Download size={16} /> PNG Yuklash</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOAT BULK ACTIONS */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 rounded-full bg-black/95 border border-white/10 p-2 sm:p-3 pr-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-in slide-in-from-bottom-10">
          <div className="flex items-center justify-center h-10 w-10 bg-[#D4AF37] rounded-full text-black font-black text-sm">{selectedIds.size}</div>
          <div className="hidden sm:block w-px h-6 bg-white/20 mx-2" />
          <button onClick={() => handleBulkAvailability(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase text-emerald-400 hover:bg-emerald-500/20 transition-colors"><Eye size={16} /> <span className="hidden sm:inline">Aktivlashtirish</span></button>
          <button onClick={() => handleBulkAvailability(false)} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase text-amber-400 hover:bg-amber-500/20 transition-colors"><EyeOff size={16} /> <span className="hidden sm:inline">Yashirish</span></button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase text-red-500 hover:bg-red-500/20 transition-colors"><Trash2 size={16} /> <span className="hidden sm:inline">O'chirish</span></button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-zinc-500 hover:text-white p-2"><X size={18} /></button>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
            <div className="p-6 sm:p-8 border-b border-white/10 flex justify-between items-center bg-[#111]">
              <div><h2 className="text-xl sm:text-2xl font-light text-white tracking-tight">Kategoriya Sozlamalari</h2></div>
              <button onClick={() => setIsCatModalOpen(false)} className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto space-y-4 no-scrollbar">
              {draftCategories.map((cat, i) => (
                <div key={cat.id} className={cn("p-4 sm:p-6 rounded-[1.5rem] border transition-all", cat.isActive ? "border-white/10 bg-[#111]" : "border-red-500/30 bg-red-500/5 opacity-80 grayscale-[20%]")}>
                  <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
                    <div className="flex-1 w-full relative">
                      <input value={cat.name} onChange={(e) => { const n = [...draftCategories]; n[i].name = e.target.value; setDraftCategories(n); }} className="w-full bg-transparent border-b-2 border-white/10 pb-2 text-lg sm:text-xl text-white font-bold outline-none focus:border-[#D4AF37] transition-colors pr-8" placeholder="Kategoriya nomi..." />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      <div className="flex items-center gap-3 bg-black px-4 py-3 rounded-xl border border-white/10 shadow-inner flex-1 lg:flex-none">
                        <Clock size={16} className="text-[#D4AF37]" />
                        <input type="time" value={cat.startTime} onChange={(e) => { const n = [...draftCategories]; n[i].startTime = e.target.value; setDraftCategories(n); }} className="bg-transparent text-sm text-white outline-none font-mono" />
                        <span className="text-zinc-600">-</span>
                        <input type="time" value={cat.endTime} onChange={(e) => { const n = [...draftCategories]; n[i].endTime = e.target.value; setDraftCategories(n); }} className="bg-transparent text-sm text-white outline-none font-mono" />
                      </div>
                      <button onClick={() => { const n = [...draftCategories]; n[i].isActive = !n[i].isActive; setDraftCategories(n); }} className={cn("px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest flex-1 lg:flex-none transition-all", cat.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20")}>{cat.isActive ? "Aktiv" : "Yopiq"}</button>
                      <button onClick={() => { const n = draftCategories.filter(c => c.id !== cat.id); setDraftCategories(n); }} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setDraftCategories(p => [...p, { id: Math.random().toString(), name: "Yangi Kategoriya", startTime: "08:00", endTime: "23:00", isActive: true }])} className="w-full py-6 border-2 border-dashed border-white/10 rounded-[1.5rem] text-zinc-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all flex items-center justify-center gap-3 text-sm font-bold uppercase"><Plus size={20} /> Yangi Kategoriya Qo'shish</button>
            </div>
            <div className="p-4 sm:p-8 border-t border-white/10 flex gap-4 bg-[#111]">
              <button onClick={() => setIsCatModalOpen(false)} className="flex-[1] py-4 rounded-2xl border border-white/10 text-zinc-400 text-xs font-bold uppercase hover:bg-white/5 transition-all">Bekor</button>
              <button onClick={saveCategories} disabled={isSavingCats} className="flex-[2] py-4 rounded-2xl bg-[#D4AF37] text-black text-xs font-bold uppercase disabled:opacity-50 hover:scale-[1.02] transition-all">{isSavingCats ? "Saqlanmoqda..." : "Saqlash"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TAOM MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className={cn("relative w-full max-w-4xl max-h-[95vh] my-auto overflow-y-auto rounded-[2.5rem] border shadow-2xl animate-in zoom-in-95 flex flex-col", isDark ? "bg-[#0A0A0A] border-white/10" : "bg-white border-black/10")}>
            <div className={cn("flex items-center justify-between border-b px-6 sm:px-8 py-5 sm:py-6 flex-shrink-0 sticky top-0 z-10", isDark ? "bg-[#111] border-white/5" : "bg-white border-black/5")}>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>{editingId ? "Tahrirlash" : "Yangi Qo'shish"}</h2>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-1">{isDrinksSelected ? "Ichimlik parametrlari" : "Mukammal taqdimot"}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={cn("h-10 w-10 rounded-full border flex items-center justify-center transition-all", isDark ? "border-white/10 text-zinc-400 hover:bg-white/5" : "border-black/10 text-zinc-500 hover:bg-black/5")}><X size={20} /></button>
            </div>
            <div className="p-5 sm:p-8 no-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block pl-2">Kategoriya <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select required value={formData.categoryId} onChange={(e) => setFormData(p => ({ ...p, categoryId: e.target.value, subCategory: "" }))} className={cn("w-full appearance-none rounded-2xl border p-4 text-sm font-bold outline-none transition-all cursor-pointer focus:border-[#D4AF37]", isDark ? "bg-[#111] border-white/10 text-white" : "bg-zinc-50 border-black/10 text-black")}>
                        <option value="" disabled>Kategoriyani tanlang...</option>
                        {categories.filter(c => c.isActive).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#D4AF37]">▼</div>
                    </div>
                  </div>
                  {isDrinksSelected && (
                    <div className="animate-in fade-in">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2 block pl-2">Ichimlik Turi <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select required value={formData.subCategory} onChange={(e) => setFormData(p => ({ ...p, subCategory: e.target.value }))} className={cn("w-full appearance-none rounded-2xl border border-[#D4AF37]/50 p-4 text-sm font-bold outline-none cursor-pointer", isDark ? "bg-[#D4AF37]/5 text-[#D4AF37]" : "bg-[#D4AF37]/10 text-[#B38F24]")}>
                          <option value="" disabled>Turini tanlang...</option>
                          {DRINK_SUBCATEGORIES.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#D4AF37]">▼</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block pl-2">Rasm {isDrinksSelected && "(Majburiy emas)"}</label>
                    <label className={cn("group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed transition-all", isDark ? "bg-[#111] border-white/10 hover:border-[#D4AF37]" : "bg-white border-black/10 hover:border-[#D4AF37]", isCompressing && "opacity-50")}>
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"><span className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase">O'zgartirish</span></div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-center p-6">
                          <div className={cn("mb-4 rounded-full p-6 transition-transform group-hover:scale-110 group-hover:text-[#D4AF37]", isDark ? "bg-white/5 text-zinc-500" : "bg-black/5 text-zinc-400")}>{isCompressing ? <div className="animate-spin border-2 border-[#D4AF37] border-t-transparent w-8 h-8 rounded-full" /> : <ImagePlus size={36} strokeWidth={1.5} />}</div>
                          <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-black")}>Rasm yuklash</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isCompressing} />
                    </label>
                  </div>
                </div>
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block pl-2">Nomi <span className="text-red-500">*</span></label>
                    <input required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className={cn("w-full rounded-2xl border bg-transparent p-4 sm:p-5 text-lg font-bold outline-none focus:border-[#D4AF37]", isDark ? "border-white/10 text-white" : "border-black/10 text-black")} placeholder="Masalan: Wagyu A5 Steak" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block pl-2">Narxi <span className="text-red-500">*</span></label>
                    <div className={cn("flex items-center rounded-2xl border transition-all focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]", isDark ? "border-white/10 bg-transparent" : "border-black/10 bg-white")}>
                      <input required type="number" min="0" value={formData.price} onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))} className="flex-1 bg-transparent p-4 sm:p-5 text-xl font-black text-[#D4AF37] outline-none" placeholder="0" />
                      <div className={cn("pr-5 pl-3 border-l text-sm font-bold uppercase tracking-widest", isDark ? "border-white/5 text-zinc-500" : "border-black/5 text-zinc-400")}>UZS</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block pl-2">Tarkibi va Tavsifi</label>
                    <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className={cn("h-[120px] sm:h-[140px] w-full resize-none rounded-2xl border bg-transparent p-4 sm:p-5 text-sm font-medium outline-none focus:border-[#D4AF37]", isDark ? "border-white/10 text-zinc-300" : "border-black/10 text-zinc-700")} placeholder="Batafsil ma'lumot..." />
                  </div>
                </div>
              </form>
            </div>
            <div className={cn("p-5 sm:p-8 border-t flex gap-4 mt-auto sticky bottom-0 z-10", isDark ? "bg-[#111] border-white/5" : "bg-white border-black/5")}>
              <button type="button" onClick={() => setIsModalOpen(false)} className={cn("flex-1 py-3.5 sm:py-4 rounded-2xl border text-xs font-bold uppercase", isDark ? "border-white/10 text-zinc-400 hover:bg-white/5" : "border-black/10 text-zinc-600 hover:bg-black/5")}>Bekor qilish</button>
              <button onClick={handleSubmit} disabled={isSubmitting || isCompressing || !formData.categoryId || (isDrinksSelected && !formData.subCategory)} className="flex-[2] py-3.5 sm:py-4 rounded-2xl bg-[#D4AF37] text-black text-xs font-bold uppercase shadow-[0_10px_30px_rgba(212,175,55,0.3)] disabled:opacity-50 hover:scale-[1.02] transition-all">{isSubmitting ? "Kuting..." : editingId ? "Tahrirni Saqlash" : "Qo'shish"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}