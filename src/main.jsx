import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Remove the default body margin so the canvas fills the whole window
document.body.style.margin = "0";
document.body.style.background = "#0b0b12";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);