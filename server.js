// === server.js (Simplified Production-ready) ===
// Express + Mongoose backend with JWT auth, admin-only routes
// Only requires MONGO_URI and CLIENT_API_URL environment variables

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_API_URL || true, credentials: true }));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = 'supersecretkey'; // default secret, replace in production
const SALT_ROUNDS = 10;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable');
  process.exit(1);
}

// --- User model ---
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};
const User = mongoose.model('User', userSchema);

// --- Helpers ---
function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
}

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}
async function comparePassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden - admin only' });
  next();
}

// --- Routes ---
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await hashPassword(password);
  try {
    const user = await User.create({ name, email, password: hashed });
    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.json(user.toJSON());
  } catch (err) {
    res.status(400).json({ message: 'Error creating user' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, secure: true });
  res.json(user.toJSON());
});

app.get('/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

app.post('/make-admin', authMiddleware, adminOnly, async (req, res) => {
  const { email } = req.body;
  const user = await User.findOneAndUpdate({ email }, { isAdmin: true }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.toJSON());
});

// --- Start ---
mongoose.connect(MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error('MongoDB connection error:', err));