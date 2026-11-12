import type { CategoryApi } from '../../api/workflow/category';

import { $t } from '@vben/locales';

import { listToTree } from '../../utils/tree';

/** 顶级分类的上级 ID */
export const ROOT_PARENT_ID = 0;

/**
 * 上级分类的可选树：最外层加一个“顶级分类”；编辑时排除本分类及其下级
 *
 * @param list 扁平的分类列表
 * @param excludeId 编辑的分类 ID
 */
export function buildParentTree(
  list: CategoryApi.Category[],
  excludeId?: string,
) {
  const excluded = new Set<string>();
  if (excludeId) {
    excluded.add(excludeId);
    // 祖级列表中含有本分类的都是下级
    for (const item of list) {
      const ancestors = (item.ancestors ?? '').split(',');
      if (ancestors.includes(excludeId)) {
        excluded.add(String(item.categoryId));
      }
    }
  }
  const nodes = list.filter((item) => !excluded.has(String(item.categoryId)));
  return [
    {
      categoryId: ROOT_PARENT_ID,
      categoryName: $t('workflow.category.root'),
      children: listToTree(nodes, 'categoryId', 'parentId'),
    },
  ];
}
