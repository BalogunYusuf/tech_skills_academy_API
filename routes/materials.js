const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterial,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  trackDownload
} = require('../controllers/materialController');
const { protect, staffOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', protect, getMaterials);
router.get('/:id', protect, getMaterial);
router.post('/', protect, staffOnly, upload.single('file'), uploadMaterial);
router.put('/:id', protect, staffOnly, updateMaterial);
router.delete('/:id', protect, staffOnly, deleteMaterial);
router.post('/:id/download', protect, trackDownload);

module.exports = router;
