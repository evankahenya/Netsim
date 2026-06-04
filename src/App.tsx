/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { Activity, ShieldCheck, Cpu, Terminal, AlertCircle } from "lucide-react";
import { DeviceSummaryResponse } from "./types";
import DeviceList from "./components/DeviceList";
import DeviceDetailsModal from "./components/DeviceDetailsModal";
import RegisterDeviceModal from "./components/RegisterDeviceModal";

export default function App() {
  const [deviceSummaries, setDeviceSummaries] = useState<DeviceSummaryResponse[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection settings states
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    return localStorage.getItem("netsim_api_base_url") ?? "";
  });
  const [customUrlInput, setCustomUrlInput] = useState<string>(() => {
    return localStorage.getItem("netsim_api_base_url") || "http://localhost:8070";
  });

  // Fetch summaries from Server API
  const fetchDevices = useCallback(async () => {
    try {
      const targetUrl = apiBaseUrl ? `${apiBaseUrl.replace(/\/$/, "")}/api/devices` : "/api/devices";
      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Unable to establish remote connection to monitoring services at ${targetUrl}`);
      }
      const data = await res.json();
      setDeviceSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Could not retrieve device simulation state.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Fetch once on mount, and establish polling for live updates
  useEffect(() => {
    setLoading(true);
    fetchDevices();

    const intervalId = setInterval(() => {
      fetchDevices();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDevices]);

  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id);
  };

  const handleOpenRegister = () => {
    setRegisterModalOpen(true);
  };

  const handleRegisterSuccess = () => {
    fetchDevices();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans transition-all selection:bg-indigo-100">
      {/* 1. Header Navigation HUD */}
      <header className="bg-slate-900 text-white shrink-0 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo and Brand Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-md border border-indigo-500/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold tracking-tight text-lg text-slate-100">NetSim Network Portal</h1>
                </div>
                <p className="text-xs text-slate-400">NetSim Hardware Device Monitoring & Telemetry Diagnostics</p>
              </div>
            </div>

            {/* LIVE API CONNECTION WIDGET (Top Right in Header) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-950/65 p-2 px-3 rounded-xl border border-slate-800" id="api-connection-widget">
              <button
                type="button"
                id="sandbox-mode-btn"
                onClick={() => {
                  setApiBaseUrl("");
                  localStorage.setItem("netsim_api_base_url", "");
                }}
                className={`text-[10px] py-1 px-3.5 rounded-lg font-bold font-mono uppercase tracking-wider transition cursor-pointer select-none ${
                  !apiBaseUrl
                    ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-xs"
                    : "text-slate-400 hover:bg-slate-900/50 hover:text-white"
                }`}
                title="Use built-in simulated sandbox server state"
              >
                BUILT-IN SIM STATE
              </button>
              <div className="hidden sm:block h-5 w-px bg-slate-800"></div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="api-gateway-input"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="e.g. http://localhost:8070"
                  className="bg-slate-900 border border-slate-800 text-xs font-mono rounded-lg px-2.5 py-1 text-slate-200 w-44 sm:w-48 focus:border-indigo-500 outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500"
                  title="Provide your running local API endpoint (e.g. http://localhost:8070)"
                />
                <button
                  type="button"
                  id="apply-gateway-btn"
                  onClick={() => {
                    const trimmed = customUrlInput.trim().replace(/\/$/, "");
                    setApiBaseUrl(trimmed);
                    localStorage.setItem("netsim_api_base_url", trimmed);
                  }}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3.5 rounded-lg font-bold font-mono uppercase tracking-wider transition cursor-pointer shadow-sm active:translate-y-px"
                >
                  CONNECT LIVE API
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Body Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error notification banner if connection fails */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 rounded-r-xl shadow-xs text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Network Ingress Failure</p>
              <p className="text-xs text-rose-700/90 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Registered Devices Directory Overview */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Device Monitoring Dashboard</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time visibility into the operational status and health of deployed network devices.
            </p>
          </div>

          {loading && deviceSummaries.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <Terminal className="w-10 h-10 text-indigo-500 mx-auto animate-bounce" />
              <p className="text-slate-500 text-sm font-medium">Synchronizing Fleet Registrate...</p>
              <p className="text-slate-400 text-xs">Awaiting primary node handshake and API synchronization.</p>
            </div>
          ) : (
            <DeviceList
              deviceSummaries={deviceSummaries}
              onSelectDevice={handleSelectDevice}
              onOpenRegister={handleOpenRegister}
              refreshLoading={loading}
              onRefresh={fetchDevices}
            />
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left font-medium text-xs text-slate-400">
            <p>© 2026 Device Monitoring Simulator. Built with Spring Boot and React. Evanson Kahenya</p>
          </div>
        </div>
      </footer>

      {/* 4. Overlay Modals */}
      <DeviceDetailsModal
        deviceId={selectedDeviceId}
        onClose={() => setSelectedDeviceId(null)}
        onUpdate={fetchDevices}
        apiBaseUrl={apiBaseUrl}
      />

      <RegisterDeviceModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
}
