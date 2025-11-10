import React from "react";
import Calendar from "./components/Calendar";
// --- ADD THESE IMPORTS ---
import { ToastProvider } from "./app/utils/useToast"; // Provides the toast context
import Toast from "./app/ui/Toast";                 // Renders the toast messages

export default function App() {
  // Let the page wrapper (Calendar.jsx) own date/view/events again.
  return (
    // --- WRAP THE APP IN THE PROVIDER ---
    <ToastProvider>
      <Calendar />
      <Toast /> {/* <-- ADD THIS COMPONENT TO RENDER TOASTS */}
    </ToastProvider>
  );
}