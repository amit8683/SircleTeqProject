const XLSX = require('xlsx');
const MagmaService = require('../services/MagmaService');

exports.compareExcelFilesForMagmaGrid = (req, res) => {
  try {
    const file1 = req.files['file1'][0].path;
    const file2 = req.files['file2'][0].path;

    const workbook1 = XLSX.readFile(file1);
    const workbook2 = XLSX.readFile(file2);

    const sheet1Raw = XLSX.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]], { header: 1 });
    const sheet2Raw = XLSX.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]], { header: 1 });

    const upperHeaders = sheet1Raw.slice(1, 3);
    const headers1 = sheet1Raw[3];
    const headers2 = sheet2Raw[3];

   const sheet1 = MagmaService.convertToObjectArray(sheet1Raw.slice(4), headers1);
const sheet2 = MagmaService.convertToObjectArray(sheet2Raw.slice(4), headers2);


    const result = MagmaService.compareSheets(sheet1, sheet2);

    result.sort((a, b) => {
      const stateCompare = (a['State'] || '').localeCompare(b['State'] || '');
      if (stateCompare !== 0) return stateCompare;
      return (a['Int Cluster'] || '').localeCompare(b['Int Cluster'] || '');
    });

    res.json({ result, upperHeaders });
  } catch (error) {
    console.error('Error in compareExcelFiles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
