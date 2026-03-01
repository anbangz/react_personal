import * as React from "react";

import "./Resume.css";

import ScoutImg from "../../static/images/amazon-scout.jpg";
import RiptideLogo from "../../static/images/riptide-logo.jpg";
import BerkeleySeal from "../../static/images/berkeley-seal.jpg";
import AmazonLogo from "../../static/images/amazon-logo.jpg";

import { ResumeItem } from "../../components/resume-item/ResumeItem";

export const Resume = () => {
  return (
    <div>
      <div id="resume" className="section container resume-container">
        <h1>Experience</h1>
        <hr />
        <ResumeItem
          title="Amazon Scout"
          subtitle="Software Development Engineer"
          image={ScoutImg}
        >
          I'm currently building autonomous sidewalk delivery robots with the
          Amazon Scout team! In general terms, my team handles the
          communications on and off of the Scout. As we're still in an early
          stage, please refer one of the Amazon blog posts{" "}
          <a
            href="https://blog.aboutamazon.com/transportation/meet-scout"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>{" "}
          and{" "}
          <a
            href="https://blog.aboutamazon.com/transportation/whats-next-for-amazon-scout"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>{" "}
          to find out more.
        </ResumeItem>
        <ResumeItem
          title="Riptide Messaging"
          subtitle="Lead iOS Engineer"
          image={RiptideLogo}
          reverse={true}
        >
          Riptide is a B2C and B2B integrated messaging and payments service
          that helps businesses better connect to their suppliers and customers.
          During my time at Riptide, I contributed primarily to building the
          native iOS application from the ground up as well as some auxiliary
          backend and Javascript frontend work.
        </ResumeItem>
        <ResumeItem title="Amazon.com" subtitle="SDE Intern" image={AmazonLogo}>
          I worked as a SDE intern in the summer of 2017 on the Amazon Pricing
          team, working on internal tooling for the Amazon Pricing Engine and
          improving the system used for managing merchant-specified parameters.
        </ResumeItem>
        <h1>Education</h1>
        <hr />
        <ResumeItem
          title="University of California, Berkeley"
          subtitle="Bachelor of Arts - 2018"
          image={BerkeleySeal}
          reverse={true}
        >
          Proud Berkeley grad with a double major in Computer Science and
          Economics. Also a proud alumni of UC Choral Ensembles, in which I
          served as President during the 2016-2017. GO BEARS!!
        </ResumeItem>
      </div>
    </div>
  );
};
