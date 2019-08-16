import * as React from 'react';

import { Link } from 'react-router-dom';

export const AboutMe = () => {
  return (
    <div>
      Hello! This is a website built using React, Typescript, and Webpack. It is
      meant to be a personal website, and will eventually contain things such as
      my resume and details about me that are relevant. However, it is also a
      personal learning project, built using only the barebones dependencies
      (currently only react, react-dom, and react-router) in an effort to
      deep-dive some web dev fundamentals that can be abstracted away. For an
      idea of what is prioritized, check out the roadmap{' '}
      <Link to="/roadmap">here</Link>
    </div>
  );
};
