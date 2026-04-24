const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

const {
  getServices,
  createService,
  deleteService,
  upload,
} = require("../controllers/serviceControllers");

// GET ALL SERVICES (SUPER ADMIN ONLY)
router.get("/", verifyToken, requireSuperAdmin, getServices);

// CREATE SERVICE
router.post(
  "/",
  verifyToken,
  requireSuperAdmin,
  (req, res, next) => {
    upload.single("image")(req, res, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  createService,
);

// DELETE SERVICE
router.delete("/:id", verifyToken, requireSuperAdmin, deleteService);

module.exports = router;
