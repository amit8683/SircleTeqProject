const ShriramService = require('../services/ShriramService')

exports.compareExcelFilesCommercialGrid = (req, res) => {
  try {
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    const result = ShriramService.compareCommercialGrid(file1Path, file2Path);
    res.json({ result });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.compareExcelFilesCarGrid = (req, res) => {
  try {
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    const result = ShriramService.compareCarGrid(file1Path, file2Path);
    res.json({ result });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};