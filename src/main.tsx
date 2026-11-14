import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans/wght.css";
import { App } from "./App.tsx";
import { DemoLoop } from "./DemoLoop.tsx";
import { ForkDemo } from "./ForkDemo.tsx";
import { Landing } from "./Landing.tsx";
import { RampartJunction } from "./RampartJunction.tsx";
import { rampartName, rampartUrl } from "./rampart-junction.ts";
import "./styles.css";
import "./journal.css";
import "./public-pages.css";

const path = window.location.pathname.replace(/\/+$/, "");
const Page = path === "/app" ? App : path === "/demo" ? ForkDemo : path === "/demo/loop" ? DemoLoop :
  path === rampartUrl ? RampartJunction : Landing;
if (Page === ForkDemo || Page === DemoLoop) document.title = "Sign demo | Trail Junction";
if (Page === App) document.title = "Trail app | Trail Junction";
if (Page === RampartJunction) document.title = `${rampartName} | Trail Junction`;
createRoot(document.getElementById("root")!).render(<Page />);
