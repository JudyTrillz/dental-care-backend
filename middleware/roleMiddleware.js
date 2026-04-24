const db = require("../config/firebase");

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const doc = await db.collection("admins").doc(user.uid).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const userRole = doc.data().role;

      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!rolesArray.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};

module.exports = { requireRole };
