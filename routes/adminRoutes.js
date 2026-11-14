const express = require('express');
const User = require('../models/User');
const Item = require('../models/Item');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/summary', async (req, res, next) => {
  try {
    const [users, items, pending, approved, resolved] = await Promise.all([
      User.countDocuments({ role: 'user' }), Item.countDocuments(),
      Item.countDocuments({ approvalStatus: 'Pending' }), Item.countDocuments({ approvalStatus: 'Approved' }),
      Item.countDocuments({ resolutionStatus: 'Resolved' })
    ]);
    res.json({ users, items, pending, approved, resolved });
  } catch (error) { next(error); }
});

router.get('/items', async (req, res, next) => {
  try {
    const items = await Item.find().populate('reportedBy', 'name email').sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.patch('/items/:id', async (req, res, next) => {
  try {
    const update = {};
    if (['Pending', 'Approved', 'Rejected'].includes(req.body.approvalStatus)) update.approvalStatus = req.body.approvalStatus;
    if (['Open', 'Resolved'].includes(req.body.resolutionStatus)) update.resolutionStatus = req.body.resolutionStatus;
    if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid changes provided.' });
    const item = await Item.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Report not found.' });
    res.json({ message: 'Report updated.', item });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' }).select('name email createdAt').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await Item.deleteMany({ reportedBy: user._id });
    res.json({ message: 'User and their reports deleted.' });
  } catch (error) { next(error); }
});

module.exports = router;
