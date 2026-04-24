const db = require("../config/firebase");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const getServices = async (req, res) => {
  try {
    const snapshot = await db.collection("services").get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
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

// Controller & Create service function ==>
const createService = async (req, res) => {
  try {
    const { name, duration, category, forWho, what, outcome } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Service image is required",
      });
    }

    if (
      !name ||
      !duration ||
      Number(duration) <= 0 ||
      isNaN(Number(duration)) ||
      !category ||
      !forWho ||
      !what ||
      !outcome
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all valid fields.",
      });
    }

    const newService = {
      name,
      duration: Number(duration),
      category,
      forWho,
      what,
      outcome,
      image: req.file.filename,
      createdAt: new Date(),
    };

    const ref = await db.collection("services").add(newService);

    res.status(201).json({
      success: true,
      data: {
        id: ref.id,
        ...newService,
      },
      message: "Service created successfully",
    });
  } catch (err) {
    // 🔴 cleanup uploaded file if DB write fails
    if (req.file) {
      const imagePath = path.join(__dirname, "../uploads", req.file.filename);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    console.error("Create service error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Service ID is required",
      });
    }

    const docRef = db.collection("services").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const serviceData = doc.data();

    // 🔴 Delete image file if it exists
    if (serviceData.image) {
      const imagePath = path.join(__dirname, "../uploads", serviceData.image);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete service from DB
    await docRef.delete();

    res.status(200).json({
      success: true,
      data: { id },
      message: "Service and image deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
    });
  }
};

module.exports = { getServices, createService, deleteService, upload };
