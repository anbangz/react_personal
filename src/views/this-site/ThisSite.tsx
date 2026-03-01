import * as React from "react";

export const ThisSite = () => {
  return (
    <div id="this-site" className="section container">
      <h1>About this site...</h1>
      <hr />
      <div>
        From the reader's perspective, this personal website is just as it
        appears, a personal website! For my purposes, however, I am using this
        site as an opportunity to explore technologies and development outside
        of the internal Amazon ecosystem that I use on a day-to-day basis as
        part of my job. I am particularly interested in setting up my own
        deployment systems and cloud infrastructure - for example, this website
        is a React/Webpack project sourced from GitHub and deployed in a fully
        autonomous fashion using AWS CodePipeline to a CloudFront distribution
        for maximum performance. You can find both the source code as well as an
        infrastructure diagram in{" "}
        <a href="https://github.com/anbangz/react_personal" target="_blank" rel="noopener noreferrer">
          this project's GitHub repo.
        </a>{" "}
        If you don't care about any of that, welcome, and feel free to take a
        look around!
      </div>
    </div>
  );
};
