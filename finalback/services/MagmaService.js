exports.convertToObjectArray = (rows, headers) => {
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = row[i] || '';
    });
    return obj;
  });
};

exports.compareSheets = (sheet1, sheet2) => {
  const result = [];
  const sheet1Map = new Map();

  sheet1.forEach((row) => {
    const key = `${row['State']}_${row['Int Cluster']}`;
    sheet1Map.set(key, row);
  });

  sheet2.forEach((row2) => {
    const key = `${row2['State']}_${row2['Int Cluster']}`;
    const matchingRow = sheet1Map.get(key);

    let rowResult = {
      ...row2,
      type: 'UNCHANGED',
      changes: {},
      highlight: false,
    };

    if (matchingRow) {
      let changed = false;

      Object.keys(row2).forEach((key) => {
        if (key !== 'State' && key !== 'Int Cluster') {
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
        rowResult.highlight = true;
      }
    } else {
      rowResult.type = 'NEW';
      rowResult.highlight = true;
    }

    result.push(rowResult);
  });

  const sheet2Map = new Map();
  sheet2.forEach((row) => {
    const key = `${row['State']}_${row['Int Cluster']}`;
    sheet2Map.set(key, row);
  });

  sheet1.forEach((row1) => {
    const key = `${row1['State']}_${row1['Int Cluster']}`;
    if (!sheet2Map.has(key)) {
      let rowResult = { ...row1, type: 'PREVIOUS', highlight: true };
      result.push(rowResult);
    }
  });

  return result;
};
