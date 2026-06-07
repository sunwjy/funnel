import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// biome-ignore lint/style/noNonNullAssertion: index.html guarantees #root exists
const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
