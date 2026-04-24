const db = require("../config/firebase");
const multer = require("multer");
// const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const getDentists = async (req, res) => {
  try {
    const snapshot = await db.collection("dentists").get();
    const dentists = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json({
      success: true,
      data: dentists,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dentists",
    });
  }
};

// Configure storage
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP, and AVIF images are allowed"), false);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
});

const createDentist = async (req, res) => {
  try {
    const name = req.body?.name;
    const role = req.body?.role;
    const bio = req.body?.bio;
    const image = req.file ? req.file.filename : "";

    if (!name || !role || !bio || !image) {
      return res.status(400).json({
        success: false,
        message: "All fields including image are required",
      });
    }

    const { FieldValue } = require("firebase-admin").firestore;

    const ref = await db.collection("dentists").add({
      name,
      role,
      bio,
      image,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      success: true,
      data: {
        id: ref.id,
        name,
        role,
        bio,
        image,
      },
      message: "Dentist created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create dentist",
    });
  }
};

const deleteDentist = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection("dentists").doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Dentist not found",
      });
    }

    const data = doc.data();
    if (data.image) {
      const filePath = path.join(uploadDir, data.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await docRef.delete();

    res.status(200).json({
      success: true,
      message: "Dentist deleted successfully",
    });
  } catch (error) {
    console.error("Delete dentist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete dentist",
    });
  }
};

module.exports = { getDentists, createDentist, deleteDentist, upload };
