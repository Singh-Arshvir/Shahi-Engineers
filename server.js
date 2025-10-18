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
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ========================
// MongoDB Connection
// ========================
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ========================
// Routes
// ========================

// Contact Form
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.path : null;

    if (!name || !email || !message || !resumePath)
      return res.status(400).json({ error: "All fields required" });

    const contact = new Contact({ name, email, message, resumePath });
    await contact.save();

    res.json({ success: true, message: "Form submitted successfully!" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({ success: true, token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "Access denied" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Fetch Contacts (Protected)
app.get("/api/contacts", verifyAdmin, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching contacts" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
