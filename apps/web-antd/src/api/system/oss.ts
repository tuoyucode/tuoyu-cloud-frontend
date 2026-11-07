import type { PageQuery, PageResult } from '#/api/types';

import { downloadFileFromBlobPart } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace OssApi {
  /** 文件（SysOssVo） */
  export interface File {
    createBy?: string;
    /** 上传人名称 */
    createByName?: string;
    createTime?: string;
    /** 扩展信息（SysOssExt 的 JSON 字符串，如文件大小、类型） */
    ext1?: string;
    /** 存储中的对象名 */
    fileName: string;
    /** 后缀，例如 .png */
    fileSuffix: string;
    originalName: string;
    ossId: string;
    /** 所用存储配置的 configKey */
    service: string;
    /** 访问地址；私有桶为临时地址（120 秒内有效） */
    url: string;
  }

  /** 文件查询条件（SysOssBo） */
  export interface FileQuery extends PageQuery {
    /** 上传时间范围：params[beginCreateTime]、params[endCreateTime] */
    'params[beginCreateTime]'?: string;
    'params[endCreateTime]'?: string;
    fileName?: string;
    fileSuffix?: string;
    originalName?: string;
    service?: string;
  }

  /** 上传结果（SysOssUploadVo） */
  export interface UploadResult {
    fileName: string;
    ossId: string;
    url: string;
  }

  /** 存储配置（SysOssConfigVo） */
  export interface Config {
    /** 0 私有，1 公共读写，2 公共读 */
    accessPolicy: string;
    bucketName: string;
    /** 配置标识，例如 minio、aliyun */
    configKey: string;
    domainUrl?: string;
    endpoint: string;
    ext1?: string;
    /** Y 是，N 否 */
    isHttps: string;
    ossConfigId: string;
    prefix?: string;
    region?: string;
    remark?: string;
    /** 是否为当前使用的配置：Y 是，N 否 */
    status: string;
  }

  /** 存储配置的详细信息：接口不返回密钥，只返回是否已设置 */
  export interface ConfigDetail extends Config {
    /** 是否已设置密钥 ID */
    accessKeySet?: boolean;
    /** 是否已设置密钥 */
    secretKeySet?: boolean;
  }

  /** 存储配置查询条件（SysOssConfigBo） */
  export interface ConfigQuery extends PageQuery {
    bucketName?: string;
    configKey?: string;
    status?: string;
  }

  /** 新增、修改存储配置的参数（SysOssConfigBo）；修改时密钥留空表示不修改 */
  export type ConfigForm = Omit<Config, 'ossConfigId' | 'status'> & {
    accessKey?: string;
    ossConfigId?: string;
    secretKey?: string;
    status?: string;
  };
}

/** 经网关转发到 tuoyu-resource */
const BASE = '/resource/oss';
const CONFIG_BASE = `${BASE}/config`;

/** 控制文件列表是否预览图片的系统参数（参数设置中可修改） */
const PREVIEW_CONFIG_KEY = 'sys.oss.previewListResource';

export function listOss(query: OssApi.FileQuery) {
  return requestClient.get<PageResult<OssApi.File>>(`${BASE}/list`, {
    params: query,
  });
}

/**
 * 上传文件。超过上传上限时后端返回 413，由请求层提示后端给出的原因
 *
 * @param onProgress 上传进度，0 ~ 100
 */
export function uploadOss(
  file: Blob | File,
  onProgress?: (percent: number) => void,
) {
  return requestClient.upload<OssApi.UploadResult>(
    `${BASE}/upload`,
    { file },
    {
      onUploadProgress(event) {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
      // 大文件上传时间较长，不使用默认的超时时间
      timeout: 0,
    },
  );
}

/**
 * 下载文件并按原文件名保存。后端出错时由请求层提示
 */
export async function downloadOss(ossId: string, fileName: string) {
  const blob = await requestClient.download<Blob>(`${BASE}/download/${ossId}`, {
    timeout: 0,
  });
  downloadFileFromBlobPart({ fileName, source: blob });
}

export function removeOss(ossIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${ossIds.join(',')}`);
}

/** 文件列表是否预览图片（系统参数 sys.oss.previewListResource，默认预览） */
export async function getOssPreviewEnabled(): Promise<boolean> {
  try {
    const value = await requestClient.get<string>(
      `/system/config/configKey/${PREVIEW_CONFIG_KEY}`,
    );
    return value !== 'false';
  } catch {
    return true;
  }
}

export function listOssConfig(query: OssApi.ConfigQuery) {
  return requestClient.get<PageResult<OssApi.Config>>(`${CONFIG_BASE}/list`, {
    params: query,
  });
}

export function getOssConfig(ossConfigId: string) {
  return requestClient.get<OssApi.ConfigDetail>(
    `${CONFIG_BASE}/${ossConfigId}`,
  );
}

export function addOssConfig(data: OssApi.ConfigForm) {
  return requestClient.post<null>(CONFIG_BASE, data);
}

export function updateOssConfig(data: OssApi.ConfigForm) {
  return requestClient.put<null>(CONFIG_BASE, data);
}

export function removeOssConfig(ossConfigIds: string[]) {
  return requestClient.delete<null>(`${CONFIG_BASE}/${ossConfigIds.join(',')}`);
}

/** 设为当前使用的配置（其他配置自动取消） */
export function enableOssConfig(
  config: Pick<OssApi.Config, 'configKey' | 'ossConfigId'>,
) {
  return requestClient.put<null>(`${CONFIG_BASE}/changeStatus`, {
    configKey: config.configKey,
    ossConfigId: config.ossConfigId,
    status: 'Y',
  });
}
