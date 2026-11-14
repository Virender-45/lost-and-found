const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  date: { type: Date, required: true },
  contact: { type: String, required: true, match: /^\d{10}$/ },
  status: { type: String, enum: ['Lost', 'Found'], required: true },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  resolutionStatus: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
