// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * 共享包供不同 UI 组件库的应用共用：不能引用任何 UI 组件库，也不能引用应用内的 `#/` 别名。
 * 需要界面配合的地方由应用注入（例如请求层的 setupRequestHandlers）
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

const FORBIDDEN = [
  /^#\//,
  /^ant-design-vue(\/|$)/,
  /^@ant-design\//,
  /^element-plus(\/|$)/,
  /^@element-plus\//,
  /^naive-ui(\/|$)/,
  /^tdesign-vue-next(\/|$)/,
  /^@vben\/common-ui(\/|$)/,
  /^@vben\/layouts(\/|$)/,
  /^@vben\/plugins(\/|$)/,
];

const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.(?:ts|vue)$/.test(entry.name) ? [path] : [];
  });
}

describe('共享包与 UI 组件库无关', () => {
  it('源码不引用 UI 组件库与应用别名', () => {
    const violations = sourceFiles(SRC).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
        .map((match) => match[2] ?? '')
        .filter((spec) => FORBIDDEN.some((pattern) => pattern.test(spec)))
        .map((spec) => `${relative(SRC, file)}: ${spec}`),
    );
    expect(violations).toEqual([]);
  });

  it('能找到源码文件（防止目录变化后检查失效）', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(30);
  });
});
