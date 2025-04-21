const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
const ShriramRoutes = require("./routes/ShriramRoutes");
const MagmaRoutes = require("./routes/MagmaRoutes");
const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/shriram", ShriramRoutes);
app.use("/magma", MagmaRoutes);

const upload = multer({ dest: "uploads/" });
app.post(
  "/pkg",
  upload.fields([{ name: "file1" }, { name: "file2" }]),
  (req, res) => {
    const file1 = req.files["file1"][0].path;
    const file2 = req.files["file2"][0].path;

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
    const upperHeaders = sheet1Raw.slice(2, 5);
    const columnCount = Math.max(...upperHeaders.map((row) => row.length));
    const finalHeaders = Array(columnCount)
      .fill("")
      .map((_, colIndex) => {
        return upperHeaders
          .map((row) => (row[colIndex] || "").trim())
          .filter((value) => value.length > 0)
          .join(" | ")
          .trim();
      });

    const sheet1 = sheet1Raw.slice(5).map((row) => {
      const obj = {};
      finalHeaders.forEach((h, i) => {
        obj[h.trim()] = row[i] || "";
      });
      return obj;
    });

    const sheet2 = sheet2Raw.slice(5).map((row) => {
      const obj = {};
      finalHeaders.forEach((h, i) => {
        obj[h.trim()] = row[i] || "";
      });
      return obj;
    });

    const result = [];

    // Create map for sheet1
    const sheet1Map = new Map();
    sheet1.forEach((row) => {
      const key = `${row["Cluster State(25-26)"]}_${row["Biz Mix | Budget Mix | UW Cluster/Outgo on"]}`;
      sheet1Map.set(key, row);
    });

    // Check for MODIFIED and NEW in sheet2
    sheet2.forEach((row2) => {
      const key = `${row2["Cluster State(25-26)"]}_${row2["Biz Mix | Budget Mix | UW Cluster/Outgo on"]}`;
      const matchingRow = sheet1Map.get(key);

      let rowResult = {
        ...row2,
        type: "UNCHANGED",
        changes: {},
        highlight: false,
      };

      if (matchingRow) {
        let changed = false;

        Object.keys(row2).forEach((key) => {
          if (
            key !== "Cluster State(25-26)" &&
            key !== "Biz Mix | Budget Mix | UW Cluster/Outgo on"
          ) {
            const oldVal = (matchingRow[key] || "").toString().trim();
            const newVal = (row2[key] || "").toString().trim();

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
          rowResult.type = "MODIFIED";
          rowResult.highlight = true;
        }
      } else {
        rowResult.type = "NEW";
        rowResult.highlight = true;
      }

      result.push(rowResult);
    });

    const sheet2Map = new Map();
    sheet2.forEach((row) => {
      const key = `${row["Cluster State(25-26)"]}_${row["Biz Mix | Budget Mix | UW Cluster/Outgo on"]}`;
      sheet2Map.set(key, row);
    });

    sheet1.forEach((row1) => {
      const key = `${row1["Cluster State(25-26)"]}_${row1["Biz Mix | Budget Mix | UW Cluster/Outgo on"]}`;
      const matchingRow = sheet2Map.get(key);

      if (!matchingRow) {
        let rowResult = { ...row1, type: "PREVIOUS", highlight: true };
        result.push(rowResult);
      }
    });

    result.sort((a, b) => {
      const stateCompare = (a["Cluster State(25-26)"] || "").localeCompare(
        b["Cluster State(25-26)"] || ""
      );
      if (stateCompare !== 0) return stateCompare;
      return (
        a["Biz Mix | Budget Mix | UW Cluster/Outgo on"] || ""
      ).localeCompare(b["Biz Mix | Budget Mix | UW Cluster/Outgo on"] || "");
    });

    res.json({ result, upperHeaders });
  }
);

app.post(
  "/satp",
  upload.fields([{ name: "file1" }, { name: "file2" }]),
  (req, res) => {
    const file1 = req.files["file1"][0].path;
    const file2 = req.files["file2"][0].path;

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
    const upperHeaders = sheet1Raw.slice(1, 3);
    const fullUppperHeader = sheet1Raw.slice(0, 3);
    const columnCount = Math.max(...upperHeaders.map((row) => row.length));
    const finalHeaders = Array(columnCount)
      .fill("")
      .map((_, colIndex) => {
        return upperHeaders
          .map((row) => row[colIndex] || "")
          .filter((value) => value.length > 0)
          .join(" | ")
          .trim();
      });

    const sheet1 = sheet1Raw.slice(1).map((row) => {
      const obj = {};
      finalHeaders.forEach((h, i) => {
        obj[h.trim()] = row[i] || "";
      });
      return obj;
    });

    const sheet2 = sheet2Raw.slice(1).map((row) => {
      const obj = {};
      finalHeaders.forEach((h, i) => {
        obj[h.trim()] = row[i] || "";
      });
      return obj;
    });

    const result = [];

    // Create map for sheet1
    const sheet1Map = new Map();
    sheet1.forEach((row) => {
      const key = `${row["Cluster State"]}_${row["Budget Biz Mix | UW Cluster/Outgo"]}`;
      sheet1Map.set(key, row);
    });

    // Check for MODIFIED and NEW in sheet2
    sheet2.forEach((row2) => {
      const key = `${row2["Cluster State"]}_${row2["Budget Biz Mix | UW Cluster/Outgo"]}`;
      const matchingRow = sheet1Map.get(key);

      let rowResult = {
        ...row2,
        type: "UNCHANGED",
        changes: {},
        highlight: false,
      };

      if (matchingRow) {
        let changed = false;

        Object.keys(row2).forEach((key) => {
          if (
            key !== "Cluster State" &&
            key !== "Budget Biz Mix | UW Cluster/Outgo"
          ) {
            const oldVal = (matchingRow[key] || "").toString().trim();
            const newVal = (row2[key] || "").toString().trim();

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
          rowResult.type = "MODIFIED";
          rowResult.highlight = true;
        }
      } else {
        rowResult.type = "NEW";
        rowResult.highlight = true;
      }

      result.push(rowResult);
    });

    const sheet2Map = new Map();
    sheet2.forEach((row) => {
      const key = `${row["Cluster State"]}_${row["Budget Biz Mix | UW Cluster/Outgo"]}`;
      sheet2Map.set(key, row);
    });

    sheet1.forEach((row1) => {
      const key = `${row1["Cluster State"]}_${row1["Budget Biz Mix | UW Cluster/Outgo"]}`;
      const matchingRow = sheet2Map.get(key);

      if (!matchingRow) {
        let rowResult = { ...row1, type: "PREVIOUS", highlight: true };
        result.push(rowResult);
      }
    });

    result.sort((a, b) => {
      const stateCompare = (a["Cluster State"] || "").localeCompare(
        b["Cluster State"] || ""
      );
      if (stateCompare !== 0) return stateCompare;
      return (a["Budget Biz Mix | UW Cluster/Outgo"] || "").localeCompare(
        b["Budget Biz Mix | UW Cluster/Outgo"] || ""
      );
    });

    res.json({ result, fullUppperHeader });
  }
);

app.post("/icici", upload.fields([{ name: "file1" }, { name: "file2" }]), (req, res) => {
  const file1 = req.files["file1"][0].path;
  const file2 = req.files["file2"][0].path;

  const workbook1 = XLSX.readFile(file1);
  const workbook2 = XLSX.readFile(file2);

  const sheet1Raw = XLSX.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]], { header: 1 });
  const sheet2Raw = XLSX.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]], { header: 1 });

  const desiredHeaders = [
    "RTO Category", "Location/State",
    "HMC Bike", "HMC Scooter",
    "Honda Bike", "Honda Scooter",
    "Royal Enfield Bike", "SUZUKI Bike",
    "SUZUKI Scooter", "TVS Bike",
    "TVS Scooter", "YAMAHA Scooter",
    "Yamaha Bike", "Bike-EV (All OEM)",
    "Scooter-EV (All OEM)",
  ];

  // 🔧 Normalization functions
  function normalizeCategory(cat) {
    if (!cat) return "";
    const val = cat.toString().trim().toUpperCase();
    if (val === "EMERGING") return "EMG";
    return val;
  }

  function normalizeLocation(loc) {
    if (!loc) return '';
    return loc.toString().trim().toUpperCase();
  }

  function extractHeaderIndices(sheetRaw, desiredHeaders) {
    for (let i = 0; i < sheetRaw.length; i++) {
      const row = sheetRaw[i];
      if (!row || row.length === 0) continue;

      const headerIndices = desiredHeaders.map((header) => row.indexOf(header));
      const foundAll = headerIndices.every((index) => index !== -1);
      if (foundAll) {
        return { headerRowIndex: i, headerIndices };
      }
    }
    return null;
  }

  function mapRowsToHeaders(sheetRaw, headerRowIndex, headerIndices, headers) {
    const dataRows = sheetRaw.slice(headerRowIndex + 1);
    return dataRows.map((row) => {
      let obj = {};
      headers.forEach((header, idx) => {
        let value = row[headerIndices[idx]];
        if (typeof value === "number" && value > 0 && value < 1) {
          value = Math.round(value * 100) + "%";
        }
        obj[header] = value;
      });
      return obj;
    });
  }

  const info1 = extractHeaderIndices(sheet1Raw, desiredHeaders);
  const sheet1 = mapRowsToHeaders(sheet1Raw, info1.headerRowIndex, info1.headerIndices, desiredHeaders);

  const info2 = extractHeaderIndices(sheet2Raw, desiredHeaders);
  const sheet2 = mapRowsToHeaders(sheet2Raw, info2.headerRowIndex, info2.headerIndices, desiredHeaders);

  const result = [];

  // 🔁 Map for sheet1 using normalized keys
  const sheet1Map = new Map();
  sheet1.forEach((row) => {
    const key = `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(row["Location/State"])}`;
    sheet1Map.set(key, row);
  });

  // 🔍 Check for MODIFIED and NEW
  sheet2.forEach((row2) => {
    const key = `${normalizeCategory(row2["RTO Category"])}_${normalizeLocation(row2["Location/State"])}`;
    const matchingRow = sheet1Map.get(key);

    let rowResult = {
      ...row2,
      type: "UNCHANGED",
      changes: {},
      highlight: false,
    };

    if (matchingRow) {
      let changed = false;
      Object.keys(row2).forEach((key) => {
        if (key !== "RTO Category" && key !== "Location/State") {
          const oldVal = (matchingRow[key] || "").toString().trim();
          const newVal = (row2[key] || "").toString().trim();
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
        rowResult.type = "MODIFIED";
        rowResult.highlight = true;
      }
    } else {
      rowResult.type = "NEW";
      rowResult.highlight = true;
    }

    result.push(rowResult);
  });

  // 🔁 Map for sheet2 using normalized keys
  const sheet2Map = new Map();
  sheet2.forEach((row) => {
    const key = `${normalizeCategory(row["RTO Category"])}_${normalizeLocation(row["Location/State"])}`;
    sheet2Map.set(key, row);
  });

  // 🔎 Check for PREVIOUS
  sheet1.forEach((row1) => {
    const key = `${normalizeCategory(row1["RTO Category"])}_${normalizeLocation(row1["Location/State"])}`;
    const matchingRow = sheet2Map.get(key);

    if (!matchingRow) {
      let rowResult = { ...row1, type: "PREVIOUS", highlight: true };
      result.push(rowResult);
    }
  });

  // 🔠 Sort result
  result.sort((a, b) => {
    const catCompare = normalizeCategory(a["RTO Category"]).localeCompare(normalizeCategory(b["RTO Category"]));
    if (catCompare !== 0) return catCompare;
    return normalizeLocation(a["Location/State"]).localeCompare(normalizeLocation(b["Location/State"]));
  });

  res.json({ result, desiredHeaders });
});



app.listen(5001, () => {
  console.log("Server running on port 5001");
});
