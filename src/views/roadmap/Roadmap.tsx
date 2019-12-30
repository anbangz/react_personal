import * as React from "react";

import { TrelloBoard } from "../../components/widgets/trello/TrelloBoard";

export const Roadmap = () => {
  return (
    <div>
      I use Trello to manage the work on this website! However, Trello does not
      allow nice full-sized board embedding on external websites, so please
      click on the mini-board below to see the full Trello project for this
      site.
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          margin: "10px 0"
        }}
      >
        <TrelloBoard />
      </div>
    </div>
  );
};
