import * as React from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Homepage } from "./views/home/Homepage";
import { Blog } from "./views/blog/Blog";
import { BlogPostPage } from "./views/blog-post/BlogPostPage";
import { Navbar } from "./views/navbar/Navbar";
import { ThemeProvider } from "./context/ThemeContext";

// App-wide CSS import
import "./App.css";

export const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <div className="app-layout">
        <div className="app-layout__navbar">
          <Navbar />
        </div>
        <div className="app-layout__body">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  </ThemeProvider>
);
