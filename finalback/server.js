const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
const stringSimilarity = require("string-similarity");
const ShriramRoutes = require("./routes/ShriramRoutes");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Routes
app.use("/shriram", ShriramRoutes);



app.listen(5000, () => {
  console.log("Server running on port 5000");
});