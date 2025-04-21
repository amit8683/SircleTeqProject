const express = require('express');
const router = express.Router();
const multer = require('multer');
const ShriramControllers=require('../controllers/ShriramControllers');

const upload = multer({ dest: 'uploads/' });
router.post('/compare',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  ShriramControllers.compareExcelFiles
);


module.exports = router;