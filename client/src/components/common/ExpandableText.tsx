// src/components/common/ExpandableText.tsx
import { useState } from "react";

const ExpandableText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className="mb-4 cursor-pointer group"
    >
      <p
        className={`text-sm text-slate-600 transition-all ${isExpanded ? "" : "line-clamp-1"}`}
      >
        {text}
      </p>
      {!isExpanded && (
        <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Read more
        </span>
      )}
    </div>
  );
};

export default ExpandableText;
