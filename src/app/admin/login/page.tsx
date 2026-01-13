"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast, Toaster } from "react-hot-toast";
import { Lock, Mail, ChefHat } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ... boshqa importlar
  const SUPER_ADMIN_EMAIL = "admin@webleaders.uz"; // O'sha email
  // ... component ichida
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Xush kelibsiz!");

      // MANTIQNI O'ZGARTIRAMIZ:
      if (email === SUPER_ADMIN_EMAIL) {
        router.push("/superadmin"); // Super adminni o'z paneliga
      } else {
        router.push("/admin/dashboard"); // Restoran egalarini o'z paneliga
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Login yoki parol xato!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Toaster position="top-center" />

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-neutral-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
            <ChefHat size={24} />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900">
            Admin Panelga kirish
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            QR Menu tizimini boshqarish uchun tizimga kiring
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="block w-full rounded-xl border-0 py-3 pl-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                placeholder="Email manzil"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-xl border-0 py-3 pl-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                placeholder="Parol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full py-3"
              isLoading={isLoading}
            >
              Kirish
            </Button>
          </div>
        </form>

        {/* Test uchun eslatma */}
        <p className="text-center text-xs text-neutral-400 mt-4">
          {/* Agar akkauntingiz bo'lmasa, ma'lumotlar bazasida qo'lda yaratishingiz kerak. */}
        </p>
      </div>
    </div>
  );
}