import * as React from 'react';

import { Link } from 'react-router-dom';

import './Navbar.css';

export const Navbar = () => {
  return (
    <nav className="navbar">
      <Link className="navbar__item" to="/">
        Home
      </Link>
      <Link className="navbar__item" to="/aboutme">
        About Me
      </Link>
      <Link className="navbar__item" to="/roadmap">
        Roadmap
      </Link>
    </nav>
  );
};
