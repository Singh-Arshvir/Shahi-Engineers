require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
app.use(express.json());

// ------------------ In-memory storage ------------------
const users = [];
const contacts = [];
const resumes = [];

// ------------------ Multer for file uploads ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ Utility functions ------------------
const generateToken = (user) => {
  return jwt.sign({ email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1]; // Bearer token
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

// ------------------ Default admin creation ------------------
const createDefaultAdmin = async () => {
  if (!users.find(u => u.role === "admin")) {
    const hashedPassword = await bcrypt.hash("admin123", 10); // default password
    users.push({
      name: "Admin",
      email: "admin@shahi.com",
      password: hashedPassword,
      role: "admin"
    });
    console.log("✅ Default admin created: admin@shahi.com / admin123");
  }
};

// ------------------ Routes ------------------

// Signup
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
  if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ name, email, password: hashedPassword, role: "user" });
  res.json({ message: "Signup successful" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = generateToken(user);
  res.json({ message: "Login successful", token, role: user.role });
});

// Contact form
app.post("/contact", verifyToken, (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "All fields required" });

  contacts.push({ name, email, message });
  res.json({ message: "Message sent successfully" });
});

// Resume upload
app.post("/upload-resume", verifyToken, upload.single("resume"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  resumes.push({ user: req.user.name, filename: req.file.originalname, buffer: req.file.buffer });
  res.json({ message: "Resume uploaded successfully" });
});

// Admin dashboard
app.get("/admin-dashboard", verifyToken, adminOnly, (req, res) => {
  res.json({ contacts, resumes });
});

// Resume download
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
app.listen(PORT, async () => {
  await createDefaultAdmin();
  console.log(`🚀 Server running on port ${PORT}`);
});
