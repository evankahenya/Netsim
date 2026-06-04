/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Network, Globe, Smartphone, Shield, Radio, Key, PlusCircle } from "lucide-react";
import { Device, DeviceType, DeviceRegDTO } from "../types";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (newDevice: Device) => void;
  apiBaseUrl?: string;
}

const DEVICE_TYPES: { value: DeviceType; label: string; icon: any }[] = [
  { value: "ROUTER", label: "Core Router", icon: Network },
  { value: "SWITCH", label: "Network Switch", icon: Shield },
  { value: "ACCESS_POINT", label: "Access Point", icon: Radio },
  { value: "FIREWALL", label: "Firewall Gateway", icon: Shield },
  { value: "CPE", label: "Customer Premises Eq (CPE)", icon: Smartphone },
  { value: "ONT", label: "Optical Network Terminal", icon: Globe },
  { value: "OTHER_DEVICE", label: "Other Device", icon: Network },
];

export default function RegisterDeviceModal({
  isOpen,
  onClose,
  onRegisterSuccess,
  apiBaseUrl = "",
}: RegisterDeviceModalProps) {
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("ROUTER");
  const [hostname, setHostname] = useState("");
  const [location, setLocation] = useState("");
  const [uuid, setUuid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Device name is required");
    if (!hostname.trim()) return setError("Hostname or IP Address is required");
    if (!location.trim()) return setError("Physical location is required");

    setLoading(true);

    const payload: DeviceRegDTO = {
      name: name.trim(),
      deviceType,
      hostname: hostname.trim(),
      location: location.trim(),
    };

    if (uuid.trim()) {
      payload.uuid = uuid.trim();
    }

    try {
      const targetUrl = apiBaseUrl ? `${apiBaseUrl.replace(/\/$/, "")}/api/devices/register` : "/api/devices/register";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register device");
      }

      const registered = await res.json();
      onRegisterSuccess(registered);
      
      // Reset form
      setName("");
      setDeviceType("ROUTER");
      setHostname("");
      setLocation("");
      setUuid("");
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            id="register-modal-container"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <PlusCircle className="w-5 h-5" id="plus-circle-icon" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">Register Network Device</h3>
                  <p className="text-xs text-slate-500">Provide device metadata to begin tracking</p>
                </div>
              </div>
              <button
                id="close-modal-btn"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="dev-name" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Device Name *
                  </label>
                  <input
                    id="dev-name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Seattle Firewall Gateway"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                {/* Device Type */}
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="dev-type" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Device Classification
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {DEVICE_TYPES.map((type) => {
                      const Icon = type.icon;
                      const selected = deviceType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          id={`type-btn-${type.value}`}
                          onClick={() => setDeviceType(type.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                            selected
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${selected ? "text-indigo-600" : "text-slate-400"}`} />
                          <span className="truncate">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hostname or IP */}
                <div className="space-y-1">
                  <label htmlFor="dev-host" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    IP Address / Hostname *
                  </label>
                  <input
                    id="dev-host"
                    type="text"
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or gateway.net"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                {/* Custom Optional UUID */}
                <div className="space-y-1">
                  <label htmlFor="dev-uuid" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Device UUID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="dev-uuid"
                    type="text"
                    value={uuid}
                    onChange={(e) => setUuid(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                {/* Physical Location */}
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="dev-loc" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Physical Installation Site *
                  </label>
                  <input
                    id="dev-loc"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Rack C4, Sector 7, Boston Office"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  id="cancel-reg-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-reg-btn"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {loading ? "Registering..." : "Register Device"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
