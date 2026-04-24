const db = require("../config/firebase");
const { FieldValue } = require("firebase-admin").firestore;

const auditLog = async ({
  action,
  performedBy,
  target = null,
  metadata = {},
  req = null,
}) => {
  try {
    if (!action || !performedBy) {
      console.error("[AUDIT INVALID INPUT]", { action, performedBy });
      return;
    }

    await db.collection("auditLogs").add({
      action,
      performedBy,
      target,
      metadata,

      // system consistency
      timestamp: FieldValue.serverTimestamp(),

      // optional traceability (if request passed)
      ip: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
      route: req?.originalUrl || null,
    });
  } catch (err) {
    console.error("[AUDIT FAILURE]", {
      error: err.message,
      action,
      performedBy,
      target,
    });
  }
};

module.exports = auditLog;
