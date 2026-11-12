<script lang="ts" setup>
import type { KeyNode } from '@tuoyu/shared/pages/system/permission-tree';
import type { TreeProps } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';

import {
  collectTreeKeys,
  withAncestors,
  withoutSelectedAncestors,
} from '@tuoyu/shared/pages/system/permission-tree';
import { Button, Checkbox, Empty, Tooltip, Tree } from 'ant-design-vue';

import { $t } from '#/locales';

type TreeNode = KeyNode & { children?: TreeNode[]; label: string };

const props = defineProps<{
  disabled?: boolean;
  treeData: TreeNode[];
}>();

const emit = defineEmits<{ change: [] }>();

/** 勾选的节点（父子联动时与界面一致，不含半选的上级） */
const checkedKeys = defineModel<string[]>('checkedKeys', { required: true });

/** 父子联动（后端的 menuCheckStrictly / deptCheckStrictly） */
const linkage = defineModel<boolean>('linkage', { required: true });

const expandedKeys = ref<string[]>([]);

const allKeys = computed(() => collectTreeKeys(props.treeData));
const allKeySet = computed(() => new Set(allKeys.value));

/** 树中没有的节点（例如当前用户看不到的菜单），保存时原样保留 */
const hiddenKeys = computed(() =>
  checkedKeys.value.filter((key) => !allKeySet.value.has(key)),
);

/** 树中实际会保存的节点数（父子联动时含半选的上级） */
const visibleCheckedCount = computed(
  () => getSavedKeys().filter((key) => allKeySet.value.has(key)).length,
);

const allExpanded = computed(
  () =>
    allKeys.value.length > 0 &&
    expandedKeys.value.length >= allKeys.value.length,
);

const allChecked = computed(
  () =>
    allKeys.value.length > 0 &&
    visibleCheckedCount.value >= allKeys.value.length,
);

// 树数据变化时默认展开第一层
watch(
  () => props.treeData,
  (nodes) => {
    expandedKeys.value = nodes.map((node) => String(node.id));
  },
  { immediate: true },
);

function setChecked(keys: string[]) {
  checkedKeys.value = keys;
  emit('change');
}

const onCheck: TreeProps['onCheck'] = (keys) => {
  const checked = Array.isArray(keys) ? keys : keys.checked;
  setChecked([...checked.map(String), ...hiddenKeys.value]);
};

function toggleExpand() {
  expandedKeys.value = allExpanded.value ? [] : [...allKeys.value];
}

function toggleCheckAll() {
  setChecked(
    allChecked.value
      ? [...hiddenKeys.value]
      : [...allKeys.value, ...hiddenKeys.value],
  );
}

/** 切换联动方式时换算勾选的节点，尽量保持切换前后勾选的内容一致 */
function onLinkageChange(value: boolean) {
  checkedKeys.value = value
    ? withoutSelectedAncestors(props.treeData, checkedKeys.value)
    : withAncestors(props.treeData, checkedKeys.value);
  linkage.value = value;
  emit('change');
}

/** 实际保存的节点：父子联动时包含半选的上级 */
function getSavedKeys(): string[] {
  return linkage.value
    ? withAncestors(props.treeData, checkedKeys.value)
    : [...new Set(checkedKeys.value)];
}

defineExpose({ getSavedKeys });
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        :disabled="treeData.length === 0"
        size="small"
        @click="toggleExpand"
      >
        {{ allExpanded ? $t('crud.collapseAll') : $t('crud.expandAll') }}
      </Button>
      <Button
        :disabled="disabled || treeData.length === 0"
        size="small"
        @click="toggleCheckAll"
      >
        {{
          allChecked ? $t('system.role.uncheckAll') : $t('system.role.checkAll')
        }}
      </Button>
      <Tooltip :title="$t('system.role.linkageHelp')">
        <Checkbox
          :checked="linkage"
          :disabled="disabled"
          @change="(event) => onLinkageChange(event.target.checked as boolean)"
        >
          {{ $t('system.role.linkage') }}
        </Checkbox>
      </Tooltip>
      <span class="text-muted-foreground ml-auto text-xs">
        {{ $t('system.role.checkedCount', { count: visibleCheckedCount }) }}
      </span>
    </div>
    <div class="border-border max-h-[50vh] overflow-auto rounded-md border p-2">
      <Tree
        v-if="treeData.length > 0"
        v-model:expanded-keys="expandedKeys"
        :check-strictly="!linkage"
        :checked-keys="checkedKeys"
        :disabled="disabled"
        :field-names="{ children: 'children', key: 'id', title: 'label' }"
        :selectable="false"
        :tree-data="treeData as unknown as TreeProps['treeData']"
        block-node
        checkable
        @check="onCheck"
      />
      <Empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
  </div>
</template>
