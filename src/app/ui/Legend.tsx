import React from "react";
export default function Legend({ items }: { items: {label:string, colour:string}[] }) {
  return (
    <div className="flex flex-wrap gap-3 p-2 text-xs">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded" style={{ background: i.colour }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
