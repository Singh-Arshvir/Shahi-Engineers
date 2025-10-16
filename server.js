const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL, // your frontend URL
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// Create uploads folder if not exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Contact Schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  resumePath: String,
  createdAt: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// API route
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.path : null;

    // Validate fields
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    const contact = new Contact({ name, email, message, resumePath });
    await contact.save();

    res.json({ success: true, contact });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve uploaded files (optional)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
