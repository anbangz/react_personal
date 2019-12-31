import * as React from "react";

import { TrelloBoard } from "../../components/widgets/trello/TrelloBoard";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrello } from "@fortawesome/free-brands-svg-icons";

export const Roadmap = () => {
  return (
    <div id="roadmap">
      I love Trello, and use it to manage a lot of things in my life - like this
      website! While I would love to embed some nice full Trello boards in this
      section of the site, unfortunately Trello does not allow meaningful embeds
      on external sites. Please check out the boards below to see what I'm
      working on:
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
          margin: "10px 0"
        }}
      >
        <TrelloBoard boardUrl="https://trello.com/b/R4QbTXUb/personal" />
        <TrelloBoard boardUrl="https://trello.com/b/YdDVuKer/personal-website" />
      </div>
    </div>
  );
};
