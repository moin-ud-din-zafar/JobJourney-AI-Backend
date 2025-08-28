// models/job.js
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  company: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },

  // normalized status keys used by frontend: 'applied','interviewing','offers','rejected'
  status: { type: String, required: true, default: 'applied', enum: ['applied','interviewing','offers','rejected'] },

  fit: { type: Number, default: 0, min: 0, max: 100 },
  progress: { type: Number, default: 0, min: 0, max: 100 },

  appliedAt: { type: Date, default: Date.now },
  nextAction: { type: String, default: '' },
  highPriority: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
