// === server.js (Production-ready) ===
// Express + Mongoose backend with JWT auth, admin-only routes, security middlewares
// Uses only environment variables. Safe for GitHub upload (no secrets).

/*
Dependencies:
 npm install express mongoose bcrypt jsonwebtoken dotenv helmet cors express-rate-limit joi cookie-parser
Dev dependencies (optional):
 npm install -D nodemon
*/

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const cookieParser = require('cookie-parser');

dotenv.config();

const {
  MONGO_URI,
  JWT_SECRET,
  PORT = 4000,
  NODE_ENV,
  CLIENT_URL
} = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('Missing required environment variables. See .env.example');
  process.exit(1);
}

const app = express();

// --- Security middlewares ---
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT_URL || true, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Logging in dev
if (NODE_ENV !== 'production') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// --- Mongoose User model ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
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
  const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  let token = null;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden - admin only' });
  next();
}

// --- Validation schemas ---
const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// --- Routes ---
app.get('/', (req, res) => res.json({ ok: true, env: NODE_ENV || 'development' }));

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { error, value } = signupSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await hashPassword(value.password);
    const user = new User({ name: value.name, email: value.email, password: hashed });
    await user.save();

    const token = signToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await comparePassword(value.password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ user: user.toJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Profile
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: make a user admin
app.post('/api/users/make-admin', authMiddleware, adminOnly, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const user = await User.findOneAndUpdate({ email }, { isAdmin: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: user.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// --- Start server ---
async function start() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

/*
.env.example
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_long_random_secret
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
SALT_ROUNDS=10
*/