require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_NAME) {
    throw new Error('Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env first.');
  }
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('Use an admin password of at least 12 characters.');
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.name = process.env.ADMIN_NAME.trim();
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Admin account updated: ${email}`);
  } else {
    await User.create({ name: process.env.ADMIN_NAME.trim(), email, passwordHash, role: 'admin' });
    console.log(`Admin account created: ${email}`);
  }
  await mongoose.disconnect();
})().catch(async err => { console.error(err.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
