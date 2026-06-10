const express = require('express');
const router  = express.Router();
const { submitContact } = require('../controllers/contactController');
 
// POST /api/contact — public, no auth required
router.post('/', submitContact);
 
module.exports = router;
 