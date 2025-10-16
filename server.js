// server.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors(
  {
    origin: "process.env.CLIENT_URL",
    methods: ["GET", "POST"],
    credentials: true
  }
));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User/Contact Schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  resumePath: String, // Store file path
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model("Contact", contactSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder to store resumes
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Create uploads folder if not exists
const fs = require("fs");
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// API route to handle form + resume
app.post("/api/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const resumePath = req.file ? req.file.path : null;

    const contact = new Contact({ name, email, message, resumePath });
    await contact.save();

    res.json({ success: true, contact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
