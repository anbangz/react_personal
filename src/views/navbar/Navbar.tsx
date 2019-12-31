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
          <a className="navbar-item centered " href="#about-me">
            About Me
          </a>
          <a className="navbar-item centered " href="#roadmap">
            Roadmap
          </a>
          <a className="navbar-item centered " href="#contact-me">
            Contact Me
          </a>
        </div>
        <div className="navbar-end">
          <a
            className="navbar-item centered"
            href="https://www.instagram.com/anbangz/"
            target="_blank"
          >
            <FontAwesomeIcon icon={faInstagram} size="2x" />
          </a>
          <a
            className="navbar-item centered"
            href="https://github.com/anbangz"
            target="_blank"
          >
            <FontAwesomeIcon icon={faGithub} size="2x" />
          </a>
          <a
            className="navbar-item centered"
            href="https://www.linkedin.com/in/anbang-zhang-1141b18b/"
            target="_blank"
          >
            <FontAwesomeIcon icon={faLinkedin} size="2x" />
          </a>
        </div>
      </div>
    </nav>
  );
};
