// models/user.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },  // Always require password (no Google Auth)
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },  // Store token expiration time as Date

    // one-to-one reference to Profile
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
