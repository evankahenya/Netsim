/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Clock,
  MapPin,
  Cpu,
  Calendar,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  CornerDownRight,
  FileText,
} from "lucide-react";
import { Device, DeviceReport, DeviceStatusType } from "../types";
import { jsPDF } from "jspdf";

interface DeviceDetailsModalProps {
  deviceId: string | null;
  onClose: () => void;
  onUpdate: () => void; // Triggered when a new report is posted or device updated
  apiBaseUrl?: string;
}

export function getRelativeTimeString(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const absoluteDiff = Math.abs(diffMs);
  const diffMins = Math.floor(absoluteDiff / (60 * 1000));
  
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) {
    return diffMs < 0 ? `In ${diffMins} minutes` : `${diffMins} minutes ago`;
  }
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs === 1) return "1 hour ago";
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function DeviceDetailsModal({
  deviceId,
  onClose,
  onUpdate,
  apiBaseUrl = "",
}: DeviceDetailsModalProps) {
  const [details, setDetails] = useState<{
    device: Device;
    currentStatus: DeviceStatusType;
    recentReports: DeviceReport[];
    stale: boolean;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefixUrl = (path: string) => {
    if (!apiBaseUrl) return path;
    return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
  };

  const fetchDeviceDetails = async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(prefixUrl(`/api/devices/${deviceId}`));
      if (!res.ok) {
        throw new Error("Unable to retrieve device diagnostics");
      }
      const data = await res.json();
      setDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load device information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchDeviceDetails();
    }
  }, [deviceId]);

  const handleDownloadPDF = () => {
    if (!details) return;
    const { device, currentStatus, recentReports, stale } = details;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 15;
    let y = 20;

    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(12, y - 5, 186, 30, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("NETSIM PORTAL - DEVICE DIAGNOSTIC REPORT", 16, y + 4);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated on ${new Date().toLocaleString()} | Secure Telemetry Log`, 16, y + 12);

    y += 35;

    // Section 1: Specifications
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("1. DEVICE SPECIFICATIONS", margin, y);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(margin, y + 2, 195, y + 2);
    y += 10;

    const col1X = margin + 2;
    const col2X = 110;

    const drawSpecRow = (label1: string, val1: string, label2: string, val2: string) => {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label1, col1X, y);
      doc.text(label2, col2X, y);
      
      y += 4.5;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(val1, col1X, y);
      doc.text(val2, col2X, y);
      y += 8;
    };

    drawSpecRow(
      "DEVICE NAME / HOSTNAME", device.name || "N/A",
      "DEVICE TYPE", device.deviceType || "N/A"
    );
    drawSpecRow(
      "PHYSICAL IP / WEB ADDRESS", device.hostname || "N/A",
      "PHYSICAL SITE / LOCATION", device.location || "N/A"
    );
    drawSpecRow(
      "REGISTRATION DATE", new Date(device.regDate).toUTCString(),
      "SYSTEM IDENTIFICATION ID", device.deviceId || "N/A"
    );

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("CURRENT OPERATIONAL STATUS", col1X, y);
    doc.text("STALE TELEMETRY ALIGNMENT", col2X, y);
    y += 4.5;

    let statusColor = [5, 150, 105]; // Green ONLINE
    if (currentStatus === "DEGRADED") statusColor = [217, 119, 6]; // Amber
    else if (currentStatus === "OFFLINE") statusColor = [220, 38, 38]; // Red
    else if (currentStatus === "STALE") statusColor = [124, 58, 237]; // Violet

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(currentStatus, col1X, y);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(stale ? "YES (NO RECENT HEARTBEATS)" : "NO (CURRENT SYSTEM ALIGNED)", col2X, y);

    y += 18;

    // Section 2: Recent reports
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("2. TELEMETRY DIAGNOSTIC TIMELINE HISTORY", margin, y);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 2, 195, y + 2);
    y += 10;

    if (!recentReports || recentReports.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      doc.text("No status events or telemetry diagnostic reports logged for this asset.", margin + 2, y);
    } else {
      recentReports.forEach((rpt) => {
        if (y > 250) {
          doc.addPage();
          y = 20;

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`DEVICE DIAGNOSTIC REPORT - ${device.name} (Timeline Cont.)`, margin, y);
          doc.line(margin, y + 2, 195, y + 2);
          y += 10;
        }

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(241, 245, 249); // slate-100
        
        let tagColor = [5, 150, 105]; // Green ONLINE
        if (rpt.reportStatus === "DEGRADED") tagColor = [217, 119, 6]; // Amber
        else if (rpt.reportStatus === "OFFLINE") tagColor = [220, 38, 38]; // Red
        else if (rpt.reportStatus === "STALE") tagColor = [124, 58, 237]; // Violet
        
        const descriptionText = rpt.description || "No description provided.";
        const wrappedDesc = doc.splitTextToSize(descriptionText, 168);
        const cardHeight = wrappedDesc.length * 5 + 12;

        doc.rect(margin, y - 4, 180, cardHeight, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(tagColor[0], tagColor[1], tagColor[2]);
        doc.text(`[${rpt.reportStatus}]`, margin + 4, y + 1);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Logged: ${new Date(rpt.timestamp).toUTCString()}`,
          margin + 35,
          y + 1
        );

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // slate-700
        
        let textY = y + 6;
        wrappedDesc.forEach((lineText: string) => {
          doc.text(lineText, margin + 4, textY);
          textY += 4.5;
        });

        y = Math.max(textY + 6, y + cardHeight + 4);
      });
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Confidential document. Produced automatically by Device Monitoring Simulator.",
      margin,
      285
    );

    const cleanFilename = `${(device.name || "device").toLowerCase().replace(/[^a-z0-9]/g, "-")}-status-report.pdf`;
    doc.save(cleanFilename);
  };



  const getStatusStyle = (status: DeviceStatusType) => {
    switch (status) {
      case "ONLINE":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          ring: "ring-emerald-500",
          text: "text-emerald-600",
          icon: CheckCircle2,
          pulse: "bg-emerald-400",
        };
      case "DEGRADED":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-100",
          ring: "ring-amber-500",
          text: "text-amber-600",
          icon: AlertTriangle,
          pulse: "bg-amber-400",
        };
      case "OFFLINE":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-100",
          ring: "ring-rose-500",
          text: "text-rose-600",
          icon: XCircle,
          pulse: "bg-rose-400",
        };
      case "STALE":
        return {
          bg: "bg-violet-50 text-violet-700 border-violet-100",
          ring: "ring-violet-500",
          text: "text-violet-600",
          icon: Clock,
          pulse: "bg-violet-400",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-100",
          ring: "ring-slate-500",
          text: "text-slate-600",
          icon: AlertOctagon,
          pulse: "bg-slate-400",
        };
    }
  };

  return (
    <AnimatePresence>
      {deviceId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
            id="details-modal-container"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 grid grid-cols-1 md:grid-cols-5 h-[90vh] md:h-[80vh]"
          >
            {/* LEFT COLUMN: Device Info & Submitter (2cols) */}
            <div className="md:col-span-2 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Device Primary Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold uppercase tracking-wider rounded">
                      {details?.device.deviceType || "DEVICE"}
                    </span>
                    <h3 className="font-bold text-slate-800 text-xl mt-1 tracking-tight">
                      {details?.device.name || "Loading..."}
                    </h3>
                  </div>
                  <button
                    id="mobile-close-btn"
                    onClick={onClose}
                    className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loading && !details ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    Retrieving telemetry asset spec...
                  </div>
                ) : error ? (
                  <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs">
                    {error}
                  </div>
                ) : details ? (
                  <>
                    {/* Computed Active Status Banner */}
                    <div
                      id="computed-status-banner"
                      className={`relative flex items-center justify-between p-4 rounded-xl border ${
                        getStatusStyle(details.currentStatus).bg
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              getStatusStyle(details.currentStatus).pulse
                            }`}
                          ></span>
                          <span
                            className={`relative inline-flex rounded-full h-3 w-3 ${
                              getStatusStyle(details.currentStatus).pulse
                            }`}
                          ></span>
                        </span>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                            {details.device.name}
                          </p>
                          <p className="text-sm font-bold uppercase transition-all">
                            {details.currentStatus}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                      <div className="flex items-start gap-2.5 text-xs">
                        <Cpu className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-500 uppercase tracking-widest text-[9px]">
                            HOSTNAME / NETWORK INTERFACE
                          </p>
                          <p className="font-mono text-slate-800 text-sm">{details.device.hostname}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-500 uppercase tracking-widest text-[9px]">
                            PHYSICAL LOCATION OR SITE
                          </p>
                          <p className="text-slate-700 font-medium">{details.device.location}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-500 uppercase tracking-widest text-[9px]">
                            REGISTRATION TIMESTAMP
                          </p>
                          <p className="text-slate-700">
                            {new Date(details.device.regDate).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs border-t border-slate-50 pt-2.5">
                        <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-500 uppercase tracking-widest text-[9px]">
                            DATABASE REGISTRATION ID
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 truncate w-48 block">
                            {details.device.deviceId}
                          </p>
                        </div>
                      </div>
                    </div>


                  </>
                ) : null}
              </div>


            </div>

            {/* RIGHT COLUMN: Diagnostic Reports & Interactive Form (3cols) */}
            <div className="md:col-span-3 flex flex-col justify-between overflow-hidden h-full">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">
                    Diagnostic Timeline
                  </h4>
                </div>
                <button
                  id="desktop-close-btn"
                  onClick={onClose}
                  className="hidden md:block p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reports Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
                {details?.recentReports && details.recentReports.length > 0 ? (
                  <div className="relative pl-6 border-l border-slate-200 space-y-6">
                    {details.recentReports.map((report) => {
                      const S = getStatusStyle(report.reportStatus);
                      const Icon = S.icon;
                      return (
                        <div key={report.id} className="relative group" id={`report-item-${report.id}`}>
                          {/* Dot / Pulse Indicator */}
                          <div
                            className={`absolute -left-[31px] top-1 p-1 bg-white rounded-full border-2 border-slate-200 group-hover:border-slate-300 transition shadow-xs`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${S.text}`} />
                          </div>

                          {/* Report Body */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs group-hover:shadow-xs transition duration-250">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${S.bg}`}
                              >
                                {report.reportStatus}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-300" />
                                {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({getRelativeTimeString(report.timestamp)})
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                              {report.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium text-sm">No Status Reports Available</p>
                    <p className="text-xs text-slate-400 mt-1">
                      This device has not generated status events yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Diagnostic Status Report Exporter Panel (Fixed to Bottom) */}
              <div className="border-t border-slate-100 p-5 bg-white shadow-lg shrink-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest font-mono">
                      Export Device Diagnostics
                    </h5>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                      PDF Document Generation
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      id="download-pdf-report-btn"
                      type="button"
                      onClick={handleDownloadPDF}
                      className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-xl transition-all duration-200 shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:translate-y-px"
                      title="Download PDF status report with a the status report of the particular device"
                    >
                      <FileText className="w-4 h-4 shrink-0 text-indigo-200" />
                      Download Device Status PDF Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
