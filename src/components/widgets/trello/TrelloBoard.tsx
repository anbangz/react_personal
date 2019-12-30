import * as React from "react";

const trelloBoard = () => {
  React.useEffect(() => {
    const script = document.createElement("script");

    script.src = "https://p.trellocdn.com/embed.min.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <blockquote className="trello-board-compact">
      <a href="https://trello.com/b/YdDVuKer/personal-website" target="_blank">
        Trello Board
      </a>
    </blockquote>
  );
};

export { trelloBoard as TrelloBoard };
