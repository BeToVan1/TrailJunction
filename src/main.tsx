import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans/wght.css";
import { App } from "./App.tsx";
import { DemoLoop } from "./DemoLoop.tsx";
import { ForkDemo } from "./ForkDemo.tsx";
import { Landing } from "./Landing.tsx";
import "./styles.css";
import "./public-pages.css";

const path = window.location.pathname.replace(/\/+$/, "");
const Page = path === "/app" ? App : path === "/demo" ? ForkDemo : path === "/demo/loop" ? DemoLoop : Landing;
if (Page === ForkDemo || Page === DemoLoop) document.title = "Sign demo | Trail Junction";
if (Page === App) document.title = "Trail maps | Trail Junction";
createRoot(document.getElementById("root")!).render(<Page />);
