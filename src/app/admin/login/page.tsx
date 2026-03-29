"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { ScanFace, Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const SUPER_ADMIN_EMAIL = "admin@qr-menu-webleaders.uz";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const trimmedEmail = email.trim();

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);

      toast.success("Tizimga muvaffaqiyatli kirdingiz", {
        style: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', color: '#000', borderRadius: '16px', fontSize: '14px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }
      });

      if (trimmedEmail === SUPER_ADMIN_EMAIL) {
        router.push("/superadmin");
      } else {
        router.push("/admin/dashboard");
      }

    } catch (error: any) {
      console.error("Login xatosi:", error);
      const code = error?.code as string | undefined;

      const errorStyle = { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', color: '#FF3B30', borderRadius: '16px', fontSize: '14px', fontWeight: '500', boxShadow: '0 8px 30px rgba(255,59,48,0.15)' };

      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        toast.error("Email yoki parol noto'g'ri.", { style: errorStyle });
      } else if (code === "auth/invalid-email") {
        toast.error("Email formati noto'g'ri.", { style: errorStyle });
      } else if (code === "auth/too-many-requests") {
        toast.error("Ko'p urinishlar. Birozdan so'ng qayta urinib ko'ring.", { style: errorStyle });
      } else {
        toast.error("Tizimga kirishda xatolik yuz berdi.", { style: errorStyle });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F5F5F7] p-6 font-sans overflow-hidden selection:bg-blue-500/30 selection:text-blue-900">
      <Toaster position="top-center" reverseOrder={false} />

      {/* AMBIENT BACKGROUND GLOWS (Glass effekti ishlashi uchun) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-400/20 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-[pulse_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] bg-orange-300/15 rounded-full blur-[100px] mix-blend-multiply opacity-50" />
      </div>

      {/* MAIN GLASS CONTAINER */}
      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">

        <div className="bg-white/40 backdrop-blur-[40px] border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-8 md:p-10">

          {/* HEADER */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-20 w-20 bg-white/50 border border-white/80 text-black rounded-[1.8rem] shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex items-center justify-center mb-6">
              <ScanFace size={36} strokeWidth={1.5} className="text-[#1D1D1F]" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] mb-2">
              Xush kelibsiz
            </h1>
            <p className="text-[15px] text-[#86868B] font-medium tracking-wide">
              WEBLEADERS boshqaruv markazi
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-4">
              {/* EMAIL INPUT */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-[#86868B]">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="block w-full bg-white/50 hover:bg-white/70 focus:bg-white/90 border border-white/60 focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10 rounded-[1.2rem] py-4 pl-12 pr-4 text-[#1D1D1F] placeholder:text-[#86868B] transition-all duration-300 sm:text-[15px] font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                  placeholder="Email manzil"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* PASSWORD INPUT */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-[#86868B]">
                  <LockKeyhole size={20} strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full bg-white/50 hover:bg-white/70 focus:bg-white/90 border border-white/60 focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10 rounded-[1.2rem] py-4 pl-12 pr-4 text-[#1D1D1F] placeholder:text-[#86868B] transition-all duration-300 sm:text-[15px] font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                  placeholder="Maxfiy parol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-[#1D1D1F] hover:bg-[#000000] text-white active:scale-[0.98] font-medium py-4 rounded-[1.2rem] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 text-[15px] shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Tekshirilmoqda...
                </span>
              ) : (
                <>
                  Davom etish <ArrowRight size={18} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* BOTTOM SECURITY BADGE */}
        <div className="mt-8 flex justify-center items-center gap-1.5 text-[#86868B]">
          <ShieldCheck size={16} strokeWidth={1.5} />
          <span className="text-[12px] font-medium tracking-wide">
            Apple-grade security encryption
          </span>
        </div>

      </div>
    </div>
  );
}