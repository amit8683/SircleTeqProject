const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/', upload.fields([{ name: 'file1' }, { name: 'file2' }]), (req, res) => {
  const file1 = req.files['file1'][0].path;
  const file2 = req.files['file2'][0].path;

  const workbook1 = XLSX.readFile(file1);
  const workbook2 = XLSX.readFile(file2);

  const sheet1Raw = XLSX.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]], { header: 1 });
  const sheet2Raw = XLSX.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]], { header: 1 });

  const headers1 = sheet1Raw[1];
  const headers2 = sheet2Raw[1];

  const sheet1 = sheet1Raw.slice(2).map(row => {
    const obj = {};
    headers1.forEach((h, i) => {
      obj[h.trim()] = row[i] || '';
    });
    return obj;
  });

  const sheet2 = sheet2Raw.slice(2).map(row => {
    const obj = {};
    headers2.forEach((h, i) => {
      obj[h.trim()] = row[i] || '';
    });
    return obj;
  });


  const sheet1Map = new Map();
  sheet1.forEach(row => {
    const key = `${row.STATE}_${row.PRODUCT}`;
    sheet1Map.set(key, row);
  });

  const result = [];

  sheet2.forEach(row2 => {
    const key = `${row2.STATE}_${row2.PRODUCT}`;
    const matchingRow = sheet1Map.get(key);

    let rowResult = { ...row2, type: 'UNCHANGED', changes: {} };

    if (matchingRow) {
      let changed = false;

      Object.keys(row2).forEach(key => {
        if (key !== 'STATE' && key !== 'PRODUCT') {
          const oldVal = (matchingRow[key] || '').toString().trim();
          const newVal = (row2[key] || '').toString().trim();

          if (oldVal !== newVal) {
            changed = true;
            rowResult.changes[key] = {
              old: oldVal,
              new: newVal,
              highlight: true,
            };
          }
        }
      });

      if (changed) {
        rowResult.type = 'MODIFIED';
      }
    } else {
      rowResult.type = 'NEW';
      rowResult.highlight = true;
    }

    result.push(rowResult);
  });

 const sheet2Map = new Map();
sheet2.forEach(row => {
  const key = `${row.STATE}_${row.PRODUCT}`;
  sheet2Map.set(key, row);
});

sheet1.forEach(row1 => {
  const key = `${row1.STATE}_${row1.PRODUCT}`;
  const matchingRow = sheet2Map.get(key);

  if (!matchingRow) {
    const rowResult = {
      ...row1,
      type: "PREVIOUS",
      changes: {},
      highlight: true
    };
    result.push(rowResult);
  }
});

  // Sorting my result
  result.sort((a, b) => {
    const stateCompare = (a['STATE'] || '').localeCompare(b['STATE'] || '');
    if (stateCompare !== 0) return stateCompare;
    return (a['PRODUCT'] || '').localeCompare(b['PRODUCT'] || '');
  });

  res.json({ result });
});

app.listen(5001, () => {
  console.log('Server running on port 5001');
});
