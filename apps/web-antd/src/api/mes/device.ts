import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace DeviceApi {
  /** 设备（MesDeviceVo） */
  export interface Device {
    createTime?: string;
    deviceCode: string;
    deviceId: string;
    deviceName: string;
    deviceType?: string;
    factoryId: string;
    factoryName?: string;
    lineId?: string;
    lineName?: string;
    manufacturer?: string;
    model?: string;
    remark?: string;
    stationId?: string;
    stationName?: string;
    /** 0 正常，1 停用 */
    status: string;
    workshopId?: string;
    workshopName?: string;
  }

  /** 查询条件（MesDeviceBo） */
  export interface Query extends PageQuery {
    deviceCode?: string;
    deviceName?: string;
    deviceType?: string;
    factoryId?: string;
    status?: string;
    workshopId?: string;
  }

  /** 新增、修改的参数（MesDeviceBo） */
  export type Form = Omit<
    Device,
    | 'createTime'
    | 'deviceId'
    | 'factoryName'
    | 'lineName'
    | 'stationName'
    | 'workshopName'
  > & {
    deviceId?: string;
  };
}

const BASE = `${MES_BASE}/device`;

export function listDevice(query: DeviceApi.Query) {
  return requestClient.get<PageResult<DeviceApi.Device>>(`${BASE}/list`, {
    params: query,
  });
}

export function getDevice(deviceId: string) {
  return requestClient.get<DeviceApi.Device>(`${BASE}/${deviceId}`);
}

export function addDevice(data: DeviceApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateDevice(data: DeviceApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeDevice(deviceIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${deviceIds.join(',')}`);
}

export function exportDevice(query: DeviceApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
