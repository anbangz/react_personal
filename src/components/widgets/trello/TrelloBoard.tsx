import * as React from "react";

interface TrelloBoardProps {
  boardUrl: string;
}
export const TrelloBoard = (props: TrelloBoardProps) => {
  React.useEffect(() => {
    console.log("useEffect");
    const script = document.createElement("script");

    script.src = "https://p.trellocdn.com/embed.min.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      console.log("returning");
      document.body.removeChild(script);
    };
  }, []);

  return (
    <blockquote className="trello-board-compact">
      <a href={props.boardUrl} target="_blank">
        Trello Board
      </a>
    </blockquote>
  );
};
