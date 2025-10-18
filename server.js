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
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ========================
// MongoDB
// ========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ========================
// Schema
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
// Multer setup
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ========================
// JWT Middleware
// ========================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ success: false, error: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, error: "Invalid token" });
    req.admin = decoded;
    next();
  });
};

// ========================
// Admin Login
// ========================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: "Invalid credentials" });
});

// ========================
// Contact Form Route
// ========================
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message || !req.file)
      return res.status(400).json({ success: false, error: "All fields required" });

    const newContact = new Contact({
      name,
      email,
      message,
      resumePath: req.file.filename,
    });

    await newContact.save();
    res.json({ success: true, message: "Form submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ========================
// Admin Protected Routes
// ========================

// Get all contacts
app.get("/api/admin/contacts", verifyToken, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch contacts" });
  }
});

// Delete contact
app.delete("/api/admin/contact/:id", verifyToken, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });

    // Delete resume file
    if (contact.resumePath) {
      const filePath = path.join(__dirname, "uploads", contact.resumePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
