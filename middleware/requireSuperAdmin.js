const db = require("../config/firebase");

const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user?.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const doc = await db.collection("admins").doc(user.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (doc.data().role !== "super_admin") {
      return res.status(403).json({ error: "Super admin only" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = requireSuperAdmin;
