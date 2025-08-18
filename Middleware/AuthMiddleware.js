const { verifyToken } = require('../services/jwtService');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token); // Local JWT (HS256)
    req.userId = payload.sub;
    req.authPayload = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
};
