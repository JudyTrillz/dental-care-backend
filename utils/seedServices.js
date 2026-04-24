const db = require("../config/firebase");

const SERVICES = [
  { name: "General Check-up", duration: 30, createdAt: new Date() },
  { name: "Teeth Cleaning", duration: 45, createdAt: new Date() },
  { name: "Fillings", duration: 45, createdAt: new Date() },
  { name: "Root Canal", duration: 90, createdAt: new Date() },
  { name: "Dental Implants", duration: 120, createdAt: new Date() },
  { name: "Bridges", duration: 60, createdAt: new Date() },
  { name: "Crowns", duration: 60, createdAt: new Date() },
  { name: "Dentures", duration: 60, createdAt: new Date() },
  { name: "Teeth Whitening", duration: 60, createdAt: new Date() },
  { name: "Veneers", duration: 90, createdAt: new Date() },
  { name: "Orthodontics", duration: 60, createdAt: new Date() },
  { name: "Tooth Extraction", duration: 45, createdAt: new Date() },
];

const seedServices = async () => {
  const collection = db.collection("services");
  const snapshot = await collection.limit(1).get();

  if (!snapshot.empty) {
    console.log("Services already seeded. Skipping.");
    return;
  }

  const batch = db.batch();

  SERVICES.forEach((service) => {
    const ref = collection.doc();
    batch.set(ref, service);
  });

  await batch.commit();
  console.log("12 dental services seeded successfully.");
};

module.exports = seedServices;
