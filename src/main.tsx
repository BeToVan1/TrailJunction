import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans/wght.css";
import { App } from "./App.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
