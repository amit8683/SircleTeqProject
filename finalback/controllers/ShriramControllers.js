const ShriramService = require('../services/ShriramService')

exports.compareExcelFiles = (req, res) => {
  try {
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    const result = ShriramService.compare(file1Path, file2Path);
    res.json({ result });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};