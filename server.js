// ---------------- IMPORTS ----------------
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config(); // load .env variables

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------------- IN-MEMORY DATABASE ----------------
const users = [];       // store user accounts
const contacts = [];    // store contact form messages
const resumes = [];     // store uploaded resume info

// ---------------- ENV VARIABLES ----------------
const JWT_SECRET = process.env.JWT_SECRET || "shahi_secret_key_123";
const PORT = process.env.PORT || 5000;

// ---------------- DEFAULT ADMIN ----------------
(async () => {
  if (!users.find(u => u.email === "admin@shahi.com")) {
    const hashed = await bcrypt.hash("admin123", 10);
    users.push({ name: "Super Admin", email: "admin@shahi.com", password: hashed, role: "admin" });
    console.log("Default admin created: admin@shahi.com / admin123");
  }
})();

// ---------------- MIDDLEWARES ----------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied: Admin only" });
  next();
};

// ---------------- ROUTES ----------------
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ message: "User exists" });
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ name, email, password: hashedPassword, role: "user" }); // all frontend users default to user
  res.json({ message: "Signup successful" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "User not found" });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid password" });
  const token = jwt.sign({ name: user.name, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ message: "Login successful", token, role: user.role });
});

app.get("/user-dashboard", verifyToken, (req, res) => {
  res.json({ message: `Welcome ${req.user.name}!` });
});

app.get("/admin-dashboard", verifyToken, adminOnly, (req, res) => {
  res.json({ message: `Welcome Admin ${req.user.name}!`, contacts, resumes });
});

app.post("/contact", verifyToken, (req, res) => {
  const { name, email, message } = req.body;
  contacts.push({ name, email, message });
  res.json({ message: "Contact received!" });
});

// ---------------- RESUME UPLOAD ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./resumes";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

app.post("/upload-resume", verifyToken, upload.single("resume"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  resumes.push({ user: req.user.name, filename: req.file.filename });
  res.json({ message: "Resume uploaded successfully!", filename: req.file.filename });
});

// ---------------- SERVER ----------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
