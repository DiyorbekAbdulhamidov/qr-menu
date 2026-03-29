"use client";

import Link from "next/link";
import { ArrowRight, QrCode, Smartphone, Zap, ShieldCheck, ChefHat, Sparkles, Command } from "lucide-react";
import { useAppTheme } from "@/lib/useAppTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { mode, isDark, cycleTheme } = useAppTheme();

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-[#D4AF37]/30 selection:text-inherit overflow-x-hidden transition-colors duration-700",
      isDark ? "bg-[#030303] text-white" : "bg-[#F9F8F6] text-[#0a1915]"
    )}>

      {/* AMBIENT BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={cn("absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[150px] opacity-30 animate-[pulse_10s_ease-in-out_infinite]", isDark ? "bg-[#D4AF37]/20" : "bg-[#D4AF37]/15")} />
        <div className={cn("absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20 animate-[pulse_12s_ease-in-out_infinite_reverse]", isDark ? "bg-white/10" : "bg-[#0a2f26]/5")} />
      </div>

      <ThemeToggle mode={mode} onCycle={cycleTheme} isDark={isDark} className="fixed right-6 z-50 top-6" />

      {/* FLOATING NAVBAR */}
      <nav className="fixed top-6 left-1/2 z-50 -translate-x-1/2 w-[90%] max-w-5xl">
        <div className={cn(
          "flex items-center justify-between rounded-full border px-6 py-3 backdrop-blur-[40px] shadow-2xl transition-all duration-500",
          isDark ? "bg-white/[0.03] border-white/10 shadow-black/50" : "bg-white/70 border-white shadow-[#D4AF37]/10"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C] text-black shadow-lg">
              <Command size={20} strokeWidth={2} />
            </div>
            <span className="text-lg font-black tracking-widest uppercase" style={{ fontFamily: "var(--font-playfair)" }}>
              Webleaders
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
            <Link href="#features" className={cn("transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black")}>Afzalliklar</Link>
            <Link href="/menu/demo" className={cn("transition-colors", isDark ? "text-zinc-400 hover:text-[#D4AF37]" : "text-zinc-500 hover:text-[#D4AF37]")}>Demo Menyu</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/admin/login" className={cn(
              "hidden md:flex items-center justify-center rounded-full border px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
              isDark ? "border-white/20 hover:bg-white hover:text-black" : "border-black/20 hover:bg-black hover:text-white"
            )}>
              Kirish
            </Link>
            <Link href="/admin/login" className="flex items-center justify-center rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B38F24] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-black shadow-[0_10px_20px_rgba(212,175,55,0.3)] hover:scale-105 transition-transform">
              Boshlash
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-40 pb-20 sm:pt-48 sm:pb-32 lg:flex lg:items-center lg:gap-16">

        {/* Text Content */}
        <div className="lg:w-1/2 lg:pr-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 backdrop-blur-md">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Yangi davr menyulari</span>
          </div>

          <h1 className={cn(
            "mb-8 text-6xl font-extrabold leading-[1.05] tracking-tighter drop-shadow-xl sm:text-7xl lg:text-[5.5rem]",
            isDark ? "text-white" : "text-[#0a1915]"
          )}>
            Restoraningiz <br />
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#B38F24] bg-clip-text text-transparent">raqamli</span> yuzi.
          </h1>

          <p className={cn(
            "mb-10 max-w-xl text-lg font-light leading-relaxed tracking-wide sm:text-xl",
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Qog'oz menyulardan voz keching. Mijozlaringizni 7 yulduzli interfeys, chaqmoq tezligi va hashamatli dizayn bilan lol qoldiring. WEBLEADERS bilan biznesingizni yangi bosqichga olib chiqing.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Link href="/admin/login" className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B38F24] px-8 font-bold text-black shadow-[0_15px_30px_rgba(212,175,55,0.3)] transition-all hover:scale-105 sm:w-auto">
              <span className="relative z-10 text-sm uppercase tracking-widest flex items-center gap-2">
                Tizimni yaratish <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 z-0 bg-white/20 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
            </Link>

            <Link href="/menu/demo" className={cn(
              "flex h-16 w-full items-center justify-center gap-3 rounded-full border px-8 text-sm font-bold uppercase tracking-widest transition-colors sm:w-auto",
              isDark ? "border-white/20 hover:bg-white/10" : "border-black/20 hover:bg-black/5"
            )}>
              <Smartphone size={18} /> Demoni ko'rish
            </Link>
          </div>
        </div>

        {/* Hero Visuals (Glass Mockup) */}
        <div className="mt-20 lg:mt-0 lg:w-1/2 animate-in fade-in slide-in-from-right-10 duration-1000 delay-300 ease-out hidden md:block">
          <div className="relative mx-auto w-full max-w-[400px] aspect-[4/5]">
            {/* Background blur blocks behind the phone */}
            <div className="absolute top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-[60px] opacity-50 animate-pulse" />
            <div className="absolute bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-[#D4AF37] to-orange-500 rounded-full blur-[60px] opacity-50 animate-pulse" />

            {/* The Glass Phone Mockup */}
            <div className={cn(
              "relative z-10 h-full w-full rounded-[3rem] border-4 p-4 shadow-[0_40px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-transform duration-1000 hover:-translate-y-4 hover:rotate-2",
              isDark ? "border-white/10 bg-white/5" : "border-white bg-white/40"
            )}>
              <div className={cn("h-full w-full rounded-[2.2rem] overflow-hidden relative", isDark ? "bg-[#050505]" : "bg-[#FAF9F6]")}>
                {/* Mockup content inside */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                  <div className="mb-4 inline-block rounded-full bg-[#D4AF37] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-lg">Premium</div>
                  <h3 className="mb-2 text-3xl font-bold tracking-tight">Wagyu Steak</h3>
                  <p className="mb-4 text-sm font-light text-zinc-300">Maxsus pishirilgan mol go'shti, qora truffle sousi bilan.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#D4AF37]">450,000 <span className="text-[10px] text-white">UZS</span></span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"><ArrowRight size={16} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FEATURES SECTION */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-20 text-center">
          <h2 className={cn("text-sm font-bold uppercase tracking-[0.3em]", isDark ? "text-[#D4AF37]" : "text-[#B38F24]")}>Nega aynan biz?</h2>
          <p className={cn("mt-4 text-4xl font-light tracking-tight sm:text-5xl", isDark ? "text-white" : "text-black")}>Texnologiya va Hashamat uyg'unligi</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Feature 1 */}
          <div className={cn(
            "group rounded-[2.5rem] border p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
            isDark ? "bg-white/[0.02] border-white/5 hover:border-[#D4AF37]/30" : "bg-white border-black/5 hover:border-[#D4AF37]/30"
          )}>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#D4AF37] to-[#8A6D1C] text-black shadow-lg">
              <QrCode size={28} strokeWidth={1.5} />
            </div>
            <h3 className={cn("mb-4 text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Instant QR texnologiyasi</h3>
            <p className={cn("font-light leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
              Mijozlar hech qanday ilova yuklab olishi shart emas. Kamerani yo'naltiradi va menyu soniyada ekranda jilolanadi.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={cn(
            "group rounded-[2.5rem] border p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
            isDark ? "bg-white/[0.02] border-white/5 hover:border-[#D4AF37]/30" : "bg-white border-black/5 hover:border-[#D4AF37]/30"
          )}>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-lg">
              <Zap size={28} strokeWidth={1.5} />
            </div>
            <h3 className={cn("mb-4 text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Chaqmoq tezligi</h3>
            <p className={cn("font-light leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
              Next.js 15 va Firebase Edge serverlari orqali rasmlar va ma'lumotlar kutilganidan ham tezroq ochiladi.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={cn(
            "group rounded-[2.5rem] border p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
            isDark ? "bg-white/[0.02] border-white/5 hover:border-[#D4AF37]/30" : "bg-white border-black/5 hover:border-[#D4AF37]/30"
          )}>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg">
              <ShieldCheck size={28} strokeWidth={1.5} />
            </div>
            <h3 className={cn("mb-4 text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Mustaqil boshqaruv</h3>
            <p className={cn("font-light leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
              Narxlar o'zgardimi? Taom qolmadimi? Hammasini o'z smartfoningizdan bir marta bosish orqali boshqaring.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={cn("relative z-10 border-t py-12", isDark ? "border-white/10 bg-[#050505]" : "border-black/5 bg-zinc-50")}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Command size={20} className="text-[#D4AF37]" />
            <span className="text-xl font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-playfair)" }}>Webleaders</span>
          </div>
          <p className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-zinc-400")}>
            &copy; {new Date().getFullYear()} Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
            <Link href="https://t.me/webleaders_admin" className={cn("transition-colors hover:text-[#D4AF37]", isDark ? "text-zinc-500" : "text-zinc-400")}>Telegram</Link>
            <Link href="https://instagram.com/webleaders" className={cn("transition-colors hover:text-[#D4AF37]", isDark ? "text-zinc-500" : "text-zinc-400")}>Instagram</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}