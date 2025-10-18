const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// Middleware
// ========================
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "DELETE"],
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
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF/DOC files are allowed"));
  }
});

// ========================
// Routes
// ========================

// Contact Form Submission
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

// Simple Admin Login (No JWT)
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// Get all contacts
app.get("/api/admin/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete contact + resume
app.delete("/api/admin/contact/:id", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Not found" });

    // Delete resume file
    if (contact.resumePath) {
      const filePath = path.join(UPLOAD_DIR, contact.resumePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Download resume
app.get("/api/admin/resume/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "File not found" });
  res.download(filePath);
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
