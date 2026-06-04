/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Play, Square, RotateCcw, Zap, HelpCircle, Network, Info } from "lucide-react";

interface SimulatorControlCenterProps {
  onSimulationTick: () => void;
  onReset: () => void;
}

export default function SimulatorControlCenter({
  onSimulationTick,
  onReset,
}: SimulatorControlCenterProps) {
  const [isAutoActive, setIsAutoActive] = useState(false);
  const [tickMs, setTickMs] = useState(10000); // Default 10s tick
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastTickTime, setLastTickTime] = useState<string | null>(null);

  // Background simulation interval hook
  useEffect(() => {
    let interval: any = null;
    if (isAutoActive) {
      interval = setInterval(async () => {
        await handleManualTick();
      }, tickMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoActive, tickMs]);

  const handleManualTick = async () => {
    setLoadingFlag(true);
    try {
      const res = await fetch("/api/devices/simulate-telemetry", {
        method: "POST",
      });
      if (res.ok) {
        setLastTickTime(new Date().toLocaleTimeString());
        onSimulationTick();
      }
    } catch (e) {
      console.error("Telemetry tick failed", e);
    } finally {
      setLoadingFlag(false);
    }
  };

  const handleResetDb = async () => {
    if (confirm("Are you sure you want to reset the device database? This restores pre-seeded configurations, fresh reports, and clears custom devices.")) {
      try {
        const res = await fetch("/api/devices/reset", { method: "POST" });
        if (res.ok) {
          setLastTickTime(null);
          onReset();
        }
      } catch (e) {
        console.error("Reset failed", e);
      }
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-5 space-y-4">
      {/* Primary header & controller */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Active Simulation Engine</h2>
            <p className="text-xs text-slate-400">
              Manage network status updates, simulate telemetry feeds, and verify operator alarms.
            </p>
          </div>
        </div>

        {/* Buttons Control Pack */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Manual Telemetry Tick */}
          <button
            id="manual-tick-btn"
            onClick={handleManualTick}
            disabled={loadingFlag}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
            title="Generate random reports on 1-2 devices instantly"
          >
            <Zap className={`w-3.5 h-3.5 ${loadingFlag ? "animate-spin" : ""}`} />
            Trigger Telemetry Tick
          </button>

          {/* Auto Simulator Controller Toggle */}
          <button
            id="toggle-auto-sim"
            onClick={() => setIsAutoActive(!isAutoActive)}
            className={`px-4 py-2 font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer ${
              isAutoActive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {isAutoActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                Auto: Active ({tickMs / 1000}s)
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-300 shrink-0" />
                Start Auto-Telemetry
              </>
            )}
          </button>

          {/* Reset Simulated Data */}
          <button
            id="reset-db-btn"
            onClick={handleResetDb}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 border border-slate-700/50"
            title="Restore original devices & reports configurations"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset DB
          </button>

          {/* Help Toggle */}
          <button
            id="toggle-help-btn"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              showHelp ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title="View simulation details"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Helpful Quick Status Indicators */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-mono bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
          <span>Engine Status: <strong className="text-slate-200">STANDBY / ARMED</strong></span>
        </div>
        {lastTickTime && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Last Telemetry Generated: <strong className="text-slate-200">{lastTickTime}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span>Staleness Limit: <strong className="text-slate-200">15 Minutes</strong></span>
        </div>
      </div>

      {/* Expandable Help & Instruction Deck */}
      {showHelp && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-2.5 text-xs select-none">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
            <Info className="w-4 h-4" />
            Operator Simulation Reference
          </div>
          <p className="leading-relaxed">
            This platform simulates a <strong>Network Device Monitoring Server</strong> matching the OpenAPI schema spec. Here's how to interactively evaluate the features:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1.5">
            <li>
              <strong className="text-slate-200">Real-Time Staleness Alerting:</strong> Devices must check-in with a status report at least once every 15 minutes. Click any device, click its <strong>"Simulate 16 Mins Passing"</strong> action to age its reports, and watch it turn <span className="text-violet-400 font-semibold">STALE</span> instantly.
            </li>
            <li>
              <strong className="text-slate-200">Register Devices:</strong> Click the <strong>"+ Register Device"</strong> button to add brand new CPEs, Switches, Firewalls, or Routers. They immediately start generating telemetry logs.
            </li>
            <li>
              <strong className="text-slate-200">Trigger Telemetry Tick:</strong> Firing a telemetry tick automatically sends randomized operational reports on behalf of active devices, simulating live router traffic.
            </li>
            <li>
              <strong className="text-slate-200">Manual Status Submission:</strong> Open any device's details, select either ONLINE, DEGRADED, or OFFLINE, and enter a message to send a manual operator status update.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
