// controllers/profileController.js
const Profile = require('../models/profile');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

async function ensureProfileExists(userId) {
  let profile = await Profile.findOne({ user: userId });
  if (!profile) {
    profile = await Profile.create({ user: userId });
    try { await User.findByIdAndUpdate(userId, { profile: profile._id }); } catch (e) { /* ignore */ }
  }
  return profile;
}

function sanitizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (item && typeof item === 'object') {
      const { id, _id, ...rest } = item;
      return rest;
    }
    return item;
  });
}

// Helper: guess document type from a filename/originalname
function guessTypeFromName(name) {
  const n = (name || '').toString().toLowerCase();
  if (!n) return 'other';
  if (n.includes('resume') || n.includes('cv')) return 'resume';
  if (n.includes('cover') || n.includes('letter')) return 'cover-letter';
  return 'other';
}

// Normalize an incoming docType value to one of allowed values
function normalizeDocType(val, fallbackName) {
  const allowed = ['resume', 'cover-letter', 'other'];
  if (typeof val === 'string' && val.trim()) {
    const v = val.toString().toLowerCase().trim();
    // allow some flexible forms: 'cover', 'cover letter', 'cover-letter'
    if (v === 'cover' || v === 'cover letter' || v === 'cover-letter' || v.includes('cover') || v.includes('letter')) return 'cover-letter';
    if (v === 'resume' || v === 'cv' || v.includes('resume') || v.includes('cv')) return 'resume';
    if (allowed.includes(v)) return v;
  }
  // fallback to guess from filename if client didn't pass something recognizable
  return guessTypeFromName(fallbackName);
}

async function getProfile(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const profile = await ensureProfileExists(userId);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const allowed = [
      'professionalTitle', 'location', 'summary', 'phone',
      'website', 'linkedin', 'github', 'twitter',
      'skills', 'experiences', 'educations', 'certificates'
    ];

    const updates = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    if (updates.skills && typeof updates.skills === 'object') {
      updates.skills = {
        technical: Array.isArray(updates.skills.technical) ? updates.skills.technical : (updates.skills.technical ? [updates.skills.technical] : []),
        soft: Array.isArray(updates.skills.soft) ? updates.skills.soft : (updates.skills.soft ? [updates.skills.soft] : []),
        languages: Array.isArray(updates.skills.languages) ? updates.skills.languages : (updates.skills.languages ? [updates.skills.languages] : [])
      };
    }

    if (updates.experiences !== undefined) updates.experiences = sanitizeArray(updates.experiences);
    if (updates.educations !== undefined) updates.educations = sanitizeArray(updates.educations);
    if (updates.certificates !== undefined) updates.certificates = sanitizeArray(updates.certificates);

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (profile && profile._id) {
      try {
        await User.findByIdAndUpdate(userId, { profile: profile._id });
      } catch (e) { /* ignore */ }
    }

    return res.json({ message: 'Profile updated', profile });
  } catch (err) {
    console.error('updateProfile error', err);
    next(err);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // derive docType reliably: prefer client value, fallback to filename guess
    const clientDocType = (req.body && typeof req.body.docType === 'string') ? req.body.docType.trim() : '';
    const derivedDocType = normalizeDocType(clientDocType, req.file.originalname);

    const publicUrl = `/uploads/${req.file.filename}`;
    const doc = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: publicUrl,
      createdAt: new Date(),
      docType: derivedDocType // persist a normalized docType
    };

    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = await Profile.create({ user: userId, documents: [doc] });
      try { await User.findByIdAndUpdate(userId, { profile: profile._id }); } catch (e) { /* ignore */ }
    } else {
      profile.documents.push(doc);
      await profile.save();
    }

    const savedDoc = profile.documents[profile.documents.length - 1];
    res.json({ message: 'Uploaded', doc: savedDoc, profile });
  } catch (err) {
    console.error('uploadDocument error', err);
    next(err);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const docId = req.params.docId;
    if (!docId) return res.status(400).json({ error: 'docId required' });

    const profile = await Profile.findOne({ user: userId }).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const doc = (profile.documents || []).find(d => String(d._id) === String(docId) || String(d.id) === String(docId));
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (!doc.filename) return res.status(404).json({ error: 'Document filename missing' });

    const filePath = path.resolve(__dirname, '..', 'uploads', doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    const filename = doc.originalname || doc.filename;
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    if (doc.mimetype) res.type(doc.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('file stream error', err);
      return next(err);
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const userId = req.userId;
    const docId = req.params.docId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!docId) return res.status(400).json({ error: 'docId required' });

    const profileDoc = await Profile.findOne({ user: userId }).lean();
    if (!profileDoc) return res.status(404).json({ error: 'Profile not found' });

    const doc = (profileDoc.documents || []).find(d => String(d._1) === String(docId) || String(d.id) === String(docId));
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.filename) {
      const filePath = path.resolve(__dirname, '..', 'uploads', doc.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Deleted file from disk:', filePath);
        } catch (e) {
          console.warn('Failed to delete file from disk', filePath, e && e.message);
        }
      }
    }

    const updated = await Profile.findOneAndUpdate(
      { user: userId },
      { $pull: { documents: { _id: docId } } },
      { new: true }
    );

    return res.json({ message: 'Document deleted', profile: updated });
  } catch (err) {
    console.error('deleteDocument error', err);
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadDocument, deleteDocument, downloadDocument };
