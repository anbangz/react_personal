import * as React from "react";

import { TrelloBoard } from "../../components/widgets/trello/TrelloBoard";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrello } from "@fortawesome/free-brands-svg-icons";

export const Roadmap = () => {
  return (
    <div className="section container" id="roadmap">
      <h1>Roadmaps</h1>
      <hr />
      Interested in seeing what I'm up to? I use Trello to manage a lot of
      things in my life - including this website! Unfortunately, due to security
      concerns, Trello (and other project management solutions in general) do
      not allow embeds of full boards on external sites. Please check out the
      boards below to check out what I'm working on:
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
          flexWrap: "wrap",
          margin: "10px 0"
        }}
      >
        <TrelloBoard boardUrl="https://trello.com/b/R4QbTXUb/personal" />
        <TrelloBoard boardUrl="https://trello.com/b/YdDVuKer/personal-website" />
      </div>
    </div>
  );
};
