const express = require("express");
const router = express.Router();

const { getTeam, getMember } = require("../controllers/teamController");

// ── Public team routes ────────────────────────────────────────────────────────
router.get("/", getTeam);
router.get("/:id", getMember);

module.exports = router;