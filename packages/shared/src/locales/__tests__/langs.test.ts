// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** 两个 UI 版本共用这些文案，中英文必须同步提供 */
const LANGS_DIR = fileURLToPath(new URL('../langs', import.meta.url));
const BASE_LANGUAGE = 'zh-CN';
const OTHER_LANGUAGES = ['en-US'];

function listJsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return listJsonFiles(path);
    }
    return name.endsWith('.json') ? [path] : [];
  });
}

/** 文案的键路径，例如 switcher.label */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** 一种语言的全部文案：相对路径（如 system/post.json）→ 内容 */
function readLanguage(lang: string) {
  const root = join(LANGS_DIR, lang);
  return new Map(
    listJsonFiles(root).map((file) => [
      relative(root, file).replaceAll('\\', '/'),
      JSON.parse(readFileSync(file, 'utf8')) as unknown,
    ]),
  );
}

describe('共享文案', () => {
  const base = readLanguage(BASE_LANGUAGE);

  it.each(OTHER_LANGUAGES)('%s 与中文的文件一一对应', (lang) => {
    expect([...readLanguage(lang).keys()].toSorted()).toEqual(
      [...base.keys()].toSorted(),
    );
  });

  it.each(OTHER_LANGUAGES)('%s 中每个文件的键与中文相同', (lang) => {
    const other = readLanguage(lang);
    for (const [file, messages] of base) {
      expect(keyPaths(other.get(file)).toSorted(), `${lang}/${file}`).toEqual(
        keyPaths(messages).toSorted(),
      );
    }
  });
});
