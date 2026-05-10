
import { initializeApp } from "firebase/app";
import { getFirestore, collection, setDoc, doc } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

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

async function syncTrainerBatch() {
  const trainerName = "Aro Barath Chandru B"; // Your name from the dashboard
  console.log(`🔗 Wiring 'Firebase-01' to Trainer: ${trainerName}`);

  const batchRef = doc(db, "batches", "firebase-01");
  await setDoc(batchRef, {
    id: "Firebase-01",
    name: "Firebase-01",
    trainer: trainerName,
    status: "Running",
    enrolled: 0,
    capacity: 50,
    avgAttendance: 0,
    avgScore: 0,
    startDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });

  console.log("✅ Wiring Complete. The dropdown will now show 'Firebase-01'.");
  process.exit(0);
}

syncTrainerBatch().catch(console.error);
