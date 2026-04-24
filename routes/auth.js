const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { loginLimiter } = require("../middleware/rateLimiter");

const {
  loginAuth,
  getAdmins,
  postAdmins,
  deleteAdmin,
  getAuth,
  refreshAccessToken,
} = require("../controllers/authControllers.js");

/* =========================
   AUTH ROUTES
========================= */

// Login (rate limited)
router.post("/login", loginLimiter, loginAuth);

// Refresh token (add protection layer)
router.post("/refresh-token", loginLimiter, refreshAccessToken);

// Current user
router.get("/me", verifyToken, getAuth);

/* =========================
   ADMIN ROUTES
========================= */

// List admins (super admin only)
router.get("/admins", verifyToken, requireRole("super_admin"), getAdmins);

// Create admin (super admin only)
router.post(
  "/create-admin",
  loginLimiter,
  verifyToken,
  requireRole("super_admin"),
  postAdmins,
);

// Delete admin (super admin only)
router.delete(
  "/delete-admin/:id",
  loginLimiter,
  verifyToken,
  requireRole("super_admin"),
  deleteAdmin,
);

module.exports = router;
