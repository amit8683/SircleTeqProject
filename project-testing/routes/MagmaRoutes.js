const express = require('express');
const router = express.Router();
const multer = require('multer');
const MagmaControllers= require('../controllers/MagmaControllers');

const upload = multer({ dest: 'uploads/' });

router.post('/grid',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  MagmaControllers.compareExcelFilesForMagmaGrid
  
);


module.exports = router;