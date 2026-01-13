import "server-only";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercelda qator tashlash belgilarini to'g'ri o'qish uchun:
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: "toybron-38387.firebasestorage.app"
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();