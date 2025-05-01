const XLSX = require("xlsx");

const stringSimilarity = require("string-similarity");

exports.compareNEW = (file1, file2) => {
  const desiredHeaders = [
    "RTO Category",
    "Location/State",
    "HMC Bike",
    "HMC Scooter",
    "Honda Bike",
    "Honda Scooter",
    "Royal Enfield Bike",
    "SUZUKI Bike",
    "SUZUKI Scooter",
    "TVS Bike",
    "TVS Scooter",
    "YAMAHA Scooter",
    "Yamaha Bike",
    "Bike-EV (All OEM)",
    "Scooter-EV (All OEM)",
  ];

  const normalize = (text) => {
    return text
      ? text
          .toString()
          .trim()
          .toUpperCase()
          .replace(/[^A-Z\s]/g, "")
          .replace(/\s+/g, " ")
      : "";
  };

  const normalizeCategory = (cat) => {
    const normalized = normalize(cat);
    const replacements = { "EMERGING": "EMG","NEW PMG":"PMG"};
    return replacements[normalized] || normalized;
  };

const normalizeLocation = (loc = "") => {
    const knownFixes = {
        "VISAKHAPATNAM": "VISAKHAPATNAM",
        "VISHAKAPATTNAM": "VISAKHAPATNAM",
        "VISHKAPATNAM": "VISAKHAPATNAM",
        "VIZAG": "VISAKHAPATNAM" // if applicable
    };

    const upper = loc?.toUpperCase().trim().replace(/&/g, "AND") || "";
    return knownFixes[upper] || upper;
};


  const fuzzyFindKey = (targetKey, allKeys) => {
    const matches = stringSimilarity.findBestMatch(targetKey, allKeys);
    return matches.bestMatch.rating >= 0.85 ? matches.bestMatch.target : null;
  };

  const extractHeaderIndices = (sheetRaw, headers) => {
    const norm =(s)=>s?.toString().trim().replace(/\s+/g,"").toLowerCase();
    for (let i = 0; i < sheetRaw.length; i++) {
      const row = sheetRaw[i];
      if (!row || row.length === 0) continue;
      const headerIndices = headers.map((desired)=>{
        const desiredNorm=norm(desired);
        let bestMatch={rating:0,index:-1};
        row.forEach((cell,idx)=>{
          const mapped =cell;
          const cellNorm =norm(mapped);
          const rating = stringSimilarity.compareTwoStrings(cellNorm, desiredNorm);

          if(rating>bestMatch.rating && rating>0.8){
            bestMatch={rating,index:idx}
          }
        })
        return bestMatch.index;
      });
      const foundAll = headerIndices.every((index) => index !== -1);
      if (foundAll) return { headerRowIndex: i, headerIndices };
    }
    return null;
  };

  const mapRowsToHeaders = (
    sheetRaw,
    headerRowIndex,
    headerIndices,
    headers
  ) => {
    return sheetRaw.slice(headerRowIndex + 1).map((row) => {
      const obj = {};
      headers.forEach((header, idx) => {
        let value = row[headerIndices[idx]];
        if (typeof value === "number") {
          if (value === 0||value<0) {
            value = "0%";
          } else if (value > 0 && value < 1) {
            value = Math.round(value * 100) + "%";
          }
        }
        obj[header] = value;
      });
      return obj;
    });
  };

  const workbook1 = XLSX.readFile(file1);
  const workbook2 = XLSX.readFile(file2);

  const sheet1Raw = XLSX.utils.sheet_to_json(
    workbook1.Sheets[workbook1.SheetNames[0]],
    { header: 1 }
  );
  const sheet2Raw = XLSX.utils.sheet_to_json(
    workbook2.Sheets[workbook2.SheetNames[0]],
    { header: 1 }
  );

  const info1 = extractHeaderIndices(sheet1Raw, desiredHeaders);
  const info2 = extractHeaderIndices(sheet2Raw, desiredHeaders);

  const sheet1 = mapRowsToHeaders(
    sheet1Raw,
    info1.headerRowIndex,
    info1.headerIndices,
    desiredHeaders
  );
  const sheet2 = mapRowsToHeaders(
    sheet2Raw,
    info2.headerRowIndex,
    info2.headerIndices,
    desiredHeaders
  );

  const sheet1Map = new Map();
  const allKeys1 = [];

  sheet1.forEach((row) => {
    const key = `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(
      row["Location/State"]
    )}`;
    sheet1Map.set(key, row);
    allKeys1.push(key);
  });

  const result = [];

  // MODIFIED & NEW
  sheet2.forEach((row2) => {
    const rawKey = `${normalizeCategory(
      row2["RTO Category"]
    )}_${normalizeLocation(row2["Location/State"])}`;
    const fuzzyKey = fuzzyFindKey(rawKey, allKeys1);
    const matchingRow = fuzzyKey ? sheet1Map.get(fuzzyKey) : null;

    const rowResult = {
      ...row2,
      type: "UNCHANGED",
      changes: {},
      highlight: false,
    };

    if (matchingRow) {
      let changed = false;
      Object.keys(row2).forEach((k) => {
        if (k !== "RTO Category" && k !== "Location/State") {
          const oldVal = (matchingRow[k] || "").toString().trim();
          const newVal = (row2[k] || "").toString().trim();
          if (oldVal !== newVal) {
            changed = true;
            rowResult.changes[k] = {
              old: oldVal,
              new: newVal,
              highlight: true,
            };
          }
        }
      });
      if (changed) {
        rowResult.type = "MODIFIED";
        rowResult.highlight = true;
      }
    } else {
      rowResult.type = "NEW";
      rowResult.highlight = true;
    }

    result.push(rowResult);
  });

  // PREVIOUS
  const sheet2Keys = sheet2.map(
    (row) =>
      `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(
        row["Location/State"]
      )}`
  );

  sheet1.forEach((row1) => {
    const key1 = `${normalizeCategory(
      row1["RTO Category"]
    )}_${normalizeLocation(row1["Location/State"])}`;
    const fuzzyKey = fuzzyFindKey(key1, sheet2Keys);
    if (!fuzzyKey) {
      const rowResult = { ...row1, type: "PREVIOUS", highlight: true };
      result.push(rowResult);
    }
  });

  result.sort((a, b) => {
    const catCompare = normalizeCategory(a["RTO Category"]).localeCompare(
      normalizeCategory(b["RTO Category"])
    );
    if (catCompare !== 0) return catCompare;
    return normalizeLocation(a["Location/State"]).localeCompare(
      normalizeLocation(b["Location/State"])
    );
  });

  return { result, desiredHeaders };
};

exports.compareOLD = (file1, file2) => {
  const desiredHeaderAliases = [
    ["RTO Category"],
    ["RTO cluster", "Location/State"],
    ["Bike Comp (1+1)/(2+2)/(3+3)"],
    ["Bike SAOD"],
    ["Bike AOTP (0+1) (0+2) (0+3)"],
    ["Scooter Comp (1+1)/(2+2)/(3+3)"],
    ["Scooter SAOD"],
    ["Scooter AOTP (0+1) (0+2) (0+3)"],
    ["EV Bike old Comp"],
    ["EV Scooter old Comp"],
    ["Royal Enfield SAOD**"],
    ["Royal Enfield TP**"],
  ];

  const desiredHeaders = desiredHeaderAliases.map((aliases) => aliases[0]);

  const normalizeCategory = (cat) => {
    if (!cat) return "";
    let val = cat.toString().trim().toUpperCase();
    return val === "EMERGING" ? "EMG" : val;
  };

  const normalizeLocation = (loc) => {
    if (!loc) return "";
    return loc.toString().trim().toUpperCase();
  };

  const extractHeaderIndices = (sheetRaw, headerAliases) => {
    const normalize = (s) =>
      s?.toString().trim().replace(/\s+/g, "").toLowerCase();

    for (let i = 0; i < sheetRaw.length; i++) {
      const row = sheetRaw[i];
      if (!row || row.length === 0) continue;

      const headerIndices = headerAliases.map((aliases) => {
        // Flatten all possible aliases and try fuzzy matching
        const rowNorm = row.map((cell) => normalize(cell));
        const aliasNorms = aliases.map(normalize);

        let bestMatch = { rating: 0, index: -1 };
        rowNorm.forEach((cell, idx) => {
          aliasNorms.forEach((alias) => {
            const rating = stringSimilarity.compareTwoStrings(cell, alias);
            if (rating > bestMatch.rating && rating > 0.7) {
              bestMatch = { rating, index: idx };
            }
          });
        });

        return bestMatch.index;
      });

      const foundAll = headerIndices.every((index) => index !== -1);
      if (foundAll) return { headerRowIndex: i, headerIndices };
    }

    return null;
  };

  const mapRowsToHeaders = (
    sheetRaw,
    headerRowIndex,
    headerIndices,
    headers
  ) => {
    return sheetRaw.slice(headerRowIndex + 1).map((row) => {
      const obj = {};
      headers.forEach((header, idx) => {
        let value = row[headerIndices[idx]];
        if (typeof value === "number" && value >= 0 && value <= 1) {
          value = Math.round(value * 100) + "%";
        }
        obj[header] = value;
      });
      return obj;
    });
  };

  const workbook1 = XLSX.readFile(file1);
  const workbook2 = XLSX.readFile(file2);

  const sheet1Raw = XLSX.utils.sheet_to_json(
    workbook1.Sheets[workbook1.SheetNames[0]],
    { header: 1 }
  );
  const sheet2Raw = XLSX.utils.sheet_to_json(
    workbook2.Sheets[workbook2.SheetNames[0]],
    { header: 1 }
  );

  const info1 = extractHeaderIndices(sheet1Raw, desiredHeaderAliases);
  const info2 = extractHeaderIndices(sheet2Raw, desiredHeaderAliases);

  if (!info1 || !info2) {
    throw new Error("Could not find all headers in one or both files.");
  }

  const sheet1 = mapRowsToHeaders(
    sheet1Raw,
    info1.headerRowIndex,
    info1.headerIndices,
    desiredHeaders
  );
  const sheet2 = mapRowsToHeaders(
    sheet2Raw,
    info2.headerRowIndex,
    info2.headerIndices,
    desiredHeaders
  );

  const sheet1Map = new Map();
  sheet1.forEach((row) => {
    const key = `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(
      row["RTO cluster"]
    )}`;
    sheet1Map.set(key, row);
  });

  const result = [];

  // MODIFIED & NEW
  sheet2.forEach((row2) => {
    const key = `${normalizeCategory(row2["RTO Category"])}_${normalizeLocation(
      row2["RTO cluster"]
    )}`;
    const matchingRow = sheet1Map.get(key);

    const rowResult = {
      ...row2,
      type: "UNCHANGED",
      changes: {},
      highlight: false,
    };

    if (matchingRow) {
      let changed = false;
      Object.keys(row2).forEach((k) => {
        if (k !== "RTO Category" && k !== "RTO cluster") {
          const oldVal = (matchingRow[k] || "").toString().trim();
          const newVal = (row2[k] || "").toString().trim();
          if (oldVal !== newVal) {
            changed = true;
            rowResult.changes[k] = {
              old: oldVal,
              new: newVal,
              highlight: true,
            };
          }
        }
      });
      if (changed) {
        rowResult.type = "MODIFIED";
        rowResult.highlight = true;
      }
    } else {
      rowResult.type = "NEW";
      rowResult.highlight = true;
    }

    result.push(rowResult);
  });

  // PREVIOUS
  const sheet2Map = new Map();
  sheet2.forEach((row) => {
    const key = `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(
      row["RTO cluster"]
    )}`;
    sheet2Map.set(key, row);
  });

  sheet1.forEach((row1) => {
    const key = `${normalizeCategory(row1["RTO Category"])}_${normalizeLocation(
      row1["RTO cluster"]
    )}`;
    if (!sheet2Map.has(key)) {
      const rowResult = { ...row1, type: "PREVIOUS", highlight: true };
      result.push(rowResult);
    }
  });

  // Sort final result
  result.sort((a, b) => {
    const catCompare = normalizeCategory(a["RTO Category"]).localeCompare(
      normalizeCategory(b["RTO Category"])
    );
    if (catCompare !== 0) return catCompare;
    return normalizeLocation(a["RTO cluster"]).localeCompare(
      normalizeLocation(b["RTO cluster"])
    );
  });

  return { result, desiredHeaders };
};
