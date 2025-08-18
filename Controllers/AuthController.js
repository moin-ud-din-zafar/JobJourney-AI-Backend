const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const { signToken } = require('../services/jwtService');
const { isEmail, isStrongPassword } = require('../utils/validators');
const { sendVerificationEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

// SIGNUP - create local user, send verification email
async function signup(req, res, next) {
  try {
    const { first, last, email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existingLocal = await User.findOne({ email: email.toLowerCase() });
    if (existingLocal) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const localUser = await User.create({
      firstName: first || '',
      lastName: last || '',
      email: email.toLowerCase(),
      password: hashed,
      isVerified: false,  // Initially, the user is not verified
    });

    // Generate verification token and set expiration (24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    localUser.verificationToken = verificationToken;
    localUser.verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours expiration
    await localUser.save();

    // Send verification email with the token
    await sendVerificationEmail(localUser.email, verificationToken, {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
      frontendUrl: FRONTEND_URL,
      firstName: localUser.firstName
    });

    return res.status(201).json({
      message: 'Signup successful — check your email to verify your account',
      user: { id: localUser._id, email: localUser.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    next(err);
  }
}

// LOGIN - local email/password
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email before signing in' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ sub: user._id });
    const safeUser = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt
    };
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
}

// VERIFY - email verification endpoint (improved logging + XHR support)
async function verify(req, res, next) {
  try {
    const token = req.query.token || req.body.token;
    if (!token) {
      console.log('verify: missing token in request');
      return res.status(400).json({ error: 'Missing token' });
    }

    // Find user by token
    const user = await User.findOne({ verificationToken: token }).exec();
    if (!user) {
      console.log('verify: No user found with that token');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    const now = new Date();
    if (new Date(user.verificationTokenExpires) <= now) {
      console.log('verify: Token expired at', user.verificationTokenExpires);
      return res.status(400).json({ error: 'Token has expired' });
    }

    if (user.isVerified) {
      console.log('verify: User already verified');
      return res.status(400).json({ error: 'User already verified' });
    }

    // Mark user as verified and clear token
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    console.log('verify: User verified successfully:', user.email);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (wantsJson) {
      return res.json({ message: 'Email verified' });
    }
    const redirectUrl = `${FRONTEND_URL.replace(/\/$/, '')}/login?verified=1`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Error in verification:', err);
    next(err);
  }
}

// RESEND VERIFICATION
async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });

    // Generate new verification token and set expiration
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours expiration
    await user.save();

    // Send new verification email
    await sendVerificationEmail(user.email, verificationToken, {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
      frontendUrl: FRONTEND_URL,
      firstName: user.firstName
    });

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
}

// ME - current user
async function me(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findById(userId).select('-password -verificationToken -verificationTokenExpires');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, verify, resendVerification, me };
