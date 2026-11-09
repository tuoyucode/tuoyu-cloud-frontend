/**
 * 把扁平列表转换为树（后端树表接口返回的是扁平列表）
 *
 * @param list 扁平列表
 * @param idField 节点 ID 字段
 * @param parentField 父节点 ID 字段；找不到父节点的记录作为根节点
 */
export function listToTree<T extends Record<string, any>>(
  list: T[],
  idField: keyof T & string,
  parentField: keyof T & string,
): (T & { children?: T[] })[] {
  const nodes = new Map<string, T & { children?: T[] }>();
  for (const item of list) {
    nodes.set(String(item[idField]), { ...item });
  }
  const roots: (T & { children?: T[] })[] = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(String(node[parentField]));
    if (parent && parent !== node) {
      (parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
