const admin = require("firebase-admin");

/* =========================================
   ENV VALIDATION (fail fast, fail clearly)
========================================= */
const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required env variable: ${key}`);
    process.exit(1); // stop app immediately
  }
});

/* =========================================
   SERVICE ACCOUNT CONFIG
========================================= */
let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
if (privateKey.includes("\\n")) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

/* =========================================
   SERVICE ACCOUNT CONFIG
========================================= */
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

/* =========================================
   INIT FIREBASE (safe init)
========================================= */
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase initialized successfully");
  } catch (err) {
    console.error("Firebase initialization error:", err);
    process.exit(1);
  }
}

/* =========================================
   EXPORT DB
========================================= */
const db = admin.firestore();

module.exports = db;
