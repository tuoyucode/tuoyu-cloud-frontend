// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * 前端镜像中的 Nginx（scripts/deploy/nginx.conf）托管生产包并把接口请求转发给网关。
 * 生产包请求的前缀来自 .env.production 的 VITE_GLOB_API_URL，两边不一致时页面能打开、接口全部 404。
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const nginx = readFileSync(`${ROOT}scripts/deploy/nginx.conf`, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, ''))
  .join('\n');

/** 消息推送（SSE）的心跳间隔，后端默认 60 秒 */
const SSE_HEARTBEAT_SECONDS = 60;

/** 后端默认的整个上传请求上限（MB） */
const UPLOAD_REQUEST_MB = 100;

function apiPrefix(): string {
  const env = readFileSync(`${ROOT}apps/web-antd/.env.production`, 'utf8');
  const match = /^VITE_GLOB_API_URL\s*=\s*(\S+)\s*$/m.exec(env);
  if (!match?.[1]) {
    throw new Error('.env.production 中没有 VITE_GLOB_API_URL');
  }
  return match[1].replace(/\/+$/, '');
}

/** location 块的内容（左花括号之后到配对的右花括号之前），没有时返回 undefined */
function location(path: string): string | undefined {
  const start = nginx.indexOf(`location ${path} {`);
  if (start === -1) {
    return undefined;
  }
  let depth = 0;
  for (let i = nginx.indexOf('{', start); i < nginx.length; i++) {
    if (nginx[i] === '{') {
      depth++;
    } else if (nginx[i] === '}' && --depth === 0) {
      return nginx.slice(nginx.indexOf('{', start) + 1, i);
    }
  }
  throw new Error('nginx.conf 的花括号不配对');
}

describe('前端镜像的 Nginx 把接口请求转发给网关', () => {
  it('生产包的接口前缀有对应的转发，并去掉前缀', () => {
    const prefix = apiPrefix();
    const block = location(`${prefix}/`);
    expect(block, `nginx.conf 中没有 location ${prefix}/`).toBeDefined();
    expect(block).toMatch(/proxy_pass\s+\$gateway\$gateway_path;/);
    // 去掉前缀的映射与 location 使用同一个前缀
    const map = new RegExp(
      String.raw`~\^${prefix}\(\?<rest>/\.\*\)\$\s+\$rest;`,
    );
    expect(nginx).toMatch(map);
  });

  it('接口转发支持消息推送的长连接', () => {
    const block = location(`${apiPrefix()}/`) ?? '';
    expect(block).toMatch(/proxy_http_version\s+1\.1;/);
    expect(block).toMatch(/proxy_buffering\s+off;/);
    const timeout = /proxy_read_timeout\s+(\d+)s?;/.exec(block);
    expect(timeout, '需要设置 proxy_read_timeout').not.toBeNull();
    expect(Number(timeout?.[1])).toBeGreaterThan(SSE_HEARTBEAT_SECONDS);
  });

  it('请求体上限不小于后端默认的上传上限', () => {
    const size = /client_max_body_size\s+(\d+)([mg]);/i.exec(nginx);
    expect(
      size,
      '需要设置 client_max_body_size（Nginx 默认 1MB）',
    ).not.toBeNull();
    const megabytes =
      Number(size?.[1]) * (size?.[2]?.toLowerCase() === 'g' ? 1024 : 1);
    expect(megabytes).toBeGreaterThanOrEqual(UPLOAD_REQUEST_MB);
  });

  it('静态文件不放开跨域', () => {
    expect(nginx).not.toMatch(/Access-Control-Allow-Origin/);
  });
});
