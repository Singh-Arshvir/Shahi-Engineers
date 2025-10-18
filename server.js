const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// Middleware
// ========================
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// ========================
// Ensure uploads folder exists
// ========================
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ========================
// MongoDB Connection
// ========================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ========================
// Contact Schema
// ========================
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  resumePath: String,
  createdAt: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

// ========================
// Multer setup for file uploads
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ========================
// JWT Middleware
// ========================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.admin = decoded;
    next();
  });
};

// ========================
// Contact Form Route
// ========================
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.filename : null;

    if (!name || !email || !message || !resumePath) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const newContact = await Contact.create({ name, email, message, resumePath });
    res.json({ success: true, contact: newContact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ========================
// Admin Login Route
// ========================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// ========================
// Admin Routes
// ========================

// Get all contacts
app.get("/api/admin/contacts", verifyToken, async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });
  res.json({ success: true, contacts });
});

// Delete contact + resume
app.delete("/api/admin/contact/:id", verifyToken, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Not found" });

    // Delete file
    if (contact.resumePath) {
      const filePath = path.join(UPLOAD_DIR, contact.resumePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Download resume securely
app.get("/api/admin/resume/:filename", verifyToken, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "File not found" });
  res.download(filePath);
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
