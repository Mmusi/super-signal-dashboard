import React from "react";
import Navbar from "./Navbar";
import AlertFeed from "../alerts/AlertFeed";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark text-bright flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
        <aside className="w-72 border-l border-border overflow-y-auto hidden xl:block">
          <AlertFeed />
        </aside>
      </div>
    </div>
  );
}
