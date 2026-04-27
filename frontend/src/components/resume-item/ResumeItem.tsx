import * as React from "react";

import "./ResumeItem.css";

export interface ResumeItemProps {
  title: string;
  subtitle?: string;
  reverse?: boolean;
  image?: string;
  whiteImageBackground?: boolean;
  children?: React.ReactNode;
}

export const ResumeItem: React.FunctionComponent<ResumeItemProps> = (
  props: ResumeItemProps
) => {
  const className = `experience-item ${
    props.reverse ? "experience-item--reverse" : ""
  }`;
  const imageClassName = `experience-item__image ${
    props.whiteImageBackground ? "experience-item__image--white-bg" : ""
  }`;
  return (
    <div className={className}>
      <img className={imageClassName} src={props.image} alt={props.title} />
      <div className="experience-item__text">
        <h2>{props.title}</h2>
        <h3>{props.subtitle}</h3>
        <div className="experience-item__description">{props.children}</div>
      </div>
    </div>
  );
};
