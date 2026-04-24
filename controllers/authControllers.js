const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/firebase.js");
const auditLog = require("../utils/auditLogger.js");

/* ── Config ── */
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = "7d";
const ADMINS_COLLECTION = "admins";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

/* =========================================
   POST /api/auth/login
========================================= */
const loginAuth = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please enter both email and password",
    });
  }

  try {
    const snapshot = await db
      .collection(ADMINS_COLLECTION)
      .where("email", "==", email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data();

    const isHashed =
      adminData.password.startsWith("$2a$") || adminData.password.startsWith("$2b$");

    let passwordMatch = false;

    if (isHashed) {
      passwordMatch = await bcrypt.compare(password, adminData.password);
    } else {
      passwordMatch = adminData.password === password;
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ RESET RATE LIMITER ON SUCCESSFUL LOGIN
    if (req.rateLimit && req.rateLimit.resetKey) {
      req.rateLimit.resetKey(req.ip);
    }

    const token = jwt.sign(
      {
        uid: adminDoc.id,
        email: adminData.email,
        tv: adminData.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    const refreshToken = jwt.sign(
      {
        uid: adminDoc.id,
        tv: adminData.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: REFRESH_EXPIRES_IN },
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: adminDoc.id,
          email: adminData.email,
          role: adminData.role,
        },
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to login right now. Please try again.",
    });
  }
};

/* =========================================
   POST /api/auth/refresh
========================================= */
const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    const adminDoc = await db.collection("admins").doc(decoded.uid).get();

    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const adminData = adminDoc.data();

    if ((adminData.tokenVersion || 0) !== (decoded.tv || 0)) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    const newAccessToken = jwt.sign(
      {
        uid: adminDoc.id,
        email: adminData.email,
        tv: adminData.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
      },
    });
  } catch (err) {
    console.error("[Auth] Refresh error:", err);
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
};

/* =========================================
   GET /api/auth/admins
========================================= */
const getAdmins = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const adminDoc = await db.collection("admins").doc(req.user.uid).get();

    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (adminDoc.data().role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const snapshot = await db.collection("admins").get();

    const admins = snapshot.docs.map((doc) => {
      const data = doc.data();
      delete data.password;

      return {
        id: doc.id,
        email: data.email,
        role: data.role,
      };
    });

    return res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (err) {
    console.error("[Auth] Fetch admins error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to load admins",
    });
  }
};

/* =========================================
   POST /api/auth/create-admin
========================================= */
const postAdmins = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const currentAdminDoc = await db.collection("admins").doc(req.user.uid).get();

    if (!currentAdminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (currentAdminDoc.data().role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only super admins can create admins",
      });
    }

    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const existing = await db
      .collection("admins")
      .where("email", "==", email.trim().toLowerCase())
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdminRef = await db.collection("admins").add({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role === "super_admin" ? "super_admin" : "admin",
      tokenVersion: 0,
    });

    await auditLog({
      action: "CREATE_ADMIN",
      performedBy: req.user.uid,
      target: newAdminRef.id,
      metadata: {
        email,
        role,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        id: newAdminRef.id,
      },
    });
  } catch (err) {
    console.error("[Auth] Create admin error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to create admin",
    });
  }
};

/* =========================================
   DELETE /api/auth/delete-admin/:id
========================================= */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    if (req.user.uid === id) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const adminRef = db.collection("admins").doc(id);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const adminToDelete = adminDoc.data();

    if (adminToDelete.role === "super_admin") {
      const snapshot = await db
        .collection("admins")
        .where("role", "==", "super_admin")
        .get();

      if (snapshot.size <= 1) {
        return res.status(403).json({
          success: false,
          message: "Cannot delete the last super admin",
        });
      }
    }

    await adminRef.delete();

    await auditLog({
      action: "DELETE_ADMIN",
      performedBy: req.user.uid,
      target: id,
      metadata: {
        email: adminToDelete.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Admin removed successfully",
    });
  } catch (err) {
    console.error("[Auth] Delete admin error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to delete admin",
    });
  }
};

/* =========================================
   GET /api/auth/me
========================================= */
const getAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const adminDoc = await db.collection("admins").doc(req.user.uid).get();

    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const admin = adminDoc.data();

    return res.status(200).json({
      success: true,
      data: {
        id: adminDoc.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("[Auth] Me error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch user",
    });
  }
};

module.exports = {
  loginAuth,
  refreshAccessToken,
  getAdmins,
  postAdmins,
  deleteAdmin,
  getAuth,
};
