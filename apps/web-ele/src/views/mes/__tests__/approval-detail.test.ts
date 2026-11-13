import { describe, expect, it } from 'vitest';

import { resolveBusinessForm } from '#/router/business-form';

/**
 * 后端 tuoyu-mes/deploy/workflow 下两个流程定义的表单路径（formPath），两边须保持一致
 */
const FORM_PATHS = [
  'mes/defect/approval-detail',
  'mes/material-request/approval-detail',
];

describe('制造执行审批的业务详情', () => {
  it.each(FORM_PATHS)('流程定义的表单路径 %s 指向已有的组件', (formPath) => {
    expect(resolveBusinessForm(formPath)).toBeTruthy();
  });
});
