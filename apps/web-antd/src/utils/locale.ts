/**
 * 子目录中的文案按目录嵌套：langs/zh-CN/system/post.json 的键为 system.post.*，
 * 与 langs/zh-CN/system.json 中的 system 合并。每个页面一个文件，代码生成器生成的文案可以直接放入
 */
export function nestNamespaces(messages: Record<string, any>) {
  const result: Record<string, any> = {};
  for (const [namespace, value] of Object.entries(messages)) {
    const path = namespace.split('/');
    let target = result;
    for (const key of path.slice(0, -1)) {
      target = target[key] ??= {};
    }
    const last = path.at(-1) as string;
    target[last] = { ...target[last], ...value };
  }
  return result;
}
