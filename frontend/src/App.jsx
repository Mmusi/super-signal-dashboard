import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import MarketPage from "./pages/MarketPage";
import PerformancePage from "./pages/PerformancePage";
import BacktestPage from "./pages/BacktestPage";
import ControlPage from "./pages/ControlPage";
import { useStore } from "./store/useStore";

export default function App() {
  const { connect } = useStore();

  useEffect(() => {
    connect();
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/market"     element={<MarketPage />} />
        <Route path="/performance"element={<PerformancePage />} />
        <Route path="/backtest"   element={<BacktestPage />} />
        <Route path="/control"    element={<ControlPage />} />
      </Routes>
    </Layout>
  );
}
