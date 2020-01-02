import * as React from "react";

import { BrowserRouter, Route } from "react-router-dom";

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
        <Route exact path="/" component={Homepage} />
      </div>
    </div>
  </BrowserRouter>
);
