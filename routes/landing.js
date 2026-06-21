const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('landing', { title: 'Axiom Cloud — Think. Research. Build. Deploy.' });
});

module.exports = router;
