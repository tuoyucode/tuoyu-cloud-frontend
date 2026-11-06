/**
 * 角色权限树（菜单树、部门树）的勾选处理。
 *
 * 后端的约定：父子联动时保存“勾选的节点 + 它们的全部上级”；
 * 读取时（roleMenuTreeselect、deptTree）去掉有下级被选中的上级，只返回需要勾选的节点
 */

export interface KeyNode {
  children?: KeyNode[];
  id: string;
}

/** 树中全部节点的 ID */
export function collectTreeKeys(nodes: KeyNode[]): string[] {
  return nodes.flatMap((node) => [
    String(node.id),
    ...collectTreeKeys(node.children ?? []),
  ]);
}

/** 节点 ID → 上级 ID */
function parentMap(nodes: KeyNode[]): Map<string, string> {
  const parents = new Map<string, string>();
  const walk = (list: KeyNode[], parentId?: string) => {
    for (const node of list) {
      const id = String(node.id);
      if (parentId !== undefined) {
        parents.set(id, parentId);
      }
      walk(node.children ?? [], id);
    }
  };
  walk(nodes);
  return parents;
}

/**
 * 父子联动时实际保存的节点：勾选的节点加上它们的全部上级（半选的上级也要保存）。
 * 不在树中的 ID（例如当前用户看不到的菜单）原样保留
 */
export function withAncestors(nodes: KeyNode[], keys: string[]): string[] {
  const parents = parentMap(nodes);
  const result = new Set<string>();
  for (const key of keys) {
    let current: string | undefined = String(key);
    while (current !== undefined && !result.has(current)) {
      result.add(current);
      current = parents.get(current);
    }
  }
  return [...result];
}

/**
 * 切换为父子联动前，去掉有下级被选中的上级，避免联动后自动勾选上级的全部下级
 */
export function withoutSelectedAncestors(
  nodes: KeyNode[],
  keys: string[],
): string[] {
  const parents = parentMap(nodes);
  const selected = new Set(keys.map(String));
  const ancestors = new Set<string>();
  for (const key of selected) {
    let parent = parents.get(key);
    while (parent !== undefined && !ancestors.has(parent)) {
      ancestors.add(parent);
      parent = parents.get(parent);
    }
  }
  return [...selected].filter((key) => !ancestors.has(key));
}

/**
 * 已保存的节点能否用父子联动原样显示：
 * 节点的上级都已保存（父子联动保存时会补全上级），并且去掉有下级被选中的上级后剩下的都是叶子节点
 * （否则联动会把这些上级的全部下级一并勾选）。不能时应改用不联动的方式显示
 */
export function canShowWithLinkage(nodes: KeyNode[], keys: string[]): boolean {
  const saved = new Set(keys.map(String));
  const closed = withAncestors(nodes, [...saved]);
  if (closed.length !== saved.size) {
    return false;
  }
  const leaves = new Set<string>();
  const walk = (list: KeyNode[]) => {
    for (const node of list) {
      if ((node.children ?? []).length === 0) {
        leaves.add(String(node.id));
      }
      walk(node.children ?? []);
    }
  };
  walk(nodes);
  const inTree = new Set(collectTreeKeys(nodes));
  return withoutSelectedAncestors(nodes, [...saved]).every(
    (key) => !inTree.has(key) || leaves.has(key),
  );
}
