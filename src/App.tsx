import * as React from 'react';

import { BrowserRouter, Route } from 'react-router-dom';

import { AboutMe } from './views/about-me/AboutMe';
import { Homepage } from './views/home/Homepage';

import './App.css';
import { Navbar } from './views/navbar/Navbar';
import { Roadmap } from './views/roadmap/Roadmap';

export const App = () => (
  <BrowserRouter>
    <div className="app-layout">
      <div className="app-layout__navbar">
        <Navbar />
      </div>
      <div className="app-layout__body">
        <Route exact path="/" component={Homepage} />
        <Route path="/aboutme" component={AboutMe} />
        <Route path="/roadmap" component={Roadmap} />
      </div>
    </div>
  </BrowserRouter>
);
