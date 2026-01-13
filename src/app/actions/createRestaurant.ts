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
    return { success: false, message: error.message };
  }
}