const stringSimilarity = require("string-similarity");
const XLSX = require("xlsx"); // Assuming you need to import the XLSX module

exports.compareCommercialGrid = (file1, file2) => {
  // Configuration constants
  const DESIRED_HEADERS = [
    "STATE",
    "PRODUCT",
    "DISC %",
    "% PAYOUT",
    "POLICY TYPE",
    "AGE CONDITION",
    "UW REMARKS",
    "REMARKS",
  ];

  const HEADER_ALIASES = {
    "DIS %": "DISC %",
    "PAYOUT%": "% PAYOUT",
    AGE: "AGE CONDITION",
    PRODUCTS: "PRODUCT",
  };

  // Normalization functions
  const normalize = (str) => (str || "").toString().trim().toUpperCase();

  const normalizeProduct = (product) => {
    return (product || "")
      .split(/and|,/i)
      .map((p) => p.trim().replace(/\s+/g, " "))
      .filter((p) => p)
      .sort()
      .join(" and ")
      .toUpperCase();
  };

  // Core comparison logic
  const workbook1 = XLSX.readFile(file1);
  const workbook2 = XLSX.readFile(file2);

  const processSheet = (workbook) => {
    const sheetRaw = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 }
    );

    // Find header row
    let headerInfo;
    for (let i = 0; i < sheetRaw.length; i++) {
      const row = sheetRaw[i] || [];
      const indices = DESIRED_HEADERS.map((desired) => {
        const desiredNorm = desired.replace(/\s+/g, "").toLowerCase();
        let best = { rating: 0, index: -1 };

        row.forEach((cell, idx) => {
          const cellValue = HEADER_ALIASES[normalize(cell)] || cell;
          const similarity = stringSimilarity.compareTwoStrings(
            desiredNorm,
            normalize(cellValue).replace(/\s+/g, "").toLowerCase()
          );

          if (similarity > best.rating && similarity > 0.7) {
            best = { rating: similarity, index: idx };
          }
        });
        return best.index;
      });

      if (indices.every((idx) => idx !== -1)) {
        headerInfo = { headerRowIndex: i, headerIndices: indices };
        break;
      }
    }

    if (!headerInfo) throw new Error("Header matching failed");

    // Map rows to objects
    return sheetRaw.slice(headerInfo.headerRowIndex + 1).map((row) => {
      const obj = {};
      DESIRED_HEADERS.forEach((h, i) => {
        obj[h] = (row[headerInfo.headerIndices[i]] ?? "").toString().trim();
      });
      return obj;
    });
  };

  const sheet1 = processSheet(workbook1);
  const sheet2 = processSheet(workbook2);

  // Helper: Find best matching row from sheet1 based on STATE similarity
  const findBestMatchingRow = (row2, sheet1) => {
    let bestMatch = null;
    let bestRating = 0;

    for (const row1 of sheet1) {
      const stateSim = stringSimilarity.compareTwoStrings(
        normalize(row1.STATE),
        normalize(row2.STATE)
      );

      const product1 = normalizeProduct(row1.PRODUCT);
      const product2 = normalizeProduct(row2.PRODUCT);

      const uwRemarks1 = normalize(row1["UW REMARKS"]);
      const uwRemarks2 = normalize(row2["UW REMARKS"]);

      if (
        product1 === product2 &&
        uwRemarks1 === uwRemarks2 &&
        stateSim > 0.8
      ) {
        if (stateSim > bestRating) {
          bestRating = stateSim;
          bestMatch = row1;
        }
      }
    }

    return bestMatch;
  };

  // Compare records
  const results = [];
  const matchedSheet1Rows = new Set();

  sheet2.forEach((row2) => {
    const result = { ...row2, type: "NEW", changes: {}, highlight: true };
    const matchedRow1 = findBestMatchingRow(row2, sheet1);

    if (matchedRow1) {
      matchedSheet1Rows.add(matchedRow1);

      result.type = "UNCHANGED";
      result.highlight = false;

      // Detect field changes
      DESIRED_HEADERS.forEach((h) => {
        if (["STATE", "PRODUCT", "UW REMARKS"].includes(h)) return;

        const val1 = normalize(matchedRow1[h]);
        const val2 = normalize(row2[h]);

        if (val1 !== val2) {
          result.type = "MODIFIED";
          result.highlight = true;
          result.changes[h] = {
            old: matchedRow1[h],
            new: row2[h],
            highlight: true,
          };
        }
      });
    }

    results.push(result);
  });

  // Find removed (PREVIOUS) entries
  sheet1.forEach((row1) => {
    if (![...matchedSheet1Rows].includes(row1)) {
      results.push({
        ...row1,
        type: "PREVIOUS",
        changes: {},
        highlight: true,
      });
    }
  });

  // Sort results
  results.sort((a, b) => {
    const stateCompare = normalize(a.STATE).localeCompare(normalize(b.STATE));
    return stateCompare !== 0
      ? stateCompare
      : normalizeProduct(a.PRODUCT).localeCompare(normalizeProduct(b.PRODUCT));
  });

  return {
    results,
    headers: DESIRED_HEADERS,
    changeHeaders: DESIRED_HEADERS.filter(
      (h) => !["STATE", "PRODUCT", "UW REMARKS"].includes(h)
    ),
  };
};

exports.compareCarGrid = (file1, file2) => {
  const desiredHeaders = [
    "STATE",
    "PRODUCT",
    "DISC %",
    "% PAYOUT",
    "POLICY TYPE",
    "AGE CONDITION",
    "UW REMARKS",
  ];

  const headerAliasMap = {
    "DIS %": "DISC %",
    "PAYOUT%": "% PAYOUT",
    AGE: "AGE CONDITION",
    REMARKS: "UW REMARKS",
    PRODUCTS: "PRODUCT",
  };

  const typoCorrectionMap = {
    eeco: "ECCO",
    delcined: "DECLINED",
    declined: "DECLINED",
    ncases: "NCB CASES",
    stp: "STP",
    suzuki: "SUZUKI",
    maruti: "MARUTI",
    hyundai: "HYUNDAI",
    honda: "HONDA",
    manufactur: "MANUFACTURE",
    upto: "UP TO",
    lacs: "LAKHS",
    "/": " ",
    "\\.": " ",
    "\\bis\\b": " ",
    "\\bdeclined\\b": "DECLINED",
    "tamilnadu & pondicherry": "TAMILNADU",
    tamilnadu: "TAMILNADU",
    pondicherry: "TAMILNADU",
    gujrat: "GUJARAT",
    gujurat: "GUJARAT",
    daman: "DAMAN AND DIU",
    "uttaranchal-aa": "UTTARANCHAL-AA",
    "uttaranchal-rsd": "UTTARANCHAL-RSD",
    "punjab/chandigarh": "PUNJAB/CHANDIGARH",
  };

  const normalizeWithTypos = (str) => {
    let normalized = (str || "").toString().trim().toUpperCase();
    normalized = normalized
      .replace(/[^A-Z0-9 ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    Object.entries(typoCorrectionMap).forEach(([typo, correction]) => {
      normalized = normalized.replace(
        new RegExp(typo, "gi"),
        correction.toUpperCase()
      );
    });
    return normalized.replace(/\s+/g, " ").trim();
  };

  const normalizeProduct = (product = "") => {
    return product
      .split(/and|,/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .sort()
      .join(" and ")
      .toUpperCase();
  };

  const stateAliasMap = {
    "PUNJAB/CHANDIGARH": "PUNJAB",
    "J & K": "JAMMU AND KASHMIR",
    "JAMMU AND KASHMIR": "JAMMU AND KASHMIR",
    "GUJARAT & DADRA NAGAR HAVELI & DAMAN & DIU": "GUJARAT",
    "GUJARAT AND DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "GUJARAT",
    GUJARAT: "GUJARAT",
    "UTTARANCHAL-AA": "UTTARANCHAL-AA",
    "UTTARANCHAL-RSD": "UTTARANCHAL-RSD",
    "TAMILNADU & PONDICHERRY": "TAMILNADU",
    "PUNJAB/CHANDIGARH": "PUNJAB",
    PUNJAB: "PUNJAB",
    TAMILNADU: "TAMILNADU",
  };
  const normalizeState = (state) => {
    let normalized = normalizeWithTypos(state);
    // Check direct matches first
    if (stateAliasMap[normalized]) {
      return stateAliasMap[normalized];
    }

    // Handle composite states with regional codes
    const compositeSplitRegex = /[&/]+/;
    if (compositeSplitRegex.test(normalized)) {
      const parts = normalized
        .split(compositeSplitRegex)
        .map((part) => stateAliasMap[part.trim()] || part.trim());

      return parts.join("_");
    }

    return normalized;
  };

  // New function to process UW REMARKS for consistent key generation
  const processUWRemarks = (remarks) => {
    return (remarks || "")
      .toString()
      .split(/and|,|\//i) // Split by "and", commas, or slashes
      .map((term) => normalizeWithTypos(term))
      .filter((term) => term.trim() !== "")
      .sort()
      .join(" ");
  };

  const extractHeaderInfo = (sheetRaw) => {
    const norm = (s) => s?.toString().trim().replace(/\s+/g, "").toLowerCase();
    for (let i = 0; i < sheetRaw.length; i++) {
      const row = sheetRaw[i];
      if (!row || row.length === 0) continue;
      const headerIndices = desiredHeaders.map((desired) => {
        const desiredNorm = norm(desired);
        let bestMatch = { rating: 0, index: -1 };
        row.forEach((cell, idx) => {
          const actual = norm(cell);
          const mapped =
            headerAliasMap[cell?.toString().trim().toUpperCase()] || cell;
          const rating = stringSimilarity.compareTwoStrings(
            norm(mapped),
            desiredNorm
          );
          if (rating > bestMatch.rating && rating > 0.7) {
            bestMatch = { rating, index: idx };
          }
        });
        return bestMatch.index;
      });
      if (headerIndices.every((idx) => idx !== -1)) {
        return { headerRowIndex: i, headerIndices };
      }
    }
    throw new Error("Unable to find all required headers.");
  };

  const mapRowsToObjects = (sheetRaw, startIndex, headerIndices) => {
    return sheetRaw.slice(startIndex + 1).map((row) => {
      const obj = {};
      desiredHeaders.forEach((h, i) => {
        obj[h] = row[headerIndices[i]] || "";
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

  const info1 = extractHeaderInfo(sheet1Raw);
  const info2 = extractHeaderInfo(sheet2Raw);

  const sheet1 = mapRowsToObjects(
    sheet1Raw,
    info1.headerRowIndex,
    info1.headerIndices
  );
  const sheet2 = mapRowsToObjects(
    sheet2Raw,
    info2.headerRowIndex,
    info2.headerIndices
  );

  const FUZZY_THRESHOLD = 0.85;

  const makeKey = (row) => {
    // 1. Full normalization for critical collision-prone fields
    const state = normalizeState(row.STATE);
    const product = normalizeProduct(row.PRODUCT);
    // 2. Truncate less critical fields with error margin
    let samllresult= [
      state, // Full normalized state
      product, // Full normalized product
      normalizeWithTypos(row["DISC %"]).substring(0, 2),
      normalizeWithTypos(row["POLICY TYPE"]).substring(0, 2),
      normalizeWithTypos(row["AGE CONDITION"])
        .replace(/\D/g, "")
        .substring(0, 2),
    ].join("|");
    if(samllresult){
      console.log(samllresult)
    }
    return samllresult;
  };

  const sheet1Map = new Map();
  sheet1.forEach((row) => {
    const key = makeKey(row);
    if (!sheet1Map.has(key)) sheet1Map.set(key, []);
    sheet1Map.get(key).push(row);
  });

  const result = [];

  sheet2.forEach((row2) => {
    const key = makeKey(row2);
    const possibleMatches = sheet1Map.get(key) || [];
    let bestMatch = null;
    let highestScore = 0;

    // Fuzzy match UW remarks if key matches
    const remarks2 = processUWRemarks(row2["UW REMARKS"]);
    possibleMatches.forEach((row1) => {
      const remarks1 = processUWRemarks(row1["UW REMARKS"]);
      const score = stringSimilarity.compareTwoStrings(remarks1, remarks2);

      if (score > highestScore && score >= FUZZY_THRESHOLD) {
        highestScore = score;
        bestMatch = row1;
      }
    });

    const rowResult = {
      ...row2,
      type: "UNCHANGED",
      changes: {},
      highlight: false,
    };

    if (bestMatch) {
      let changed = false;
      desiredHeaders.forEach((h) => {
        if (!["UW REMARKS", "% PAYOUT"].includes(h)) {
          const current = normalizeWithTypos(row2[h]);
          const previous = normalizeWithTypos(bestMatch[h]);
          if (current !== previous) {
            changed = true;
            rowResult.changes[h] = {
              old: bestMatch[h],
              new: row2[h],
              highlight: true,
            };
          }
        }
      });
      if (changed) rowResult.type = "MODIFIED";
    } else {
      rowResult.type = "NEW";
    }

    rowResult.highlight = rowResult.type !== "UNCHANGED";
    result.push(rowResult);
  });
  const sheet2Keys = new Map(); // Store { key => [rows] }
  sheet2.forEach((row) => {
    const key = makeKey(row);
    if (!sheet2Keys.has(key)) sheet2Keys.set(key, []);
    sheet2Keys.get(key).push(row);
  });

  sheet1.forEach((row1) => {
    const key = makeKey(row1);
    let isMissing = true;

    // Check for exact or fuzzy matches
    if (sheet2Keys.has(key)) {
      const potentialMatches = sheet2Keys.get(key);
      const remarks1 = processUWRemarks(row1["UW REMARKS"]);

      // Fuzzy match within same key group
      const isFuzzyMatch = potentialMatches.some((row2) => {
        const remarks2 = processUWRemarks(row2["UW REMARKS"]);
        return (
          stringSimilarity.compareTwoStrings(remarks1, remarks2) >=
          FUZZY_THRESHOLD
        );
      });

      if (isFuzzyMatch) isMissing = false;
    }

    if (isMissing) {
      result.push({ ...row1, type: "PREVIOUS", highlight: true });
    }
  });
  result.sort((a, b) => {
    const stateComp = normalizeState(a["STATE"]).localeCompare(
      normalizeState(b["STATE"])
    );
    if (stateComp !== 0) return stateComp;
    return normalizeProduct(a["PRODUCT"]).localeCompare(
      normalizeProduct(b["PRODUCT"])
    );
  });

  return { result, desiredHeaders };
};
