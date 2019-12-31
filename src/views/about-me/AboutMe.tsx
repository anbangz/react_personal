import * as React from "react";

import "./AboutMe.css";
import Portrait from "../../static/images/portrait.jpg";

export const AboutMe = () => {
  return (
    <div className="about-me__banner">
      <div className="about-me__container">
        <img className="about-me__portrait" src={Portrait} />
        <div className="about-me__description">
          <h1>Hi! I'm Anbang.</h1>
          <h2>I'm a software engineer currently living in Seattle.</h2>
        </div>
      </div>
    </div>
  );
};
