// PerformancePage.jsx — with Trade Journal tab (real trades from SQLite)
import React, { useEffect, useState } from "react";
import { useStore }    from "../store/useStore";
import EquityCurve     from "../components/chart/EquityCurve";
import HealthPanel     from "../components/risk/HealthPanel";
import TradeJournal    from "../components/trade/TradeJournal";

const TABS = ["Trade Journal", "Analytics", "System Health"];

function MatrixCell({ label, value, sub }) {
  return (
    <div className="bg-border/30 rounded p-3 text-xs">
      <div className="text-muted mb-1">{label}</div>
      <div className="font-bold text-bright text-sm">{value}</div>
      {sub && <div className="text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function RegimeTable({ data }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Regime Performance</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(data).map(([regime, v]) => (
          <MatrixCell key={regime} label={regime} value={`${v.winRate}%`} sub={`${v.trades} trades`} />
        ))}
      </div>
    </div>
  );
}

function ScoreTable({ data }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Score Band Performance</h3>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(data).map(([band, v]) => (
          <MatrixCell key={band} label={`Score ${band}`} value={`${v.winRate}%`} sub={`${v.trades} trades`} />
        ))}
      </div>
    </div>
  );
}

function LiquidityTable({ data }) {
  if (!data) return null;
  return (
    <div>
      <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Liquidity Edge</h3>
      <div className="grid grid-cols-2 gap-2">
        <MatrixCell label="With Sweep"    value={`${data.sweep?.winRate || 0}%`}   sub={`${data.sweep?.trades || 0} trades`}   />
        <MatrixCell label="Without Sweep" value={`${data.noSweep?.winRate || 0}%`} sub={`${data.noSweep?.trades || 0} trades`} />
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { report, loadReport, trades } = useStore();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { loadReport(); }, []);

  const equityData = trades.reduce((acc, t) => {
    const last = acc[acc.length - 1]?.balance || 0;
    acc.push({ balance: last + (t.pnl || (t.result === "WIN" ? 1 : -1)) });
    return acc;
  }, [{ balance: 0 }]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">📊 Performance</h1>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid #1e293b", marginBottom:16 }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            padding:"8px 18px", border:"none", background:"none", cursor:"pointer",
            fontWeight:700, fontSize:13, letterSpacing:"0.02em",
            color:      activeTab === i ? "#60a5fa" : "#475569",
            borderBottom: activeTab === i ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom:-1,
          }}>{tab}</button>
        ))}
      </div>

      {/* Trade Journal */}
      {activeTab === 0 && <TradeJournal />}

      {/* Analytics (system-simulated trades from backtest/paper) */}
      {activeTab === 1 && (
        <div className="space-y-4">
          {report?.empty ? (
            <div className="signal-card text-center py-10 text-muted">
              <div className="text-3xl mb-2">📭</div>
              <div className="font-bold mb-1">No backtest/paper data yet</div>
              <div className="text-sm">Run a backtest or let the paper engine trade to populate analytics</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <EquityCurve data={equityData} />
                </div>
                <HealthPanel />
              </div>
              {report && (
                <div className="signal-card space-y-4">
                  <h2 className="text-sm font-bold text-muted uppercase tracking-widest">Strategy Matrix (Paper/Backtest)</h2>
                  <RegimeTable    data={report.regime}     />
                  <ScoreTable     data={report.scoreBands} />
                  <LiquidityTable data={report.liquidity}  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Health */}
      {activeTab === 2 && <HealthPanel />}
    </div>
  );
}
