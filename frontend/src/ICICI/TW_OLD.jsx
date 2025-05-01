import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";

function TW_OLD() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file1 || !file2) {
      alert("Please select both files before submitting.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    
    try {
      const res = await axios.post("http://localhost:5001/icici/old", formData);     
      setData(res.data.result);
    } catch (error) {
      console.error("Error during file comparison", error);
      alert("An error occurred while comparing files.");
    } finally {
      setLoading(false);
    }
  };

  const getAllHeaders = () => {
    const headers = new Set();
    data.forEach((row) =>
      Object.keys(row).forEach((key) => {
        if (key !== "changes" && key !== "type" && key !== "highlight") {
          headers.add(key);
        }
      })
    );
    return Array.from(headers);
  };
  const filteredData = searchTerm
    ? data.filter(
        (row) =>
          row["RTO Category"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row["RTO cluster"]?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  const downloadExcel = () => {
    const ws_data = data.map((row) => {
      const formattedRow = {};

      // Only include keys that are NOT 'changes' or 'type'
      Object.keys(row).forEach((key) => {
        if (key !== "changes" && key !== "type" && key !== "highlight") {
          // Add old value only if changed
          if (row?.changes?.[key]?.highlight) {
            formattedRow[
              key
            ] = `${row[key]} (Old: ${row?.changes?.[key]?.old})`;
          } else {
            formattedRow[key] = row[key];
          }
        }
      });

      return formattedRow;
    });

    const ws = XLSX.utils.json_to_sheet(ws_data);
    const headers = Object.keys(ws_data[0] || {});

    Object.keys(ws).forEach((cellKey) => {
      if (cellKey.startsWith("!")) return;

      const cell = ws[cellKey];
      const { r: rowIndex, c: colIndex } = XLSX.utils.decode_cell(cellKey);
      const key = headers[colIndex];
      const row = data[rowIndex - 1];

      if (row?.type === "PREVIOUS") {
        cell.s = {
          fill: {
            fgColor: { rgb: "FFCCCC" }, // Light red background for "PREVIOUS"
          },
          font: {
            color: { rgb: "000000" },
          },
        };
      }

      if (row?.changes?.[key]?.highlight) {
        cell.s = {
          fill: {
            fgColor: { rgb: "FFFF00" }, // Yellow for changed cells
          },
          font: {
            color: { rgb: "FF0000" },
            bold: true,
          },
        };
      }

      if (row?.type === "NEW") {
        cell.s = {
          fill: {
            fgColor: { rgb: "90EE90" }, // Light green for "NEW" rows
          },
          font: {
            color: { rgb: "000000" },
          },
        };
      }
    });

    const legendSheet = XLSX.utils.aoa_to_sheet([
      ["Color Legend", ""],
      ["", "Light Green (New Row)", { s: { fill: { fgColor: { rgb: "90EE90" } } } }],
      ["", "Light Red (Previous Row)", { s: { fill: { fgColor: { rgb: "FFCCCC" } } } }],
      ["", "Yellow (Modified Cell)", { s: { fill: { fgColor: { rgb: "FFFF00" } } } }],
    ]);
    

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparison Results");
    XLSX.utils.book_append_sheet(wb, legendSheet, "Color Legend");
    
    XLSX.writeFile(wb, "tw_old.xlsx");
    
  };

  const downloadOnlyChanges = () => {
    const changedRows = data.filter((row) => row.type !== "UNCHANGED");

    const ws_data = changedRows.map((row) => {
      const formattedRow = {};

      Object.keys(row).forEach((key) => {
        if (key !== "changes" && key !== "type" && key !== "highlight") {
          if (row?.changes?.[key]?.highlight) {
            formattedRow[
              key
            ] = `${row[key]} (Old: ${row?.changes?.[key]?.old})`;
          } else {
            formattedRow[key] = row[key];
          }
        }
      });

      return formattedRow;
    });

    const ws = XLSX.utils.json_to_sheet(ws_data);
    const headers = Object.keys(ws_data[0] || {});

    Object.keys(ws).forEach((cellKey) => {
      if (cellKey.startsWith("!")) return;

      const cell = ws[cellKey];
      const { r: rowIndex, c: colIndex } = XLSX.utils.decode_cell(cellKey);
      const key = headers[colIndex];
      const row = changedRows[rowIndex - 1];

      if (row?.type === "PREVIOUS") {
        cell.s = {
          fill: { fgColor: { rgb: "FFCCCC" } },
          font: { color: { rgb: "000000" } },
        };
      }

      if (row?.changes?.[key]?.highlight) {
        cell.s = {
          fill: { fgColor: { rgb: "FFFF00" } },
          font: { color: { rgb: "FF0000" }, bold: true },
        };
      }

      if (row?.type === "NEW") {
        cell.s = {
          fill: { fgColor: { rgb: "90EE90" } },
          font: { color: { rgb: "000000" } },
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Changed Rows Only");
    XLSX.writeFile(wb, "tw_old_changes.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-700 mb-8">
         ICICI TW OLD 
      </h2>

      {/* Form Section */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:flex-row items-center justify-center gap-6 mb-8"
      >
        {/* File 1 */}
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Old Record
          </h3>
          <input
            type="file"
            onChange={(e) => setFile1(e.target.files[0])}
            accept=".xlsx, .xls, .csv, .pdf"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 w-full"
          />
          <p className="mt-2 text-sm text-gray-500">
            {file1 ? file1.name : "No file chosen"}
          </p>
        </div>

        {/* File 2 */}
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            New Record
          </h3>
          <input
            type="file"
            onChange={(e) => setFile2(e.target.files[0])}
            accept=".xlsx, .xls, .csv, .pdf"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 w-full"
          />
          <p className="mt-2 text-sm text-gray-500">
            {file2 ? file2.name : "No file chosen"}
          </p>
        </div>
      </form>

      {/* Button Section */}
      <div className="text-center mb-6 flex justify-center gap-4">
        {/* Compare Files Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Comparing..." : "Compare Files"}
        </button>

        {/* Download as Excel Button */}
        <button
          onClick={downloadExcel}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700"
        >
          Download as Excel
        </button>
        <button
          className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-800 hover:bg-green-900"
          onClick={downloadOnlyChanges}
        >
          Download changes
        </button>
      </div>

      {/* Search Bar and Checkbox Section */}
      <div className="flex justify-center mb-6">
        {/* Search Bar */}
        <div className="flex items-center gap-4 w-[600px]">
          {" "}
          {/* You can adjust this width */}
          <input
            type="text"
            placeholder="Search by state name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Legend for color representation */}
<div className="mb-4 px-4 py-3 bg-white rounded-md shadow text-sm flex flex-wrap gap-4 items-center justify-start border border-gray-200">
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded" style={{ backgroundColor: "#D1FAE5" }}></div>
    <span className="text-gray-700">New Entery Added This Month</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded" style={{ backgroundColor: "#FECACA" }}></div>
    <span className="text-gray-700">Previous Month Entry </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded" style={{ backgroundColor: "#FEF9C3" }}></div>
    <span className="text-gray-700">Modified Cell</span>
  </div>
</div>


      {/* Results Table */}
      {filteredData.length >= 0 && (
        <div className="mt-6 overflow-auto bg-white rounded-xl shadow-md">
          <div className="w-full min-w-[700px]">
            <table className="min-w-full text-sm border border-gray-300">
              <thead className="bg-blue-600 text-white sticky top-0 z-10">
                <tr>
                  {getAllHeaders().map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 border border-gray-300 text-left whitespace-nowrap max-w-xs truncate"
                      title={header}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      row.type === "NEW"
                        ? "bg-green-100" // Highlight new rows in green
                        : row.type === "PREVIOUS"
                        ? "bg-red-200" // Highlight previous rows in red
                        : "bg-white"
                    }`}
                  >
                    {getAllHeaders().map((header) => {
                      const value = row[header] || "";
                      const changed = row?.changes?.[header];
                      return (
                        <td
                          key={header}
                          className={`px-4 py-2 border border-gray-200 whitespace-nowrap max-w-xs truncate ${
                            changed?.highlight
                              ? "bg-yellow-100 text-red-600 font-bold"
                              : ""
                          }`}
                          title={value}
                        >
                          <div className="truncate">{value}</div>
                          {changed?.highlight && (
                            <div className="text-xs text-gray-500 font-normal">
                              (Old: {changed.old})
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TW_OLD;
