import React from "react";

function getScoreColor(score) {
  if (score >= 90) return { bar: "#22c55e", label: "text-green-400",  tier: "STRONG" };
  if (score >= 80) return { bar: "#86efac", label: "text-green-300",  tier: "GOOD"   };
  if (score >= 75) return { bar: "#f59e0b", label: "text-yellow-400", tier: "WATCH"  };
  return               { bar: "#6b7280", label: "text-gray-500",   tier: "WEAK"   };
}

export default function ConfluenceScore({ score, size = "md" }) {
  if (score == null) return null;

  const { bar, label, tier } = getScoreColor(score);
  const isLarge = size === "lg";

  return (
    <div className={`flex flex-col gap-1 ${isLarge ? "w-full" : "w-28"}`}>
      <div className="flex justify-between items-center">
        <span className={`font-bold ${isLarge ? "text-2xl" : "text-base"} ${label}`}>
          {score}
        </span>
        <span className={`text-xs font-semibold ${label}`}>{tier}</span>
      </div>
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{ width: `${Math.min(100, score)}%`, background: bar }}
        />
      </div>
    </div>
  );
}
