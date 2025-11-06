import React from "react";
export default function EmptyState({ message="No events in this range." }) {
  return (
    <div className="p-8 text-center text-sm text-gray-500">{message}</div>
  );
}
