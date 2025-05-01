const express = require('express');
const router = express.Router();
const multer = require('multer');
const ShriramControllers=require('../controllers/ShriramControllers');

const upload = multer({ dest: 'uploads/' });
router.post('/compare',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  ShriramControllers.compareExcelFilesCommercialGrid
);

router.post('/car-grid',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  ShriramControllers.compareExcelFilesCarGrid
);


module.exports = router;