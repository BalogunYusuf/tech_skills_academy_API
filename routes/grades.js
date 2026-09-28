const express = require('express');
const router = express.Router();
const { getGrades } = require('../controllers/gradeController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getGrades);

module.exports = router;
