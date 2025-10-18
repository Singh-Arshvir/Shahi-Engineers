/**
 * Shahi Engineers Backend - server.js
 * Features:
 * - User signup/login with JWT authentication
 * - Role-based admin routes
 * - Contact form
 * - Resume upload & download
 * - Manual user creation only (no default admin)
 */

require("dotenv").config(); // Load environment variables
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
app.use(express.json()); // Parse JSON requests

// ------------------ In-memory storage ------------------
// For production, replace with database (MongoDB/Postgres)
const users = [];      // Stores user objects {name, email, password, role}
const contacts = [];   // Stores contact messages
const resumes = [];    // Stores uploaded resumes {user, filename, buffer}

// ------------------ Multer setup for file uploads ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ JWT & Authentication Helpers ------------------
const generateToken = (user) => {
  // Creates JWT token with 7 days expiration
  return jwt.sign(
    { email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1]; // Bearer token
  if (!token) return res.status(401).json({ message: "Token invalid" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Store decoded user info in request
    next();
  } catch {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

// Middleware to restrict route to admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access only" });
  next();
};

// ------------------ Routes ------------------

// Signup route
app.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body; // role can be "user" or "admin"
  if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
  if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10); // Hash password
  users.push({ name, email, password: hashedPassword, role: role || "user" });
  res.json({ message: "Signup successful" });
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = generateToken(user);
  res.json({ message: "Login successful", token, role: user.role });
});

// Contact form (authenticated)
app.post("/contact", verifyToken, (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "All fields required" });

  contacts.push({ name, email, message });
  res.json({ message: "Message sent successfully" });
});

// Resume upload (authenticated)
app.post("/upload-resume", verifyToken, upload.single("resume"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  resumes.push({ user: req.user.name, filename: req.file.originalname, buffer: req.file.buffer });
  res.json({ message: "Resume uploaded successfully" });
});

// Admin dashboard (admin only)
app.get("/admin-dashboard", verifyToken, adminOnly, (req, res) => {
  res.json({ contacts, resumes });
});

// Download resume (admin only)
app.get("/download-resume/:filename", verifyToken, adminOnly, (req, res) => {
  const resume = resumes.find(r => r.filename === req.params.filename);
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  res.set({
    "Content-Disposition": `attachment; filename="${resume.filename}"`,
    "Content-Type": "application/octet-stream"
  });
  res.send(resume.buffer);
});

// ------------------ Start server ------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
