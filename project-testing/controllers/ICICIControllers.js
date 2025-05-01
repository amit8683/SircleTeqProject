const ICICIService = require('../services/ICICIService');

exports.compareExcelFilesNEW = async (req, res) => {
  try {
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    const { result, desiredHeaders } = ICICIService.compareNEW(file1Path, file2Path);
    res.json({ result, desiredHeaders });
  } catch (err) {
    console.error('Comparison Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.compareExcelFilesOLD = async (req, res) => {
  try {
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    const { result, desiredHeaders } = ICICIService.compareOLD(file1Path, file2Path);
    res.json({ result, desiredHeaders });
  } catch (err) {
    console.error('Comparison Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
