const getHealth = (req, res) => {
  try {
    res.json({ status: "server running" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getHealth };
