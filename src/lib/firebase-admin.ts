import "server-only";
import * as admin from "firebase-admin";

/** .env da qo'shtirnoq yoki \\n noto'g'ri bo'lsa OpenSSL 1E08010C beradi */
function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  let k = raw.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, "\n").trimEnd();
}

if (!admin.apps.length) {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = json?.trim()
    ? (() => {
        const parsed = JSON.parse(json) as { private_key?: string };
        if (typeof parsed.private_key === "string") {
          parsed.private_key = normalizePrivateKey(parsed.private_key);
        }
        // Firebase JSON: project_id, client_email, private_key (snake_case)
        return admin.credential.cert(parsed as Parameters<typeof admin.credential.cert>[0]);
      })()
    : admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      });

  admin.initializeApp({
    credential,
    storageBucket: "toybron-38387.firebasestorage.app",
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();