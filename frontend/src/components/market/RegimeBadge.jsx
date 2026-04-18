import React from "react";

const REGIME_COLORS = {
  COMPRESSION:   "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  EXPANSION:     "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  TRENDING_UP:   "bg-green-500/20 text-green-400 border border-green-500/30",
  TRENDING_DOWN: "bg-red-500/20 text-red-400 border border-red-500/30",
  CHOP:          "bg-gray-500/20 text-gray-400 border border-gray-500/30"
};

const REGIME_ICONS = {
  COMPRESSION:   "🔴",
  EXPANSION:     "⚡",
  TRENDING_UP:   "📈",
  TRENDING_DOWN: "📉",
  CHOP:          "〰️"
};

export default function RegimeBadge({ regime, size = "sm" }) {
  if (!regime) return null;

  const colorClass = REGIME_COLORS[regime] || REGIME_COLORS.CHOP;
  const icon       = REGIME_ICONS[regime] || "?";
  const label      = regime.replace("_", " ");

  return (
    <span className={`regime-badge ${colorClass} ${size === "lg" ? "text-sm px-3 py-1" : ""}`}>
      {icon} {label}
    </span>
  );
}
