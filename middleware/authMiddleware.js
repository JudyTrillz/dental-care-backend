const jwt = require("jsonwebtoken");
const db = require("../config/firebase");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔴 HARD VALIDATION (prevents silent crashes)
    if (!decoded?.uid) {
      return res.status(401).json({ error: "Invalid token structure" });
    }

    const adminDoc = await db.collection("admins").doc(decoded.uid).get();

    if (!adminDoc.exists) {
      return res.status(401).json({ error: "Account no longer exists" });
    }

    const adminData = adminDoc.data();

    const tokenVersion = decoded.tv ?? 0;
    const storedVersion = adminData.tokenVersion ?? 0;

    if (storedVersion !== tokenVersion) {
      return res.status(401).json({ error: "Session expired. Please log in again" });
    }

    req.user = {
      uid: decoded.uid,
      role: decoded.role || adminData.role,
      email: decoded.email || adminData.email,
      tv: tokenVersion,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
