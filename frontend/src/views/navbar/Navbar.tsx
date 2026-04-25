import * as React from "react";
import { Link, NavLink } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faInstagram,
  faLinkedin
} from "@fortawesome/free-brands-svg-icons";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";

import { useTheme } from "../../context/ThemeContext";
import { SecretBearRunModal } from "../../components/secret-bear-run/SecretBearRunModal";
import BearImg from "../../static/images/bear.png";

import "./Navbar.css";

// Must match theme-icon-swap animation duration in Navbar.css (0.4s)
const SWAP_DELAY = 180;

export const Navbar = () => {
  const [isMenuActive, setIsMenuActive] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const swapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSecretBearRunOpen, setIsSecretBearRunOpen] = React.useState(false);
  const secretTriggerButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const handleCloseSecretBearRun = React.useCallback(() => {
    setIsSecretBearRunOpen(false);
  }, []);

  React.useEffect(() => {
    return () => { if (swapTimer.current) clearTimeout(swapTimer.current); };
  }, []);

  const handleToggle = React.useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    swapTimer.current = setTimeout(() => toggleTheme(), SWAP_DELAY);
  }, [isAnimating, toggleTheme]);

  const handleAnimationEnd = React.useCallback(() => {
    setIsAnimating(false);
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link className="navbar-item centered " to="/">
            <b>Anbang Zhang</b>
          </Link>
          <a
            role="button"
            className={`navbar-burger ${isMenuActive ? "is-active" : ""}`}
            aria-label="menu"
            aria-expanded={isMenuActive ? "true" : "false"}
            onClick={() => setIsMenuActive(!isMenuActive)}
          >
            {/* Required for Bulma's Hamburger menu */}
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>
        <div className={`navbar-menu ${isMenuActive ? "is-active" : ""}`}>
          <div className="navbar-start">
            <Link className="navbar-item centered " to="/#this-site">
              This Site
            </Link>
            <Link className="navbar-item centered " to="/#resume">
              R&#233;sum&#233;
            </Link>
            <Link className="navbar-item centered " to="/#contact-me">
              Contact Me
            </Link>
            <NavLink className="navbar-item centered" to="/blog">
              Blog
            </NavLink>
          </div>
          <div className="navbar-end">
            <button
              ref={secretTriggerButtonRef}
              type="button"
              className="navbar-item bear-game-trigger centered"
              aria-label="Open the hidden bear game"
              onClick={() => setIsSecretBearRunOpen(true)}
            >
              <img
                className="bear-game-trigger__icon"
                src={BearImg}
                alt=""
                aria-hidden="true"
              />
            </button>
            <a
              className="navbar-item centered"
              href="https://www.instagram.com/anbangz/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faInstagram} size="2x" />
            </a>
            <a
              className="navbar-item centered"
              href="https://github.com/anbangz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} size="2x" />
            </a>
            <a
              className="navbar-item centered"
              href="https://www.linkedin.com/in/anbang-zhang-1141b18b/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faLinkedin} size="2x" />
            </a>
            <button
              className="navbar-item theme-toggle centered"
              onClick={handleToggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span
                className={`theme-toggle__icon${isAnimating ? " theme-toggle__icon--animating" : ""}`}
                onAnimationEnd={handleAnimationEnd}
              >
                <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} size="2x" />
              </span>
            </button>
          </div>
        </div>
      </nav>
      <SecretBearRunModal
        isOpen={isSecretBearRunOpen}
        onClose={handleCloseSecretBearRun}
        triggerButtonRef={secretTriggerButtonRef}
      />
    </>
  );
};
