const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");

const {
  getDentists,
  createDentist,
  deleteDentist,
  upload,
} = require("../controllers/dentistControllers");

// GET (SUPER ADMIN ONLY)
router.get("/", verifyToken, requireSuperAdmin, getDentists);

// CREATE (SUPER ADMIN ONLY)
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
  createDentist,
);

// DELETE (SUPER ADMIN ONLY)
router.delete("/:id", verifyToken, requireSuperAdmin, deleteDentist);

module.exports = router;
