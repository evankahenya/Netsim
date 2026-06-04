/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Search,
  Filter,
  Layers,
  Network,
  Radio,
  Shield,
  Smartphone,
  Globe,
  Plus,
  ArrowUpRight,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
} from "lucide-react";
import { DeviceSummaryResponse, DeviceType, DeviceStatusType } from "../types";
import { getRelativeTimeString } from "./DeviceDetailsModal";

interface DeviceListProps {
  deviceSummaries: DeviceSummaryResponse[];
  onSelectDevice: (deviceId: string) => void;
  onOpenRegister: () => void;
  refreshLoading: boolean;
  onRefresh: () => void;
}

const DEVICE_TYPE_ICONS: Record<DeviceType, any> = {
  ROUTER: Network,
  SWITCH: Shield,
  ACCESS_POINT: Radio,
  FIREWALL: Shield,
  CPE: Smartphone,
  ONT: Globe,
  OTHER_DEVICE: Layers,
};

export default function DeviceList({
  deviceSummaries,
  onSelectDevice,
  onOpenRegister,
  refreshLoading,
  onRefresh,
}: DeviceListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Status Counter Analytics
  const totalCount = deviceSummaries.length;
  const onlineCount = deviceSummaries.filter((d) => d.currentStatus === "ONLINE").length;
  const degradedCount = deviceSummaries.filter((d) => d.currentStatus === "DEGRADED").length;
  const offlineCount = deviceSummaries.filter((d) => d.currentStatus === "OFFLINE").length;
  const staleCount = deviceSummaries.filter((d) => d.stale).length;

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  // Filtered List Computation
  const filteredSummaries = deviceSummaries.filter((item) => {
    // 1. Text Search matching name, hostname, location, deviceType, or id
    const matchText =
      item.device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.device.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.device.deviceId.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Type Match
    const matchType = typeFilter === "ALL" || item.device.deviceType === typeFilter;

    // 3. Status Match
    let matchStatus = true;
    if (statusFilter !== "ALL") {
      if (statusFilter === "STALE") {
        matchStatus = item.stale;
      } else {
        // Only match non-stale exact status
        matchStatus = item.currentStatus === statusFilter && !item.stale;
      }
    }

    return matchText && matchType && matchStatus;
  });

  const getStatusBadgeStyle = (status: DeviceStatusType, isStale: boolean) => {
    if (isStale) {
      return {
        bg: "bg-violet-50 text-violet-700 border-violet-100",
        indicator: "bg-violet-500",
        border: "border-violet-100 hover:border-violet-200",
        text: "text-violet-600",
        label: "STALE",
      };
    }

    switch (status) {
      case "ONLINE":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          indicator: "bg-emerald-500",
          border: "border-emerald-100 hover:border-emerald-200",
          text: "text-emerald-600",
          label: "ONLINE",
        };
      case "DEGRADED":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-100",
          indicator: "bg-amber-500",
          border: "border-amber-100 hover:border-amber-200",
          text: "text-amber-500",
          label: "DEGRADED",
        };
      case "OFFLINE":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-100",
          indicator: "bg-rose-500",
          border: "border-rose-100 hover:border-rose-200",
          text: "text-rose-600",
          label: "OFFLINE",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-100",
          indicator: "bg-slate-500",
          border: "border-slate-100 hover:border-slate-200",
          text: "text-slate-600",
          label: status,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Status Counters Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* TOTAL CARDS */}
        <div
          id="stat-total-card"
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 bg-white rounded-2xl border transition shadow-2xs hover:shadow-xs cursor-pointer ${
            statusFilter === "ALL" ? "border-indigo-500 bg-indigo-50/10 ring-2 ring-indigo-50" : "border-slate-100"
          }`}
        >
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Total Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-800">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">Devices</span>
          </div>
        </div>

        {/* ONLINE */}
        <div
          id="stat-online-card"
          onClick={() => setStatusFilter("ONLINE")}
          className={`p-4 bg-white rounded-2xl border transition shadow-2xs hover:shadow-xs cursor-pointer ${
            statusFilter === "ONLINE" ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-50" : "border-slate-100"
          }`}
        >
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">{onlineCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">Active</span>
          </div>
        </div>

        {/* DEGRADED */}
        <div
          id="stat-degraded-card"
          onClick={() => setStatusFilter("DEGRADED")}
          className={`p-4 bg-white rounded-2xl border transition shadow-2xs hover:shadow-xs cursor-pointer ${
            statusFilter === "DEGRADED" ? "border-amber-500 bg-amber-50/10 ring-2 ring-amber-50" : "border-slate-100"
          }`}
        >
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Degraded
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-500">{degradedCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">Warning</span>
          </div>
        </div>

        {/* OFFLINE */}
        <div
          id="stat-offline-card"
          onClick={() => setStatusFilter("OFFLINE")}
          className={`p-4 bg-white rounded-2xl border transition shadow-2xs hover:shadow-xs cursor-pointer ${
            statusFilter === "OFFLINE" ? "border-rose-500 bg-rose-50/10 ring-2 ring-rose-50" : "border-slate-100"
          }`}
        >
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Offline
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-rose-600">{offlineCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">Alerting</span>
          </div>
        </div>

        {/* STALE */}
        <div
          id="stat-stale-card"
          onClick={() => setStatusFilter("STALE")}
          className={`p-4 bg-white rounded-2xl border transition shadow-2xs hover:shadow-xs cursor-pointer col-span-2 lg:col-span-1 ${
            statusFilter === "STALE" ? "border-violet-500 bg-violet-50/10 ring-2 ring-violet-50" : "border-slate-100"
          }`}
        >
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span> Stale Alerts
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-violet-600">{staleCount}</span>
            <span className="text-[10px] text-indigo-500 font-bold">15m+ Idle</span>
          </div>
        </div>
      </div>

      {/* 2. Operations Bar (Search & Filter toggles) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="operator-search-bar"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search devices by name, IP, site, ID..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
          />
        </div>

        {/* Dropdowns Filters Pack */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Device Type Select dropdown */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 uppercase tracking-wider text-[9px] hidden sm:inline">Type:</span>
            <select
              id="type-select-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent outline-none font-bold text-slate-700 pr-1.5 cursor-pointer max-w-[120px]"
            >
              <option value="ALL">All Equipment</option>
              <option value="ROUTER">Core Routers</option>
              <option value="SWITCH">Switches</option>
              <option value="ACCESS_POINT">Access Points</option>
              <option value="FIREWALL">Firewalls</option>
              <option value="CPE">CPE Devices</option>
              <option value="ONT">ONT Terminals</option>
              <option value="OTHER_DEVICE">Other Devices</option>
            </select>
          </div>

          {/* Refresh Action Trigger */}
          <button
            id="refresh-assets-btn"
            onClick={onRefresh}
            disabled={refreshLoading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:text-slate-400 p-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 self-stretch"
            title="Force refresh device listings"
          >
            <RefreshCw className={`w-4 h-4 ${refreshLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reload</span>
          </button>

          {/* Register New Device Main Button */}
          <button
            id="open-register-modal-btn"
            onClick={onOpenRegister}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Register Device
          </button>
        </div>
      </div>

      {/* Filter Clearing Panel if filters match */}
      {(searchTerm || typeFilter !== "ALL" || statusFilter !== "ALL") && (
        <div className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-xs text-indigo-800">
          <p>
            Filter Profile: Showing{" "}
            <strong>
              {filteredSummaries.length} of {deviceSummaries.length}
            </strong>{" "}
            devices matching constraints.
          </p>
          <button
            id="clear-filters-btn"
            onClick={handleClearFilters}
            className="font-bold underline uppercase tracking-wider text-[10px] hover:text-indigo-600 cursor-pointer"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {/* 3. Devices Listing Live List Table */}
      {filteredSummaries.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden" id="devices-listing-list">
          {/* List Toolbar / Hot Sync Status Label */}
          <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              NOC Operational Directory
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE TELEMETRY AUTO-REFRESH ON</span>
            </div>
          </div>

          {/* Desktop/Tablet List Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <div className="col-span-1 flex justify-center">Status</div>
            <div className="col-span-2">Device Type</div>
            <div className="col-span-4">Device Location</div>
            <div className="col-span-4">Device Name</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-slate-100">
            {filteredSummaries.map((item) => {
              const Badge = getStatusBadgeStyle(item.currentStatus, item.stale);
              
              // Status Dot colors mapped to statuses
              let dotBgClass = "bg-emerald-500";
              let dotRingClass = "bg-emerald-400";
              
              if (item.stale) {
                dotBgClass = "bg-violet-600";
                dotRingClass = "bg-violet-400";
              } else {
                switch (item.currentStatus) {
                  case "ONLINE":
                    dotBgClass = "bg-emerald-500";
                    dotRingClass = "bg-emerald-400";
                    break;
                  case "DEGRADED":
                    dotBgClass = "bg-amber-500";
                    dotRingClass = "bg-amber-400";
                    break;
                  case "OFFLINE":
                    dotBgClass = "bg-rose-600";
                    dotRingClass = "bg-rose-400";
                    break;
                }
              }

              return (
                <div
                  id={`device-row-${item.device.deviceId}`}
                  key={item.device.deviceId}
                  onClick={() => onSelectDevice(item.device.deviceId)}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50/70 transition duration-150 cursor-pointer group"
                >
                  {/* Field 1: Status Dot at the raw beginning */}
                  <div className="col-span-1 justify-self-center flex items-center md:justify-center gap-2.5">
                    {/* Status Dot with constant glowing/pulsing telemetry update effect */}
                    <span className="relative flex h-3.5 w-3.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotRingClass}`}></span>
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-white shadow-xs ${dotBgClass}`}></span>
                    </span>
                    
                    {/* Mobile helper label */}
                    <div className="md:hidden flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Status:</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${Badge.bg}`}>
                        {Badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Field 2: Device Type */}
                  <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                    <span className="text-slate-400 font-semibold block md:hidden text-xs">Device Type:</span>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/60 px-2 py-1 rounded inline-block">
                      {item.device.deviceType}
                    </span>
                  </div>

                  {/* Field 3: Device Location */}
                  <div className="col-span-12 md:col-span-4 flex items-center md:items-start gap-2 max-w-full overflow-hidden">
                    <span className="text-slate-400 font-semibold block md:hidden text-xs shrink-0">Location:</span>
                    <div className="text-xs text-slate-600 truncate flex items-center gap-1 text-left">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.device.location}</span>
                    </div>
                  </div>

                  {/* Field 4: Device Name */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-2">
                    <span className="text-slate-400 font-semibold block md:hidden text-xs">Device Name:</span>
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-tight truncate group-hover:text-indigo-600 transition">
                      {item.device.name}
                    </span>
                  </div>

                  {/* Column 5: Right Side Actions link */}
                  <div className="col-span-12 md:col-span-1 text-right flex md:block items-center justify-between border-t md:border-none pt-2.5 md:pt-0 mt-2 md:mt-0">
                    <span className="text-slate-400 font-semibold block md:hidden text-xs">Last Report:</span>
                    <div className="text-right flex items-center md:justify-end gap-1.5">
                      {/* Show elapsed report age */}
                      <span className="text-[10px] text-slate-400 font-semibold mr-1.5 md:hidden lg:inline-block">
                        {getRelativeTimeString(item.lastReportTimestamp)}
                      </span>
                      <span className="p-1 px-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-0.5">
                        Logs
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 px-6 text-center shadow-3xs max-w-lg mx-auto">
          <AlertOctagon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Matching Assets Identified</h3>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Your current search or filter combination did not yield any registered network assets. Try clearing active filters or register a new hardware device.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              id="no-match-clear-btn"
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer transition"
            >
              Reset Filters
            </button>
            <button
              id="no-match-register-btn"
              onClick={onOpenRegister}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs cursor-pointer transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Register Asset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
