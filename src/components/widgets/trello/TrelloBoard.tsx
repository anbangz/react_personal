import * as React from "react";

const trelloBoard = () => {
  return (
    <div>
      <blockquote className="trello-board-compact">
        <a href="{https://trello.com/b/YdDVuKer/personal-website}">
          Trello Board
        </a>
      </blockquote>
      <script src="https://p.trellocdn.com/embed.min.js"></script>
    </div>
  );
};

export { trelloBoard as TrelloBoard };
