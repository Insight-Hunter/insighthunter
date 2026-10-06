import { App } from "./App";
import "./styles/global.css";

const mount = document.getElementById("root");

if (!mount) {
  throw new Error("PBX frontend mount element #root was not found.");
}

mount.innerHTML = App();
