"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function createRestaurantAction(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !slug || !email || !password) {
    return { success: false, message: "Barcha maydonlarni to'ldiring!" };
  }

  try {
    // 1. Slagni tekshirish (band emasmi)
    const docCheck = await adminDb.collection("restaurants").doc(slug).get();
    if (docCheck.exists) {
      return { success: false, message: "Bu Slug allaqachon band!" };
    }

    // 2. Auth User yaratish
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 3. Firestorega yozish
    await adminDb.collection("restaurants").doc(slug).set({
      name,
      ownerId: user.uid,
      logoUrl: "",
      themeColor: "#000000",
      createdAt: Date.now(),
      isActive: true
    });

    return { success: true, message: "Restoran muvaffaqiyatli yaratildi!" };
  } catch (error: any) {
    const code = error?.errorInfo?.code ?? error?.code;
    if (code === "auth/email-already-exists") {
      return {
        success: false,
        message:
          "Bu email bilan Firebase'da akkaunt bor. Boshqa email tanlang yoki Authentication'dan eski foydalanuvchini o'chiring.",
      };
    }
    if (
      typeof error?.message === "string" &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("invalid_rapt") ||
        error.message.includes("Could not load the default credentials"))
    ) {
      return {
        success: false,
        message:
          "Server: Firebase Admin kaliti noto'g'ri. .env.local dagi FIREBASE_CLIENT_EMAIL va FIREBASE_PRIVATE_KEY bir xil JSON fayldan olinganini tekshiring.",
      };
    }
    return { success: false, message: error.message ?? "Noma'lum xato" };
  }
}