import * as React from "react";

import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Homepage } from "./views/home/Homepage";
import { Blog } from "./views/blog/Blog";
import { BlogPostPage } from "./views/blog-post/BlogPostPage";
import { Navbar } from "./views/navbar/Navbar";
import { ThemeProvider } from "./context/ThemeContext";

// App-wide CSS import
import "./App.css";

export const AppContent = (): React.ReactElement => {
  const { hash, pathname } = useLocation();

  React.useEffect(() => {
    if (pathname !== "/" || hash === "") {
      return;
    }

    let targetId = "";

    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }

    let frame = 0;

    const scrollToTarget = (attemptsLeft: number) => {
      const target = document.getElementById(targetId);

      if (target !== null) {
        target.scrollIntoView();
        return;
      }

      if (attemptsLeft > 0) {
        frame = window.requestAnimationFrame(() => {
          scrollToTarget(attemptsLeft - 1);
        });
      }
    };

    frame = window.requestAnimationFrame(() => {
      scrollToTarget(10);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [hash, pathname]);

  return (
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
  );
};

export const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </ThemeProvider>
);
