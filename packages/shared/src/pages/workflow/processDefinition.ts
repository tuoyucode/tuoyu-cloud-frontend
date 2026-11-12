import type { DefinitionApi } from '../../api/workflow/definition';

/** 流程定义列表的路由 */
export const DEFINITION_PAGE_PATH = '/workflow/processDefinition';

/** 流程设计的路由（菜单“流程设计”，隐藏） */
export const DESIGN_PAGE_PATH = '/workflow/design/index';

/** 发布状态 */
export const PublishStatus = {
  EXPIRED: 9,
  PUBLISHED: 1,
  UNPUBLISHED: 0,
} as const;

/** 激活状态：1 激活，0 挂起 */
export const ACTIVE = 1;

/** 列表中显示的发布状态：已发布、未发布 */
export type PublishTab = 'published' | 'unpublished';

/** 设计页面的地址：已发布的流程只读查看 */
export function designPath(
  definition: Pick<DefinitionApi.Definition, 'id' | 'isPublish'>,
) {
  const disabled = definition.isPublish === PublishStatus.PUBLISHED;
  const query = new URLSearchParams({ definitionId: definition.id });
  if (disabled) {
    query.set('disabled', 'true');
  }
  return `${DESIGN_PAGE_PATH}?${query.toString()}`;
}

/** 发布状态的文案键 */
export function publishStatusKey(status?: number) {
  switch (status) {
    case PublishStatus.EXPIRED: {
      return 'workflow.processDefinition.expired';
    }
    case PublishStatus.PUBLISHED: {
      return 'workflow.processDefinition.published';
    }
    default: {
      return 'workflow.processDefinition.unpublished';
    }
  }
}

/** 导出的文件名：流程编码_版本.json */
export function exportFileName(
  definition: Pick<DefinitionApi.Definition, 'flowCode' | 'version'>,
) {
  const version = definition.version ? `_v${definition.version}` : '';
  return `${definition.flowCode}${version}.json`;
}
