import * as React from "react";

import PortraitImg from "../../static/images/portrait.jpg";

import "./TitleBanner.css";

export const TitleBanner = () => {
  return (
    <div id="title-banner" className="section title-banner">
      <img className="title-banner__portrait" src={PortraitImg} />
      <div className="title-banner__description">
        <h1>Hi! I'm Anbang.</h1>
        <h3>I'm a software engineer currently living in Seattle.</h3>
      </div>
    </div>
  );
};
