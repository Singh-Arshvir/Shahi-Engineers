/**
 * Shahi Engineers Backend - server.js
 * Features:
 * - User signup/login with JWT authentication
 * - Role-based admin routes
 * - Contact form
 * - Resume upload & download
 * - No default admin
 * - Uses MongoDB Atlas
 */

require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ------------------ MongoDB connection ------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------ Schemas ------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" } // "user" or "admin"
});

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const resumeSchema = new mongoose.Schema({
  user: String,
  filename: String,
  data: Buffer,
  createdAt: { type: Date, default: Date.now }
});

// ------------------ Models ------------------
const User = mongoose.model("User", userSchema);
const Contact = mongoose.model("Contact", contactSchema);
const Resume = mongoose.model("Resume", resumeSchema);

// ------------------ Multer setup ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ JWT helpers ------------------
const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token invalid" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access only" });
  next();
};

// ------------------ Routes ------------------

// Signup
app.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, password: hashedPassword, role: role || "user" });
  await newUser.save();

  res.json({ message: "Signup successful" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = generateToken(user);
  res.json({ message: "Login successful", token, role: user.role });
});

// Contact form (authenticated)
app.post("/contact", verifyToken, async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "All fields required" });

  const contact = new Contact({ name, email, message });
  await contact.save();

  res.json({ message: "Message sent successfully" });
});

// Resume upload (authenticated)
app.post("/upload-resume", verifyToken, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const resume = new Resume({
    user: req.user.name,
    filename: req.file.originalname,
    data: req.file.buffer
  });
  await resume.save();

  res.json({ message: "Resume uploaded successfully" });
});

// Admin dashboard
app.get("/admin-dashboard", verifyToken, adminOnly, async (req, res) => {
  const contacts = await Contact.find();
  const resumes = await Resume.find().select("-data"); // exclude resume file data for listing
  res.json({ contacts, resumes });
});

// Download resume by ID (admin only)
app.get("/download-resume/:id", verifyToken, adminOnly, async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  res.set({
    "Content-Disposition": `attachment; filename="${resume.filename}"`,
    "Content-Type": "application/octet-stream"
  });
  res.send(resume.data);
});

// ------------------ Start server ------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
