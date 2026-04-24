const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { loginLimiter } = require("../middleware/rateLimiter");

const {
  createBooking,
  getBookings,
  updateBookingStatus,
} = require("../controllers/bookingControllers");

/* =========================
   PUBLIC (BUT CONTROLLED)
========================= */

// Create booking (must be rate limited)
router.post("/", loginLimiter, createBooking);

/* =========================
   ADMIN ONLY
========================= */

// Get all bookings
router.get("/", verifyToken, requireRole(["admin", "super_admin"]), getBookings);

// Update booking status
router.patch(
  "/:id",
  verifyToken,
  requireRole(["admin", "super_admin"]),
  updateBookingStatus,
);

module.exports = router;
