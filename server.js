// ===============================
// server/server.js
// ===============================
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------
// 🧩 Middleware
// -------------------------------
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve resumes

// -------------------------------
// 🗂️ Ensure uploads folder exists
// -------------------------------
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// -------------------------------
// 🧩 MongoDB Connection
// -------------------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// -------------------------------
// 📦 Schema + Model
// -------------------------------
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  resumePath: String,
  createdAt: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

// -------------------------------
// 📤 Multer Setup
// -------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// -------------------------------
// 📬 Contact Form Route
// -------------------------------
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.path : null;

    if (!name || !email || !message || !resumePath)
      return res.status(400).json({ error: "All fields are required including resume." });

    const newContact = new Contact({ name, email, message, resumePath });
    await newContact.save();

    res.status(201).json({ success: true, message: "Message received successfully!" });
  } catch (error) {
    console.error("❌ Error saving contact:", error);
    res.status(500).json({ error: "Server error, please try again later." });
  }
});

// -------------------------------
// 🧾 Admin Route (View All Contacts)
// -------------------------------
app.get("/api/admin/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ error: "Error fetching contacts." });
  }
});

// -------------------------------
// ✅ Default Route
// -------------------------------
app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully!");
});

// -------------------------------
// 🚀 Start Server
// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
