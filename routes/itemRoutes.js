const express = require('express');
const Item = require('../models/Item');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Public list contains approved items only.
router.get('/', async (req, res, next) => {
  try {
    const filter = { approvalStatus: 'Approved' };
    if (['Lost', 'Found'].includes(req.query.status)) filter.status = req.query.status;
    const items = await Item.find(filter).populate('reportedBy', 'name').sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { itemName, category, description, location, date, contact, status } = req.body;
    if (![itemName, category, description, location, date, contact, status].every(v => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ message: 'Please complete every item field.' });
    }
    if (!/^\d{10}$/.test(contact)) return res.status(400).json({ message: 'Contact number must contain exactly 10 digits.' });
    if (!['Lost', 'Found'].includes(status)) return res.status(400).json({ message: 'Status must be Lost or Found.' });
    const item = await Item.create({ itemName, category, description, location, date: new Date(date), contact, status, reportedBy: req.user.id });
    res.status(201).json({ message: 'Report submitted and is awaiting admin approval.', item });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await Item.find({ reportedBy: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Report not found.' });
    if (req.user.role !== 'admin' && item.reportedBy.toString() !== req.user.id) return res.status(403).json({ message: 'You can only delete your own reports.' });
    await item.deleteOne();
    res.json({ message: 'Report deleted.' });
  } catch (error) { next(error); }
});

module.exports = router;
