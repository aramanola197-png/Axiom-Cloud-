const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

const fs = require('fs');
const avatarDir = path.join(__dirname, '../public/uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

router.get('/', requireAuth, (req, res) => {
  res.render('dashboard/profile', {
    title: 'Profile — Axiom Cloud',
    activeSection: 'profile',
    success: req.query.saved === '1' ? 'Your profile has been saved.' : null,
    error: null,
  });
});

router.post('/save', requireAuth, async (req, res) => {
  try {
    const { username, bio, timezone } = req.body;
    const updates = {};
    if (username && username.trim() !== req.user.username) {
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        return res.render('dashboard/profile', { title: 'Profile — Axiom Cloud', activeSection: 'profile', error: 'Invalid username format.', success: null });
      }
      const exists = await User.findOne({
  username: {
    $regex: new RegExp(`^${username}$`, 'i')
  },

  _id: {
    $ne: req.user._id
  }
});   
   if (exists) return res.render('dashboard/profile', { title: 'Profile — Axiom Cloud', activeSection: 'profile', error: 'This username is already taken.', success: null });
      updates.username = username.trim();
    }
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 300);
    if (timezone) updates.timezone = timezone;
    await User.findByIdAndUpdate(req.user._id, updates);
    res.redirect('/profile?saved=1');
  } catch (err) {
    res.render('dashboard/profile', { title: 'Profile — Axiom Cloud', activeSection: 'profile', error: 'Could not save profile.', success: null });
  }
});

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false, message: 'No file uploaded.' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    res.json({ success: false, message: 'Failed to upload avatar.' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) return res.json({ success: false, message: 'Password changes are not available for Google accounts.' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.json({ success: false, message: 'Current password is incorrect.' });
    if (newPassword.length < 8) return res.json({ success: false, message: 'New password must be at least 8 characters.' });
    if (newPassword !== confirmPassword) return res.json({ success: false, message: 'New passwords do not match.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.json({ success: false, message: 'Could not update password. Please try again.' });
  }
});

module.exports = router;
