import { createRoot } from "react-dom/client";
import "./base.css";
import { App } from "./App";

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
