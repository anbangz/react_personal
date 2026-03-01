import * as React from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Homepage } from "./views/home/Homepage";
import { Navbar } from "./views/navbar/Navbar";

// App-wide CSS import
import "./App.css";

export const App = () => (
  <BrowserRouter>
    <div className="app-layout">
      <div className="app-layout__navbar">
        <Navbar />
      </div>
      <div className="app-layout__body">
        <Routes>
          <Route path="/" element={<Homepage />} />
        </Routes>
      </div>
    </div>
  </BrowserRouter>
);
