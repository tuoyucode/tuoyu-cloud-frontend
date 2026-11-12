<script lang="ts" setup>
import type { TreeNode } from '@tuoyu/shared/api/types';

import { computed, onMounted, ref } from 'vue';

import { getUserDeptTree } from '@tuoyu/shared/api/system/user';
import { collectTreeKeys } from '@tuoyu/shared/pages/system/permission-tree';
import { filterDeptTree } from '@tuoyu/shared/pages/system/user';
import { ElButton, ElEmpty, ElInput, ElTree, vLoading } from 'element-plus';

import { $t } from '#/locales';

const emit = defineEmits<{ change: [deptId: string | undefined] }>();

/** 选中的部门；为空表示全部部门 */
const deptId = defineModel<string | undefined>('deptId');

const loading = ref(false);
const keyword = ref('');
const tree = ref<TreeNode<string>[]>([]);

const filterText = computed(() => keyword.value.trim());

const visibleTree = computed(() =>
  filterText.value ? filterDeptTree(tree.value, filterText.value) : tree.value,
);

/** 筛选时展开全部结果，否则只展开第一层 */
const expandedKeys = computed(() =>
  filterText.value
    ? collectTreeKeys(visibleTree.value)
    : tree.value.map((node) => node.id),
);

/** 再次点击已选中的部门取消选择 */
function onNodeClick(node: TreeNode<string>) {
  const next = node.id === deptId.value ? undefined : node.id;
  deptId.value = next;
  emit('change', next);
}

function onShowAll() {
  deptId.value = undefined;
  emit('change', undefined);
}

async function load() {
  loading.value = true;
  try {
    tree.value = await getUserDeptTree();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="bg-card flex h-full flex-col gap-2 rounded-md p-3">
    <ElInput
      v-model="keyword"
      :placeholder="$t('system.user.searchDept')"
      clearable
    />
    <ElButton
      :type="deptId ? 'default' : 'primary'"
      class="!justify-start !px-1"
      link
      @click="onShowAll"
    >
      {{ $t('system.user.allDepts') }}
    </ElButton>
    <div v-loading="loading" class="min-h-0 flex-1 overflow-auto">
      <!-- 展开状态由筛选条件决定：条件变化时重新渲染树 -->
      <ElTree
        v-if="visibleTree.length > 0"
        :key="filterText"
        :current-node-key="deptId"
        :data="visibleTree"
        :default-expanded-keys="expandedKeys"
        :expand-on-click-node="false"
        :props="{ children: 'children', label: 'label' }"
        highlight-current
        node-key="id"
        @node-click="onNodeClick"
      />
      <ElEmpty v-else-if="!loading" :image-size="64" />
    </div>
  </div>
</template>
