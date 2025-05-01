const express = require('express');
const router = express.Router();
const multer = require('multer');
const ICICIControllers = require('../controllers/ICICIControllers');

const upload = multer({ dest: 'uploads/' });

router.post(
  '/new',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  ICICIControllers.compareExcelFilesNEW
);

router.post(
  '/old',
  upload.fields([{ name: 'file1' }, { name: 'file2' }]),
  ICICIControllers.compareExcelFilesOLD
);

module.exports = router;
