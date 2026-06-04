/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  Device,
  DeviceReport,
  DeviceSummaryResponse,
  DeviceDetailsResponse,
  DeviceType,
  DeviceStatusType,
  DeviceRegDTO,
} from "./src/types";

// Setup simple Express application
const app = express();
app.use(express.json());

const PORT = 3000;

// State representation
let devices: Device[] = [];
let reports: DeviceReport[] = [];
let reportIdCounter = 1;

// Function to generate pre-seeded mockup data
function seedDatabase() {
  devices = [];
  reports = [];
  reportIdCounter = 1;

  const now = Date.now();

  const seedDevicesData: Array<{
    id: string;
    name: string;
    type: DeviceType;
    hostname: string;
    location: string;
    regOffset: number; // hrs ago
  }> = [
    {
      id: "dev-01-router-hq",
      name: "Core Gateway Router",
      type: "ROUTER",
      hostname: "10.100.1.1",
      location: "Seattle HQ Datacenter (Main Room - Rack A3)",
      regOffset: 48,
    },
    {
      id: "dev-02-ap-cafeteria",
      name: "Cafeteria High-Density Guest AP",
      type: "ACCESS_POINT",
      hostname: "10.100.14.23",
      location: "Building C Cafeteria (Ceiling Mount)",
      regOffset: 24,
    },
    {
      id: "dev-03-switch-rnd",
      name: "Lab PoE Switch 48-Port",
      type: "SWITCH",
      hostname: "gp-lab-sw05.internal.net",
      location: "R&D Testing Lab (Cabinet B)",
      regOffset: 12,
    },
    {
      id: "dev-04-fw-backup",
      name: "Disaster Recovery Backup Firewall",
      type: "FIREWALL",
      hostname: "172.16.89.4",
      location: "Portland DR Facility (Room 408)",
      regOffset: 72,
    },
    {
      id: "dev-05-cpe-remote",
      name: "Executive SOHO Router CPE",
      type: "CPE",
      hostname: "cpe-chicago-14.remote.net",
      location: "Chicago Remote Office (Executive Suite)",
      regOffset: 96,
    },
  ];

  // Insert seed devices
  seedDevicesData.forEach((sd) => {
    devices.push({
      deviceId: sd.id,
      name: sd.name,
      deviceType: sd.type,
      hostname: sd.hostname,
      location: sd.location,
      regDate: new Date(now - sd.regOffset * 60 * 60 * 1000).toISOString(),
      status: 1, // Online base
    });
  });

  // Helper to append a seed report
  function addSeedReport(
    deviceId: string,
    status: DeviceStatusType,
    desc: string,
    minutesAgo: number
  ) {
    const reportTime = new Date(now - minutesAgo * 60 * 1000).toISOString();
    reports.push({
      id: reportIdCounter++,
      deviceId,
      description: desc,
      deviceTimestamp: reportTime,
      timestamp: reportTime,
      reportStatus: status,
    });
  }

  // --- Router Reports (Active & Fresh) ---
  addSeedReport("dev-01-router-hq", "ONLINE", "System initial startup routine successfully completed.", 120);
  addSeedReport("dev-01-router-hq", "ONLINE", "Core routing tables refreshed: 14,231 active routes registered.", 60);
  addSeedReport("dev-01-router-hq", "ONLINE", "BGP connection established with peering partners stream-01 and backbone-west.", 15);
  addSeedReport("dev-01-router-hq", "ONLINE", "Telemetry report: CPU temperature stable at 42°C. Bandwidth throughput is normal at 4.2 Gbps.", 3);

  // --- Cafeteria AP Reports (Active, currently Degraded) ---
  addSeedReport("dev-02-ap-cafeteria", "ONLINE", "Access Point bootstrapped and loaded firmware v4.11.2.", 180);
  addSeedReport("dev-02-ap-cafeteria", "ONLINE", "Active client list: 12 devices registered. Channel quality 98%.", 90);
  addSeedReport("dev-02-ap-cafeteria", "DEGRADED", "High interference detected on 2.4GHz frequency channel. Backing off power.", 22);
  addSeedReport("dev-02-ap-cafeteria", "DEGRADED", "Client density warning: CPU load 88% due to high volume of concurrent video stream sessions in cafe.", 6);

  // --- Switch Lab Reports (Active, currently Offline) ---
  addSeedReport("dev-03-switch-rnd", "ONLINE", "PoE Switch powered on. Fan self-test successful.", 300);
  addSeedReport("dev-03-switch-rnd", "ONLINE", "VLAN configurations loaded for developer testing suites.", 150);
  addSeedReport("dev-03-switch-rnd", "ONLINE", "Interface PoE load: 120W of 370W utilized.", 45);
  addSeedReport("dev-03-switch-rnd", "OFFLINE", "Device lost power supply sub-module B. Admin initiated temporary offline reboot.", 12);

  // --- Firewall Portland Reports (STALE - Last report was 32 mins ago) ---
  addSeedReport("dev-04-fw-backup", "ONLINE", "Backup firewall cluster synchronized status with primary Seattle active node.", 120);
  addSeedReport("dev-04-fw-backup", "ONLINE", "Security rules check: 0 rules violation flags. Memory usage 34%.", 75);
  addSeedReport("dev-04-fw-backup", "ONLINE", "Periodic integrity scan passed. High availability standby heartbeat detected.", 32);

  // --- Chicago CPE Reports (Active & Fresh) ---
  addSeedReport("dev-05-cpe-remote", "ONLINE", "CPE fiber channel link synchronization initiated with local ISP.", 400);
  addSeedReport("dev-05-cpe-remote", "ONLINE", "IP allocation leased successfully via DHCP.", 390);
  addSeedReport("dev-05-cpe-remote", "ONLINE", "Operational status optimal: ping latency to upstream gateway at 4.5ms.", 1);
}

// Initialise DB with no seed data by default so the user can plug in their live API
// seedDatabase();

// --- Swagger / OpenAPI REST Endpoints ---

// Helper to check if a report is considered stale (over 15 minutes old)
function isReportStale(timestampStr: string): boolean {
  const timestamp = new Date(timestampStr).getTime();
  const fifteenMinutesInMs = 15 * 60 * 1000;
  return Date.now() - timestamp > fifteenMinutesInMs;
}

// Helper to compute a device's current status, stale flag, and last report time
function computeDeviceState(device: Device): {
  currentStatus: DeviceStatusType;
  lastReportTimestamp: string;
  stale: boolean;
} {
  // Find reports for this device
  const devReports = reports
    .filter((r) => r.deviceId === device.deviceId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (devReports.length === 0) {
    // If no reports exist, calculate staleness based on registration date
    const stale = isReportStale(device.regDate);
    return {
      currentStatus: stale ? "STALE" : "ONLINE",
      lastReportTimestamp: device.regDate,
      stale,
    };
  }

  const latest = devReports[0];
  const stale = isReportStale(latest.timestamp);
  
  // According to Swagger: currentStatus can explicitly be "STALE"
  const currentStatus: DeviceStatusType = stale ? "STALE" : latest.reportStatus;

  return {
    currentStatus,
    lastReportTimestamp: latest.timestamp,
    stale,
  };
}

/**
 * GET /api/devices
 * Swagger: List all registered devices together with their current simulation state.
 */
app.get("/api/devices", (req, res) => {
  try {
    const summaryList: DeviceSummaryResponse[] = devices.map((dev) => {
      const { currentStatus, lastReportTimestamp, stale } = computeDeviceState(dev);
      return {
        device: dev,
        currentStatus,
        lastReportTimestamp,
        stale,
      };
    });
    res.json(summaryList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/register
 * Swagger: Register a new device.
 */
app.post("/api/devices/register", (req, res) => {
  try {
    const body = req.body as DeviceRegDTO;
    
    if (!body.name || !body.deviceType || !body.hostname || !body.location) {
      return res.status(400).json({
        error: "Bad Request: Missing required properties (name, deviceType, hostname, location).",
      });
    }

    const validTypes: DeviceType[] = [
      "CPE",
      "ROUTER",
      "SWITCH",
      "ACCESS_POINT",
      "ONT",
      "FIREWALL",
      "OTHER_DEVICE",
    ];
    if (!validTypes.includes(body.deviceType)) {
      return res.status(400).json({
        error: `Bad Request: Invalid deviceType. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const uuid = body.uuid || `dev-${Math.random().toString(36).substring(2, 11)}`;
    
    // Check duplication
    if (devices.some((d) => d.deviceId === uuid)) {
      return res.status(409).json({ error: "Conflict: Device with this deviceId/UUID already exists." });
    }

    const newDevice: Device = {
      deviceId: uuid,
      name: body.name,
      deviceType: body.deviceType,
      hostname: body.hostname,
      location: body.location,
      regDate: new Date().toISOString(),
      status: 1, // Represents Online baseline status
    };

    devices.push(newDevice);

    // Automatically create an initial "ONLINE" status report for the newly registered device
    reports.push({
      id: reportIdCounter++,
      deviceId: uuid,
      description: `Device registered into monitor network. Core parameters synchronized successfully on host '${body.hostname}'.`,
      deviceTimestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      reportStatus: "ONLINE",
    });

    res.json(newDevice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices/{deviceId}
 * Swagger: Retrieve details for a single device, including its history of status reports.
 */
app.get("/api/devices/:deviceId", (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = devices.find((d) => d.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({ error: `Not Found: Device with ID '${deviceId}' does not exist.` });
    }

    const { currentStatus, stale } = computeDeviceState(device);

    // Get 20 most recent reports sorted descending
    const recentReports = reports
      .filter((r) => r.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    const details: DeviceDetailsResponse = {
      device,
      currentStatus,
      stale,
      recentReports,
    };

    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/:deviceId/reports
 * Custom endpoint (implied by required capabilities in PDF):
 * Submit a status report manually for a registered device.
 */
app.post("/api/devices/:deviceId/reports", (req, res) => {
  try {
    const { deviceId } = req.params;
    const { reportStatus, description } = req.body;

    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({ error: `Not Found: Device with ID '${deviceId}' does not exist.` });
    }

    const validStatuses: DeviceStatusType[] = ["ONLINE", "OFFLINE", "DEGRADED", "STALE", "REMOVED"];
    if (!reportStatus || !validStatuses.includes(reportStatus)) {
      return res.status(400).json({
        error: `Bad Request: Missing or invalid reportStatus. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const newReport: DeviceReport = {
      id: reportIdCounter++,
      deviceId,
      description: description || `Operational status notification: ${reportStatus}`,
      deviceTimestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      reportStatus,
    };

    reports.push(newReport);

    res.status(201).json(newReport);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Custom Control APIs for testing & simulation ---

/**
 * POST /api/devices/reset
 * Restores initial seed database so the operator can test features from zero.
 */
app.post("/api/devices/reset", (req, res) => {
  try {
    seedDatabase();
    res.json({ message: "Database successfully reset to default simulated state." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/:deviceId/stale-mock
 * Ages reports of a device instantly to test Stale Alerts.
 * Rotates report timestamps to be 16 minutes ago.
 */
app.post("/api/devices/:deviceId/stale-mock", (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({ error: `Device '${deviceId}' not found.` });
    }

    // Get all reports of this device
    const deviceReports = reports.filter((r) => r.deviceId === deviceId);
    
    // Shift timestamps back by 16 minutes (16 * 60 * 1000 ms)
    const sixteenMinMs = 16 * 60 * 1000;
    
    deviceReports.forEach((r) => {
      const origTimestamp = new Date(r.timestamp).getTime();
      const newTime = new Date(origTimestamp - sixteenMinMs).toISOString();
      r.timestamp = newTime;
      r.deviceTimestamp = newTime;
    });

    // If there were no reports, update device's registration date to be stale
    if (deviceReports.length === 0) {
      const origReg = new Date(device.regDate).getTime();
      device.regDate = new Date(origReg - sixteenMinMs).toISOString();
    }

    res.json({ message: `Successfully simulated 16 minutes passing for device '${device.name}'. Status should now detect as STALE.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/simulate-telemetry
 * Run an automatic global simulation tick. For active devices, generates 
 * a variety of realistic logs like packet latency checks, load stats, etc.
 */
app.post("/api/devices/simulate-telemetry", (req, res) => {
  try {
    const reportLogTemplates: Record<DeviceType, string[]> = {
      CPE: [
        "Fiber sync status checked. Frame drop count: 0.",
        "WAN DHCP lease renewed. Uplink latency 8ms.",
        "Local router diagnostics: temperature 38C.",
      ],
      ROUTER: [
        "Core CPU utilization nominal: 14%. Core traffic average 5.1 Gbps.",
        "Internal thermal sensors report: 45°C. Cooling fans at normal RPM.",
        "Neighbor discovery handshake completed. OSPF packet tables updated.",
      ],
      SWITCH: [
        "Gigabit Interface status: FastEthernet 1/12 Link Up.",
        "Spanning Tree Protocol topology stable. No loops found.",
        "Packet dropped count at 0.001% of total switched packets.",
      ],
      ACCESS_POINT: [
        "Active wireless client count: 48. RF interference index 1.2% (Low).",
        "Configured radio scan completed. Auto-channel adjustment not required.",
        "Dynamic rate adaptation matched: maximum throughput on 5GHz band.",
      ],
      ONT: [
        "Laser status RX/TX within normal margins (-18.2 dBm).",
        "GPON frame synchronization locked.",
        "Optical line signal validated. Downstream bitrate: 1.25 Gbps.",
      ],
      FIREWALL: [
        "Stateful packet inspection pipeline normal. Blocked 12 intrusive requests.",
        "Intrusion detection tables cleared. Database integrity green.",
        "SSL Decrypt pipeline overhead: 4%. Memory buffer clear.",
      ],
      OTHER_DEVICE: [
        "General ping responder alive.",
        "Operational status queried. Heartbeat successful.",
        "Chassis door sensor closed. Alarm cleared.",
      ],
    };

    const statuses: DeviceStatusType[] = ["ONLINE", "ONLINE", "ONLINE", "DEGRADED", "OFFLINE"];

    // Pick 1-2 random devices to send a telemetry tick
    const count = Math.min(2, devices.length);
    const shuffled = [...devices].sort(() => 0.5 - Math.random());
    const affectedDevices = shuffled.slice(0, count);

    const generatedReports: DeviceReport[] = [];

    affectedDevices.forEach((device) => {
      const templates = reportLogTemplates[device.deviceType] || ["Heartbeat signal received."];
      const desc = templates[Math.floor(Math.random() * templates.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const r: DeviceReport = {
        id: reportIdCounter++,
        deviceId: device.deviceId,
        description: `[AUTO-SIMULATOR] ${desc}`,
        deviceTimestamp: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        reportStatus: status,
      };

      reports.push(r);
      generatedReports.push(r);
    });

    res.json({
      message: `Simulation telemetry tick generated ${generatedReports.length} reports successfully.`,
      reports: generatedReports,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// --- Vite Middleware Server Setup ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
