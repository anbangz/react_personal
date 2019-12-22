import * as React from "react";

import { Link } from "react-router-dom";

// import './Navbar.css';

export const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-start">
        <Link className="navbar-item" to="/">
          Home
        </Link>
        <Link className="navbar-item" to="/aboutme">
          About Me
        </Link>
        <Link className="navbar-item" to="/roadmap">
          Roadmap
        </Link>
      </div>
      <div className="navbar-end">
        <Link className="navbar-item" to="/contact-me">
          Contact Me
        </Link>
      </div>
    </nav>
  );
};
