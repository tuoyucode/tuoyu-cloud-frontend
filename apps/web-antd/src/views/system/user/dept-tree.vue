<script lang="ts" setup>
import type { TreeNode } from '@tuoyu/shared/api/types';
import type { TreeProps } from 'ant-design-vue';

import { computed, onMounted, ref, watch } from 'vue';

import { getUserDeptTree } from '@tuoyu/shared/api/system/user';
import { collectTreeKeys } from '@tuoyu/shared/pages/system/permission-tree';
import { filterDeptTree } from '@tuoyu/shared/pages/system/user';
import { Button, Empty, Input, Spin, Tree } from 'ant-design-vue';

import { $t } from '#/locales';

const emit = defineEmits<{ change: [deptId: string | undefined] }>();

/** 选中的部门；为空表示全部部门 */
const deptId = defineModel<string | undefined>('deptId');

const loading = ref(false);
const keyword = ref('');
const tree = ref<TreeNode<string>[]>([]);
const expandedKeys = ref<string[]>([]);

const visibleTree = computed(() => {
  const text = keyword.value.trim();
  return text ? filterDeptTree(tree.value, text) : tree.value;
});

const selectedKeys = computed(() => (deptId.value ? [deptId.value] : []));

// 筛选时展开全部结果，清空后恢复为只展开第一层
watch(keyword, (value) => {
  expandedKeys.value = value.trim()
    ? collectTreeKeys(visibleTree.value)
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
