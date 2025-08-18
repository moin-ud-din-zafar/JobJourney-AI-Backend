const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET); // Verifies the token
  } catch (err) {
    // Handle token expiration error
    if (err.name === 'TokenExpiredError') {
      throw new Error('The token has expired. Please request a new verification email.');
    }
    // Handle any other verification errors
    throw new Error('Invalid or malformed token.');
  }
}

module.exports = { signToken, verifyToken };
