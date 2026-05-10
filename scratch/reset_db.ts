
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, query } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local to avoid needing extra dependencies
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) env[key.trim()] = value.trim();
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetCollections() {
  const collections = ["batches", "candidates", "attendance_logs", "assessment_logs", "system_alerts", "audit_logs"];
  
  console.log("🚀 Starting Master Reset...");

  for (const collName of collections) {
    try {
      const q = query(collection(db, collName));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        console.log(`  - ${collName} is already empty.`);
        continue;
      }

      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
      console.log(`  ✅ Cleared ${snap.size} documents from ${collName}.`);
    } catch (e) {
      console.log(`  ⚠️ Skipping ${collName}: ${e.message}`);
    }
  }

  console.log("✨ System Reset Complete. All test data has been removed.");
  process.exit(0);
}

resetCollections().catch(err => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
