<script lang="ts" setup>
import type { TreeProps } from 'ant-design-vue';

import type { TreeNode } from '#/api/types';

import { computed, onMounted, ref, watch } from 'vue';

import { Button, Empty, Input, Spin, Tree } from 'ant-design-vue';

import { getUserDeptTree } from '#/api/system/user';
import { $t } from '#/locales';

const emit = defineEmits<{ change: [deptId: string | undefined] }>();

/** 选中的部门；为空表示全部部门 */
const deptId = defineModel<string | undefined>('deptId');

const loading = ref(false);
const keyword = ref('');
const tree = ref<TreeNode<string>[]>([]);
const expandedKeys = ref<string[]>([]);

/** 按名称筛选：保留名称匹配的部门及其上级 */
function filterTree(
  nodes: TreeNode<string>[],
  text: string,
): TreeNode<string>[] {
  const result: TreeNode<string>[] = [];
  for (const node of nodes) {
    if (node.label.includes(text)) {
      result.push(node);
      continue;
    }
    const children = filterTree(node.children ?? [], text);
    if (children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}

function collectKeys(nodes: TreeNode<string>[]): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...collectKeys(node.children ?? []),
  ]);
}

const visibleTree = computed(() => {
  const text = keyword.value.trim();
  return text ? filterTree(tree.value, text) : tree.value;
});

const selectedKeys = computed(() => (deptId.value ? [deptId.value] : []));

// 筛选时展开全部结果，清空后恢复为只展开第一层
watch(keyword, (value) => {
  expandedKeys.value = value.trim()
    ? collectKeys(visibleTree.value)
    : tree.value.map((node) => node.id);
});

/** 再次点击已选中的部门取消选择 */
const onSelect: TreeProps['onSelect'] = (keys) => {
  const next = keys.length > 0 ? String(keys[0]) : undefined;
  deptId.value = next;
  emit('change', next);
};

function onShowAll() {
  deptId.value = undefined;
  emit('change', undefined);
}

async function load() {
  loading.value = true;
  try {
    tree.value = await getUserDeptTree();
    // 默认展开第一层
    expandedKeys.value = tree.value.map((node) => node.id);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="bg-card flex h-full flex-col gap-2 rounded-md p-3">
    <Input.Search
      v-model:value="keyword"
      :placeholder="$t('system.user.searchDept')"
      allow-clear
    />
    <Button
      :type="deptId ? 'text' : 'link'"
      class="!px-1 text-left"
      size="small"
      @click="onShowAll"
    >
      {{ $t('system.user.allDepts') }}
    </Button>
    <div class="min-h-0 flex-1 overflow-auto">
      <Spin :spinning="loading">
        <Tree
          v-if="visibleTree.length > 0"
          v-model:expanded-keys="expandedKeys"
          :field-names="{ children: 'children', key: 'id', title: 'label' }"
          :selected-keys="selectedKeys"
          :tree-data="visibleTree as unknown as TreeProps['treeData']"
          block-node
          @select="onSelect"
        />
        <Empty v-else-if="!loading" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </Spin>
    </div>
  </div>
</template>
