import * as React from "react";

interface ReactMarkdownProps {
  children: string;
}

const ReactMarkdown: React.FunctionComponent<ReactMarkdownProps> = ({
  children,
}) => {
  if (!children) return null;

  const blocks = children.split(/\n\n+/);

  return (
    <div>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("# ")) {
          return <h1 key={index}>{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={index}>{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={index}>{trimmed.slice(4)}</h3>;
        }
        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
};

export default ReactMarkdown;
