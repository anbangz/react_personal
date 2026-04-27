import * as React from "react";

import "./Resume.css";

import ScoutImg from "../../static/images/amazon-scout.jpg";
import RiptideLogo from "../../static/images/riptide-logo.jpg";
import BerkeleySeal from "../../static/images/berkeley-seal.jpg";
import AmazonLogo from "../../static/images/amazon-logo.jpg";
import MongoDbLogo from "../../static/images/mongodb.png";
import MongoDbOldLogo from "../../static/images/mongodb-old.svg";

import { ResumeItem } from "../../components/resume-item/ResumeItem";

export const Resume = () => {
  return (
    <div>
      <div id="resume" className="section container resume-container">
        <h1>Experience</h1>
        <hr />
        <ResumeItem
          title="MongoDB — Atlas IAM Workload Identity"
          subtitle="Senior Engineering Manager"
          image={MongoDbLogo}
        >
          <p>
            I currently lead Atlas IAM Workload Identity, the team
            responsible for Atlas's nonhuman identity story. I was promoted
            to Engineering Manager in July 2023, and over the following two
            years grew the team from 3 to 12 full-time engineers via
            external hiring and intern conversions, with zero regretted
            attrition throughout my time as a manager. Along the way, I've
            promoted numerous engineers to the next level, coached
            underperforming engineers back to meeting expectations (and in
            several cases, on to promotion), and overhauled our
            document-writing and review practices to cut
            planning-to-implementation cycles from months to days.
          </p>
          <p>
            We have accomplished a lot in that time, and I'll highlight a
            few things here. We launched enterprise integrations between
            Atlas and partners like{" "}
            <a
              href="https://www.mongodb.com/company/blog/mongodb-atlas-now-available-as-azure-native-integration"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Azure
            </a>{" "}
            and{" "}
            <a
              href="https://vercel.com/blog/mongodb-atlas-is-now-available-on-the-vercel-marketplace"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel
            </a>,
            driving
            $100M+ in projected ARR. I led an initiative that discovered
            and mitigated widespread SMS Toll Fraud against Atlas,
            reducing SMS MFA traffic by 90% and saving MongoDB $1.7
            million in yearly recurring spend with zero impact to customer
            experience. We also delivered a unified internal
            representation for all Atlas identities, opaque to the
            customer experience, enabling consistent AuthN/AuthZ across
            every service in the Atlas control plane and securely issuing
            20K+ signed tokens per second at sustained load.
          </p>
          <p>
            I'm proud of a few "first"'s we delivered that raised the bar for
            Atlas as a whole. We were the first team in Atlas to roll out a
            24/7 on-call rotation for individual contributors, and a
            service we owned became the first in Atlas to establish formal,
            enforced SLO/SLAs for availability and performance. I also
            rolled out a framework for peer and upward feedback within the
            IAM organization — the first such framework in Atlas — which
            led to more productive growth conversations and raised the
            perceived fairness and satisfaction of performance reviews
            within the team from 40% to 100%.
          </p>
          <p>
            In February 2026, I was promoted to Senior Engineering Manager.
            My focus since has been on developer productivity for both
            human engineers and AI agents, developing the roadmap for our
            agent-identity and partner-integration platform, and continuing
            to grow the talent on my team toward leadership positions.
          </p>
          <p>We have big things cooking up, so stay tuned :)</p>
        </ResumeItem>
        <ResumeItem
          title="MongoDB — Atlas IAM"
          subtitle="Senior Software Engineer"
          image={MongoDbOldLogo}
          whiteImageBackground={true}
          reverse={true}
        >
          <p>
            I joined MongoDB's Atlas IAM team as a Senior Engineer in
            September 2021. During this period, I built and deployed the
            first microservice in the Atlas control plane — setting the
            template for 20+ production services today — designed and
            delivered the proof-of-identity system for cross-service
            communication still in use within Atlas, and extracted
            significant portions of the team's domain logic out of the
            Atlas monolith using Bazel.
          </p>
          <p>
            I also focused on team operations — revamping our triage and
            grooming workflow to give individual contributors a larger
            voice in prioritization, and owning a weekly Ops Review to
            improve operational excellence on the team.
          </p>
        </ResumeItem>
        <ResumeItem
          title="Amazon Scout"
          subtitle="Software Development Engineer"
          image={ScoutImg}
        >
          <p>
            For three years, I worked within the Amazon Scout project at
            Amazon, shipping projects across Mission Control and Fleet
            Management. These included an incident auditing system used
            by our human operators to deliver feedback for autonomy
            improvement, an asynchronous messaging system that allowed
            Scout robots to broadcast data to dozens of cloud services at
            thousands of TPS sustained 24/7, and a fleet tracking system
            that allowed the organization to sustainably scale its
            operations from tens to thousands of robots.
          </p>
          <p>
            Along the way, I mentored multiple interns — and the
            engineers mentoring them — with several interns going on to
            successful full-time conversions.
          </p>
          <p>
            For more product information, refer to one of the Amazon blog
            posts{" "}
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
          </p>
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
