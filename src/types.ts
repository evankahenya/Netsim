/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType =
  | "CPE"
  | "ROUTER"
  | "SWITCH"
  | "ACCESS_POINT"
  | "ONT"
  | "FIREWALL"
  | "OTHER_DEVICE";

export type DeviceStatusType =
  | "ONLINE"
  | "OFFLINE"
  | "DEGRADED"
  | "STALE"
  | "REMOVED";

export interface DeviceRegDTO {
  uuid?: string;
  name: string;
  deviceType: DeviceType;
  hostname: string;
  location: string;
}

export interface Device {
  deviceId: string;
  name: string;
  deviceType: DeviceType;
  hostname: string;
  location: string;
  regDate: string; // date-time format
  status: number; // integer (e.g. 1 for online, 2 for offline, 3 for degraded etc. or just numeric representation)
}

export interface DeviceReport {
  id: number;
  deviceId: string;
  description: string;
  deviceTimestamp: string; // date-time format
  timestamp: string; // date-time format
  reportStatus: DeviceStatusType;
}

export interface DeviceSummaryResponse {
  device: Device;
  currentStatus: DeviceStatusType;
  lastReportTimestamp: string; // date-time format
  stale: boolean;
}

export interface DeviceDetailsResponse {
  device: Device;
  currentStatus: DeviceStatusType;
  recentReports: DeviceReport[];
  stale: boolean;
}
