import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Load BOTH global Tailwind utilities and the calendar theme.
import "./index.css";
import "./app/ui/calendar.css";
import './app/ui/manualEventStyle.css'

// Single toast provider for the entire app.
import { ToastProvider } from "./app/utils/useToast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
