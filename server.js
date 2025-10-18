require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ------------------ In-Memory DB (replace with real DB in production) ------------------
let users = [];
let contacts = [];
let resumes = [];

// ------------------ JWT Secret ------------------
const JWT_SECRET = process.env.JWT_SECRET;

// ------------------ Multer Setup for Resume Upload ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ Create Default Admin ------------------
(async () => {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const existing = users.find(u => u.email === email);
  if (!existing) {
    const hashed = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
    users.push({ 
      name: process.env.DEFAULT_ADMIN_NAME, 
      email, 
      password: hashed, 
      role: "admin" 
    });
    console.log("✅ Default admin created");
  }
})();

// ------------------ Middleware ------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  next();
};

// ------------------ Routes ------------------

// Signup (normal users)
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ message: "User exists" });
  const hashed = await bcrypt.hash(password, 10);
  users.push({ name, email, password: hashed, role: "user" });
  res.json({ message: "Signup successful" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid password" });
  const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ message: "Login successful", token, role: user.role });
});

// Submit Contact
app.post("/contact", verifyToken, (req, res) => {
  const { name, email, message } = req.body;
  contacts.push({ name, email, message });
  res.json({ message: "Contact submitted" });
});

// Upload Resume
app.post("/upload-resume", verifyToken, upload.single("resume"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  resumes.push({ user: req.user.name, filename: req.file.originalname });
  res.json({ message: "Resume uploaded" });
});

// Admin Dashboard (Protected)
app.get("/admin-dashboard", verifyToken, adminOnly, (req, res) => {
  res.json({ 
    message: `Welcome Admin ${req.user.name}!`,
    contacts,
    resumes
  });
});

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
