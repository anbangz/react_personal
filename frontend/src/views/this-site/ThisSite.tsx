import * as React from "react";

export const ThisSite = () => {
  return (
    <div id="this-site" className="section container">
      <h1>About this site</h1>
      <hr />
      <div>
        <p>
          Hello! Welcome to my personal website. I am using this site as an
          opportunity to explore technologies and development outside of the
          software ecosystem that I use on a day-to-day basis as part of my
          job. I am particularly interested in cloud-native technologies in
          AWS, from the frontend asset serving, to the backend API compute
          platform, all the way down to a sane CI/CD system akin to an actual
          production system.
        </p>
        <p>
          This website is a React/Webpack project sourced from GitHub and
          deployed in a fully autonomous fashion using AWS CodePipeline to a
          CloudFront distribution for maximum performance. The backend API is
          in Golang, and deployed as an AWS Lambda function fronted by API
          Gateway. Infrastructure is managed fully by Terraform and deployed
          remotely as part of an Infrastructure pipeline. You can find both
          the source code as well as an infrastructure diagram in{" "}
          <a
            href="https://github.com/anbangz/react_personal"
            target="_blank"
            rel="noopener noreferrer"
          >
            this project's GitHub repo.
          </a>{" "}
          If you don't care about any of that, welcome, feel free to take
          a look around, and hit the little bear in the navbar for an easter egg :)
        </p>
      </div>
    </div>
  );
};
