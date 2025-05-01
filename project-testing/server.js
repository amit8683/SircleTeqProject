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
app.use(express.static('static'));

// RoutesS
app.use("/shriram", ShriramRoutes);


app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '/static', 'index.html'));
});


app.listen(5001, () => {
  console.log("Server running on port 5001");
});