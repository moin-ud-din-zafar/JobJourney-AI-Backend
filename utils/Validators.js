function isEmail(v) {
  return typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v);
}

function isStrongPassword(p) {
  // basic rule: min 8 chars - adjust as needed
  return typeof p === 'string' && p.length >= 8;
}

module.exports = { isEmail, isStrongPassword };
