// models/profile.js
const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
  company: { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  current: { type: Boolean, default: false },
  description: { type: String, default: '' },
}, { _id: true });

const EducationSchema = new mongoose.Schema({
  institution: { type: String, default: '' },
  degree: { type: String, default: '' },
  fieldOfStudy: { type: String, default: '' },
  gpa: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
}, { _id: true });

const CertificateSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  issuingOrg: { type: String, default: '' },
  issueDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  credentialId: { type: String, default: '' },
}, { _id: true });

const DocumentMetaSchema = new mongoose.Schema({
  filename: { type: String },
  originalname: { type: String },
  mimetype: { type: String },
  size: { type: Number },
  url: { type: String },
  createdAt: { type: Date, default: Date.now },

  // persist the doc type so frontend doesn't need to "guess" later
  // Expected values: 'resume', 'cover-letter', 'other' (string)
  docType: { type: String, default: '' },
}, { _id: true });

const ProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  professionalTitle: { type: String, default: '' },
  location: { type: String, default: '' },
  summary: { type: String, default: '' },
  phone: { type: String, default: '' },

  website: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  twitter: { type: String, default: '' },

  skills: {
    technical: { type: [String], default: [] },
    soft: { type: [String], default: [] },
    languages: { type: [String], default: [] }
  },

  experiences: { type: [ExperienceSchema], default: [] },
  educations: { type: [EducationSchema], default: [] },
  certificates: { type: [CertificateSchema], default: [] },

  documents: { type: [DocumentMetaSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
