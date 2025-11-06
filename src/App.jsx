import React from "react";
import Calendar from "./components/Calendar";

export default function App() {
  // Let the page wrapper (Calendar.jsx) own date/view/events again.
  return <Calendar />;
}
