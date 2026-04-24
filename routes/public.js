const express = require("express");
const router = express.Router();
const db = require("../config/firebase");

/* =========================
   GET PUBLIC SERVICES
========================= */
router.get("/services", async (req, res) => {
  try {
    const snapshot = await db.collection("services").get();

    const services = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        duration: data.duration,
        category: data.category,
        forWho: data.forWho,
        what: data.what,
        outcome: data.outcome,
        image: data.image,
      };
    });

    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (err) {
    console.error("Public services error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to load services at the moment",
    });
  }
});

/* =========================
   GET PUBLIC DENTISTS
========================= */
router.get("/dentists", async (req, res) => {
  try {
    const snapshot = await db.collection("dentists").get();

    const dentists = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        bio: data.bio,
        image: data.image,
      };
    });

    return res.status(200).json({
      success: true,
      data: dentists,
    });
  } catch (err) {
    console.error("Public dentists error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to load dentists at the moment",
    });
  }
});

module.exports = router;
