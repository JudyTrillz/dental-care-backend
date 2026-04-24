require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const routes = require("./routes/index");
const dentistRoutes = require("./routes/dentistRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const seedServices = require("./utils/seedServices");
const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/ping", (req, res) => {
  res.send("Server is live");
});

// CORS: allow only your frontend
app.use(
  cors({
    origin: [
      "https://dentalcare-app.netlify.app", // live frontend
      "http://127.0.0.1:5500", // your local frontend if you open index.html via Live Server
      "http://localhost:5500", // alternate Live Server localhost
      "http://localhost:5000",
      "https://dental-care--ojudy007.replit.app",
    ],

    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", routes);
app.use("/api/services", serviceRoutes);
app.use("/api/dentists", dentistRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//PUBLIC API FOR FRONTEND
app.use("/api/public", publicRoutes);

// Seed services and start server
const startServer = async () => {
  try {
    await seedServices();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    // Start server anyway if seeding fails
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (seeding failed)`);
    });
  }
};

startServer();
