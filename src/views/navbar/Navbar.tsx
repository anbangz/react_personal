import * as React from "react";

import { Link } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faInstagram,
  faLinkedin
} from "@fortawesome/free-brands-svg-icons";

import "./Navbar.css";

export const Navbar = () => {
  const [isMenuActive, setIsMenuActive] = React.useState(false);

  return (
    <nav className="navbar">
      <a
        role="button"
        className={`navbar-burger ${isMenuActive ? "is-active" : null}`}
        aria-label="menu"
        aria-expanded="false"
        onClick={() => setIsMenuActive(!isMenuActive)}
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
      <div className={`navbar-menu ${isMenuActive ? "is-active" : null}`}>
        <div className="navbar-start">
          <Link className="navbar-item navbar_item--centered" to="/">
            Home
          </Link>
          <Link className="navbar-item navbar_item--centered " to="/aboutme">
            About Me
          </Link>
          <Link className="navbar-item navbar_item--centered " to="/roadmap">
            Roadmap
          </Link>
          <Link className="navbar-item navbar_item--centered " to="/contact-me">
            Contact Me
          </Link>
        </div>
        <div className="navbar-end">
          <a
            className="navbar-item navbar_item--centered"
            href="https://github.com/anbangz"
          >
            <FontAwesomeIcon icon={faInstagram} size="2x" />
          </a>
          <a
            className="navbar-item navbar_item--centered"
            href="https://github.com/anbangz"
          >
            <FontAwesomeIcon icon={faGithub} size="2x" />
          </a>
          <a
            className="navbar-item navbar_item--centered"
            href="https://www.linkedin.com/in/anbang-zhang-1141b18b/"
          >
            <FontAwesomeIcon icon={faLinkedin} size="2x" />
          </a>
        </div>
      </div>
    </nav>
  );
};
