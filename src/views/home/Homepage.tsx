import * as React from "react";
import { AboutMe } from "../about-me/AboutMe";
import { ContactMe } from "../contact-me/ContactMe";
import { Roadmap } from "../roadmap/Roadmap";
import { ThisSite } from "../this-site/ThisSite";

export const Homepage = () => {
  return (
    <div>
      <AboutMe />
      <ThisSite />
      <Roadmap />
      <ContactMe />
    </div>
  );
};
