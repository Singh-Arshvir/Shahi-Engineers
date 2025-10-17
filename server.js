// server.js
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
// 🔧 Middleware
// ========================
app.use(cors({
  origin: process.env.CLIENT_URL, // your frontend URL
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// ========================
// 🗂️ Ensure uploads folder exists
// ========================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ========================
// 🧩 MongoDB Connection
// ========================
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ========================
// 📦 Contact Schema
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
// 📤 Multer setup for file uploads
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
// 📬 Contact Form Route (with File Upload)
// ========================
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.path : null;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    // Save data in MongoDB
    const contact = new Contact({ name, email, message, resumePath });
    await contact.save();

    res.json({
      success: true,
      contact,
      message: "Form submitted successfully!"
    });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// 🔒 Secure File Download Route
// ========================
// Instead of serving /uploads publicly, files are served securely by ID
app.get("/api/download/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the contact by ID
    const contact = await Contact.findById(id);
    if (!contact || !contact.resumePath) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const filePath = path.join(__dirname, contact.resumePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File missing on server." });
    }

    // Securely send file for download
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error while sending file:", err);
        res.status(500).json({ success: false, error: "File download failed." });
      }
    });
  } catch (err) {
    console.error("Error in secure download:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// 🚀 Start Server
// ========================
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
