import React, { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CommercialGrid from "./Shriram/CommercialGrid";
import MagmaGrid from "./Magma/MagmaGrid";
import MagmaPKG from "./Magma/MagmaPKG"
import MagmaSATP from "./Magma/MagmaSATP";
import TW_NEW from "./ICICI/TW_NEW";
import TW_OLD from "./ICICI/TW_OLD";
import CarGrid from "./Shriram/CarGrid";
function App() {
  return (
    <BrowserRouter>
     <Routes>
        <Route path="/" element={<CarGrid />} />
        <Route path="/commercial" element={<CommercialGrid />} />
        <Route path="/icici/new" element={<TW_NEW/>}/>
        <Route path="/icici/old" element={<TW_OLD/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
