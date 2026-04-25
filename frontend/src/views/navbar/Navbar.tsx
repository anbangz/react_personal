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
      <nav className="site-nav">
        <div className="site-nav__brand">
          <Link className="site-nav__item" to="/">
            <b>Anbang Zhang</b>
          </Link>
          <button
            type="button"
            className={`site-nav__toggle ${isMenuActive ? "is-open" : ""}`}
            aria-label={isMenuActive ? "Close menu" : "Open menu"}
            aria-expanded={isMenuActive}
            aria-controls="site-nav-menu"
            onClick={() => setIsMenuActive(!isMenuActive)}
          >
            {/* Required for Hamburger menu */}
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
        <div id="site-nav-menu" className={`site-nav__menu ${isMenuActive ? "is-open" : ""}`}>
          <div className="site-nav__start">
            <Link className="site-nav__item" to="/#this-site">
              This Site
            </Link>
            <Link className="site-nav__item" to="/#resume">
              R&#233;sum&#233;
            </Link>
            <Link className="site-nav__item" to="/#contact-me">
              Contact Me
            </Link>
            <NavLink
              className={({ isActive }) => `site-nav__item${isActive ? " active" : ""}`}
              to="/blog"
            >
              Blog
            </NavLink>
          </div>
          <div className="site-nav__end">
            <button
              ref={secretTriggerButtonRef}
              type="button"
              className="site-nav__item bear-game-trigger"
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
              className="site-nav__item"
              href="https://www.instagram.com/anbangz/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faInstagram} size="2x" />
            </a>
            <a
              className="site-nav__item"
              href="https://github.com/anbangz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} size="2x" />
            </a>
            <a
              className="site-nav__item"
              href="https://www.linkedin.com/in/anbang-zhang-1141b18b/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faLinkedin} size="2x" />
            </a>
            <button
              className="site-nav__item theme-toggle"
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
