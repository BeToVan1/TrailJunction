import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans/wght.css";
import { App } from "./App.tsx";
import { Landing } from "./Landing.tsx";
import { RampartJunction } from "./RampartJunction.tsx";
import { rampartName, rampartUrl } from "./rampart-junction.ts";
import "./styles.css";
import "./journal.css";
import "./public-pages.css";
import "./motion.css";

let path = window.location.pathname.replace(/\/+$/, "");
if (path === "/demo" || path === "/demo/loop") {
  path = rampartUrl;
  window.history.replaceState(null, "", path + window.location.search + window.location.hash);
}
const Page = path === "/app" ? App : path === rampartUrl ? RampartJunction : Landing;
if (Page === App) document.title = "Trail app | Trail Junction";
if (Page === RampartJunction) document.title = `${rampartName} | Trail Junction`;
createRoot(document.getElementById("root")!).render(<Page />);
