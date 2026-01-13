import "server-only";
import * as admin from "firebase-admin";

const serviceAccount = require("../../service-account.json"); // Ildizdagi fayl yo'li

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "toybron-38387.firebasestorage.app" // O'zingizni bucket nomingiz
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();