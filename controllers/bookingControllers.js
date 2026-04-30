const db = require("../config/firebase");

const { sendEmail } = require("../utils/email.js");

const createBooking = async (req, res) => {
  try {
    const { serviceId, dentistId, date, startTime, fullName, phone, email } = req.body;

    // --- BLOCK PAST DATES ---
    const bookingDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // normalize to midnight
    if (bookingDate < now) {
      return res.status(400).json({ error: "Cannot book a past date" });
    }

    if (
      !serviceId ||
      !dentistId ||
      !date ||
      !startTime ||
      !fullName ||
      !phone ||
      !email
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const newService = serviceDoc.data();

    // 🔍 Check for overlapping bookings
    const snapshot = await db
      .collection("bookings")
      .where("dentistId", "==", dentistId)
      .where("date", "==", date)
      .get();

    // Get service duration
    if (!serviceDoc.exists) {
      return res.status(404).json({ error: "Service not found" });
    }

    const { duration } = serviceDoc.data();

    // Calculate endTime
    const [hours, minutes] = startTime.split(":").map(Number);
    const start = new Date(0, 0, 0, hours, minutes);

    start.setMinutes(start.getMinutes() + duration);

    const endHours = String(start.getHours()).padStart(2, "0");
    const endMinutes = String(start.getMinutes()).padStart(2, "0");

    const endTime = `${endHours}:${endMinutes}`;

    // Conflict Check
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const hasConflict = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const booking = doc.data();

        // get service for existing booking
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        const service = serviceDoc.data();

        const existingStart = toMinutes(booking.startTime);
        const existingEnd = existingStart + service.duration;

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);

        return !(newStart >= existingEnd || newEnd <= existingStart);
      }),
    ).then((results) => results.some(Boolean));
    if (hasConflict) {
      return res.status(400).json({
        error:
          "Time slot already booked for this dentist. Please select another dentist or another time slot.",
      });
    }

    const ref = await db.collection("bookings").add({
      serviceId,
      dentistId,
      date,
      startTime,
      endTime,
      fullName,
      phone,
      email,
      status: "pending",
      createdAt: new Date(),
    });

    try {
      const result = await sendEmail({
        to: email,
        subject: "Booking Received",
        html: `
      <h2>Booking Received✅</h2>
      <p>Dear ${fullName},</p>
      <p>Your booking has been received successfully.</p>
      <p>Please wait while the clinic confirms your appointment. You will receive a confirmation email once your booking is confirmed.</p>
    `,
      });
    } catch (err) {
      console.error("[BOOKING EMAIL FAILED]", err);
    }

    // ADMIN NOTIFICATION - NEW BOOKING
    try {
      await sendEmail({
        to: "ojudy009@gmail.com", //!This is for admin email only.
        subject: "New Appointment Booking",
        html: `
      <h2>New Booking Received</h2>
      <p><strong>Patient's Name:</strong> ${fullName}</p>
      <p><strong>Patient's Email:</strong> ${email}</p>
      <p><strong>Patient's Phone:</strong> ${phone}</p>
      <p><strong>Booked Date:</strong> ${date}</p>
      <p><strong>Booked Time:</strong> ${startTime} - ${endTime}</p>
    `,
      });
    } catch (err) {
      console.error("[ADMIN BOOKING EMAIL FAILED]", err);
    }

    res.status(201).json({
      success: true,
      data: { id: ref.id },
      message: "Booking created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create booking" });
  }
};

const getBookings = async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").get();

    const bookings = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const booking = doc.data();

        // Get dentist name
        const dentistDoc = await db.collection("dentists").doc(booking.dentistId).get();
        const dentistName = dentistDoc.exists ? dentistDoc.data().name : null;

        // Get service name
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        const serviceName = serviceDoc.exists ? serviceDoc.data().name : null;

        return {
          id: doc.id,
          ...booking,
          dentistName,
          serviceName,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: "Booking id and status required",
      });
    }

    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status fields",
      });
    }

    const bookingRef = db.collection("bookings").doc(id);
    const doc = await bookingRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await bookingRef.update({ status });

    // fetch updated booking data for email
    const updatedBooking = doc.data();

    if (status === "confirmed") {
      try {
        await sendEmail({
          to: updatedBooking.email,
          subject: "Appointment Confirmed",
          html: `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${updatedBooking.fullName},</p>
        <p>Your appointment scheduled for ${updatedBooking.date} has been confirmed. We look forward to seeing you soon.</p>
        <br />

        <p>If you wish to cancel your appointment, please respond to this email 72 hours before the scheduled date.</p>
        <br />
        <p>Best Regards,</p>
        <p><i>DentalCare Clinic</i></p>
      `,
        });
      } catch (err) {
        console.error("[CONFIRM EMAIL FAILED]", err);
      }
    }

    if (status === "cancelled") {
      try {
        await sendEmail({
          to: updatedBooking.email,
          subject: "Appointment Cancelled",
          html: `
        <h2>Appointment Cancelled</h2>
        <p>Dear ${updatedBooking.fullName},</p>
        <p>Your appointment scheduled for ${updatedBooking.date} has been cancelled. We hope to hear from you soon.</p>
        
         <br />

        <p>Best Regards,</p>
        <p><i>DentalCare Clinic</i></p>
      `,
        });
      } catch (err) {
        console.error("[CANCEL EMAIL FAILED]", err);
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking status",
    });
  }
};

module.exports = { createBooking, getBookings, updateBookingStatus };
