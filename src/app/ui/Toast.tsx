import React from "react";
export default function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 right-4 rounded bg-gray-900 text-white px-3 py-2 shadow">
      {children}
    </div>
  );
}
// Ensure everyone in the app uses the SAME toast context
export { ToastProvider, useToast } from "../utils/useToast";
