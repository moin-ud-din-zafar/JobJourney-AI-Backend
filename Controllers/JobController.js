// controllers/jobController.js
const Job = require('../models/job');

function normalizeStatus(raw) {
  if (!raw) return 'applied';
  const s = String(raw).toLowerCase().trim();
  if (s.startsWith('inter')) return 'interviewing';
  if (s.startsWith('offer')) return 'offers';
  if (s.startsWith('reject')) return 'rejected';
  return 'applied';
}

async function createJob(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { company, title, status, fit, progress, nextAction, highPriority, appliedAt } = req.body;
    if (!company || !title) return res.status(400).json({ error: 'company and title required' });

    const job = await Job.create({
      user: userId,
      company: company.trim(),
      title: title.trim(),
      status: normalizeStatus(status),
      fit: Math.min(100, Math.max(0, Number(fit || 0))),
      progress: Math.min(100, Math.max(0, Number(progress || 0))),
      nextAction: nextAction || '',
      highPriority: Boolean(highPriority),
      appliedAt: appliedAt ? new Date(appliedAt) : new Date()
    });

    res.status(201).json({ message: 'Job created', job });
  } catch (err) {
    next(err);
  }
}

async function getJobs(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const jobs = await Job.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const job = await Job.findOne({ _id: id, user: userId }).lean();
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json({ job });
  } catch (err) { next(err); }
}

async function updateJob(req, res, next) {
  try {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const updates = {};
    const allowed = ['company','title','status','fit','progress','nextAction','highPriority','appliedAt'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    if (updates.status) updates.status = normalizeStatus(updates.status);
    if (updates.fit !== undefined) updates.fit = Math.min(100, Math.max(0, Number(updates.fit)));
    if (updates.progress !== undefined) updates.progress = Math.min(100, Math.max(0, Number(updates.progress)));
    if (updates.appliedAt) updates.appliedAt = new Date(updates.appliedAt);

    const job = await Job.findOneAndUpdate({ _id: id, user: userId }, { $set: updates }, { new: true });
    if (!job) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ message: 'Updated', job });
  } catch (err) { next(err); }
}

async function deleteJob(req, res, next) {
  try {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const job = await Job.findOneAndDelete({ _id: id, user: userId });
    if (!job) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ message: 'Deleted', job });
  } catch (err) { next(err); }
}

module.exports = { createJob, getJobs, getJob, updateJob, deleteJob };
