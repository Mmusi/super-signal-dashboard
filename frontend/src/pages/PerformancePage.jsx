import React, { useEffect } from "react";
import { useStore }    from "../store/useStore";
import EquityCurve     from "../components/chart/EquityCurve";
import TradeHistory    from "../components/risk/TradeHistory";
import HealthPanel     from "../components/risk/HealthPanel";

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
  if (!data) return null;
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
  if (!data) return null;
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

  useEffect(() => {
    loadReport();
  }, []);

  // Build mock equity curve from trades
  const equityData = trades.reduce((acc, t) => {
    const last = acc[acc.length - 1]?.balance || 0;
    acc.push({ balance: last + (t.pnl || (t.result === "WIN" ? 1 : -1)) });
    return acc;
  }, [{ balance: 0 }]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">📊 Performance Analytics</h1>

      {report?.empty ? (
        <div className="signal-card text-center py-10 text-muted">
          <div className="text-3xl mb-2">📭</div>
          <div className="font-bold mb-1">No trade data yet</div>
          <div className="text-sm">Run a backtest or trade in Paper mode to populate analytics</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EquityCurve data={equityData} />
            </div>
            <div>
              <HealthPanel />
            </div>
          </div>

          {report && (
            <div className="signal-card space-y-4">
              <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
                Strategy Matrix
              </h2>
              <RegimeTable    data={report.regime}     />
              <ScoreTable     data={report.scoreBands} />
              <LiquidityTable data={report.liquidity}  />
            </div>
          )}

          <TradeHistory />
        </div>
      )}
    </div>
  );
}
