import type { GenApi } from '#/api/tool/gen';

import { describe, expect, it } from 'vitest';

import {
  buildSaveForm,
  columnOptions,
  isDictHtmlType,
  normalizeOptions,
  readOptions,
  toFlag,
  validateOptions,
} from '../edit-utils';

const columns: GenApi.Column[] = [
  {
    columnComment: '编号',
    columnId: '11',
    columnName: 'post_id',
    createTime: '2026-10-01 10:00:00',
    htmlType: 'input',
    javaField: 'postId',
  } as GenApi.Column,
  {
    columnComment: '状态',
    columnId: '12',
    columnName: 'status',
    dictType: 'sys_normal_disable',
    htmlType: 'switch',
    javaField: 'status',
  },
  {
    columnComment: '备注',
    columnId: '13',
    columnName: 'remark',
    dictType: 'sys_normal_disable',
    htmlType: 'textarea',
    javaField: 'remark',
  },
];

describe('代码生成：读取生成选项', () => {
  it('详情中的 treeAncestorsField 读为 treeAncestors，导出默认开启', () => {
    const options = readOptions({
      parentMenuId: '1761400000000000003',
      tableId: '1',
      tableName: 'sys_dept',
      treeAncestorsField: 'ancestors',
      treeCode: 'dept_id',
    });
    expect(options.treeAncestors).toBe('ancestors');
    expect(options.treeCode).toBe('dept_id');
    expect(options.enableExport).toBe(true);
    expect(options.enableStatus).toBe(false);
    expect(options.uniqueFields).toEqual([]);
    expect(typeof options.parentMenuId).toBe('string');
  });

  it('没有上级菜单时为 undefined', () => {
    expect(readOptions({ tableId: '1', tableName: 't' }).parentMenuId).toBe(
      undefined,
    );
  });
});

describe('代码生成：整理生成选项', () => {
  it('单表不提交树表字段，关闭的功能不提交字段，空值不提交', () => {
    expect(
      normalizeOptions(
        {
          enableExport: true,
          enableSort: false,
          enableStatus: false,
          enableUnique: false,
          parentMenuId: '',
          sortField: 'post_sort',
          statusField: 'status',
          treeCode: 'id',
          uniqueFields: ['post_code'],
        },
        'crud',
      ),
    ).toEqual({
      enableExport: true,
      enableSort: false,
      enableStatus: false,
      enableUnique: false,
      uniqueFields: [],
    });
  });

  it('树表保留树字段，开启的功能保留字段', () => {
    expect(
      normalizeOptions(
        {
          enableStatus: true,
          enableUnique: true,
          statusField: 'status',
          treeCode: 'dept_id',
          treeName: 'dept_name',
          treeParentCode: 'parent_id',
          uniqueFields: ['dept_name', 'parent_id'],
        },
        'tree',
      ),
    ).toEqual({
      enableStatus: true,
      enableUnique: true,
      statusField: 'status',
      treeCode: 'dept_id',
      treeName: 'dept_name',
      treeParentCode: 'parent_id',
      uniqueFields: ['dept_name', 'parent_id'],
    });
  });
});

describe('代码生成：检查生成选项', () => {
  it('树表必须有编码、父编码与名称字段', () => {
    expect(validateOptions({}, 'tree')).toBe('tool.gen.treeCodeRequired');
    expect(validateOptions({ treeCode: 'id' }, 'tree')).toBe(
      'tool.gen.treeParentCodeRequired',
    );
    expect(
      validateOptions({ treeCode: 'id', treeParentCode: 'pid' }, 'tree'),
    ).toBe('tool.gen.treeNameRequired');
    expect(
      validateOptions(
        { treeCode: 'id', treeName: 'name', treeParentCode: 'pid' },
        'tree',
      ),
    ).toBeUndefined();
  });

  it('开启的功能必须选择字段', () => {
    expect(validateOptions({ enableStatus: true }, 'crud')).toBe(
      'tool.gen.statusFieldRequired',
    );
    expect(validateOptions({ enableSort: true }, 'crud')).toBe(
      'tool.gen.sortFieldRequired',
    );
    expect(
      validateOptions({ enableUnique: true, uniqueFields: [] }, 'crud'),
    ).toBe('tool.gen.uniqueFieldsRequired');
    expect(validateOptions({}, 'crud')).toBeUndefined();
  });
});

describe('代码生成：组装保存参数', () => {
  const info: GenApi.Table = {
    businessName: 'post',
    className: 'SysPost',
    columns,
    createTime: '2026-10-01 10:00:00',
    enableExport: true,
    options: '{"enableExport":true}',
    tableId: '1',
    tableName: 'sys_post',
    tplCategory: 'crud',
    treeAncestorsField: 'ancestors',
    updateTime: '2026-10-02 10:00:00',
  };

  it('不提交审计字段与由 options 拆出的字段，选项放在 params 中', () => {
    const form = buildSaveForm(info, columns, { enableExport: false });
    expect(form).not.toHaveProperty('createTime');
    expect(form).not.toHaveProperty('updateTime');
    expect(form).not.toHaveProperty('options');
    expect(form).not.toHaveProperty('enableExport');
    expect(form).not.toHaveProperty('treeAncestorsField');
    expect(form.tableId).toBe('1');
    expect(form.className).toBe('SysPost');
    expect(form.params).toEqual({ enableExport: false, uniqueFields: [] });
  });

  it('字段不提交审计字段；不能选字典的显示类型清空字典', () => {
    const form = buildSaveForm(info, columns, {});
    expect(form.columns[0]).not.toHaveProperty('createTime');
    expect(form.columns[1]?.dictType).toBe('sys_normal_disable');
    expect(form.columns[2]?.dictType).toBe('');
    // 不修改传入的字段
    expect(columns[2]?.dictType).toBe('sys_normal_disable');
  });
});

describe('代码生成：字段工具', () => {
  it('只有下拉框、单选框、复选框、开关可以选择字典', () => {
    expect(isDictHtmlType('select')).toBe(true);
    expect(isDictHtmlType('switch')).toBe(true);
    expect(isDictHtmlType('input')).toBe(false);
    expect(isDictHtmlType(undefined)).toBe(false);
  });

  it('是否标记', () => {
    expect(toFlag(true)).toBe('1');
    expect(toFlag(false)).toBe('0');
  });

  it('字段下拉选项显示列名与注释', () => {
    expect(columnOptions(columns.slice(0, 1))).toEqual([
      { label: 'post_id：编号', value: 'post_id' },
    ]);
    expect(
      columnOptions([{ columnId: '1', columnName: 'a', javaField: 'a' }]),
    ).toEqual([{ label: 'a', value: 'a' }]);
  });
});
