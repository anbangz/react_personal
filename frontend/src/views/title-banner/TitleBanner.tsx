import * as React from "react";

import PortraitImg from "../../static/images/portrait.jpg";

import "./TitleBanner.css";

export const TitleBanner = () => {
  return (
    <div id="title-banner" className="section title-banner">
      <img className="title-banner__portrait" src={PortraitImg} alt="Portrait of Anbang" />
      <div className="title-banner__description">
        <h1 className="title-banner__heading">
          <span>Hi! I&apos;m Anbang.</span>
        </h1>
        <h3>I&apos;m a Senior Software Engineering Manager based out of NYC.</h3>
      </div>
    </div>
  );
};
