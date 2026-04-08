import * as React from "react";

import "./ResumeItem.css";

export interface ResumeItemProps {
  title: string;
  subtitle?: string;
  reverse?: boolean;
  image?: string;
  children?: React.ReactNode;
}

export const ResumeItem: React.FunctionComponent<ResumeItemProps> = (
  props: ResumeItemProps
) => {
  const className = `experience-item ${
    props.reverse ? "experience-item--reverse" : ""
  }`;
  return (
    <div className={className}>
      <img className="experience-item__image" src={props.image} alt={props.title} />
      <div className="experience-item__text">
        <h2>{props.title}</h2>
        <h3>{props.subtitle}</h3>
        <div className="experience-item__description">{props.children}</div>
      </div>
    </div>
  );
};
