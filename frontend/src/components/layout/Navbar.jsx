import React from "react";
import { NavLink } from "react-router-dom";
import { useStore } from "../../store/useStore";

const links = [
  { to: "/",            label: "Dashboard" },
  { to: "/market",      label: "Market" },
  { to: "/performance", label: "Performance" },
  { to: "/backtest",    label: "Backtest" },
  { to: "/control",     label: "Control" }
];

export default function Navbar() {
  const { connected, killSwitch, mode } = useStore();

  return (
    <nav className="bg-panel border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-accent">🔥</span>
        <span className="text-lg font-bold tracking-tight">SUPER SIGNAL</span>
        <span className="text-xs text-muted ml-1">v1.0</span>
      </div>

      <div className="flex items-center gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm rounded transition-colors ${
                isActive
                  ? "bg-accent text-dark font-semibold"
                  : "text-muted hover:text-bright hover:bg-border"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className={`px-2 py-1 rounded font-bold ${
          mode === "LIVE" ? "bg-danger text-white" : "bg-border text-muted"
        }`}>
          {mode}
        </span>

        {killSwitch && (
          <span className="px-2 py-1 bg-danger text-white rounded font-bold animate-pulse">
            KILL SWITCH
          </span>
        )}

        <span className={`w-2 h-2 rounded-full ${connected ? "bg-accent pulse-green" : "bg-danger"}`} />
        <span className={connected ? "text-accent" : "text-danger"}>
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
      </div>
    </nav>
  );
}
