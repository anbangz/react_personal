import * as React from "react";

import "./Footer.css";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const yearDisplay = currentYear > 2020 ? `2020–${currentYear}` : "2020";

  return (
    <footer className="content">
      <div className="footer__content">
        <div>&copy; {yearDisplay} Anbang Zhang</div>
        <a href="https://github.com/anbangz/react_personal">GitHub repo</a>
      </div>
    </footer>
  );
};
