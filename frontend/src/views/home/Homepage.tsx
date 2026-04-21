import * as React from "react";
import { Resume } from "../resume/Resume";
import { ContactMe } from "../contact-me/ContactMe";
import { ThisSite } from "../this-site/ThisSite";
import { Footer } from "../footer/Footer";
import { TitleBanner } from "../title-banner/TitleBanner";

export const Homepage = () => {
  return (
    <div>
      <TitleBanner />
      <ThisSite />
      <Resume />
      <ContactMe />
      <Footer />
    </div>
  );
};
