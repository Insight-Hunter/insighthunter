<<<<<<< HEAD
import React from "react"; 
import { createRoot } from "react-dom/client"; 
import App from "../App"; 
import "../styles/globals.css"; 

ReactDOM.createRoot(document.getElementById("root")!).render(
=======
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

ReactDOM.createRoot(rootEl).render(
>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
