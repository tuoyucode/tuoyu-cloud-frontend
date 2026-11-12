<script lang="ts" setup>
import type { TreeNode } from '@tuoyu/shared/api/types';

import { computed, onMounted, ref, watch } from 'vue';

import { getCategoryTree } from '@tuoyu/shared/api/workflow/category';
import { ElButton, ElEmpty, ElInput, ElTree } from 'element-plus';

import { $t } from '#/locales';

/** 左侧的流程分类树：选择后按分类（含下级）筛选 */
const emit = defineEmits<{ change: [category: string | undefined] }>();

/** 选中的分类；为空表示全部分类 */
const category = defineModel<string | undefined>('category');

const loading = ref(false);
/** 分类加载失败（例如工作流服务暂不可用）：错误提示已由请求层弹出，这里显示重试 */
const failed = ref(false);
const keyword = ref('');
const tree = ref<TreeNode<string>[]>([]);
const expandedKeys = ref<string[]>([]);

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

watch(keyword, (value) => {
  expandedKeys.value = value.trim()
    ? collectKeys(visibleTree.value)
    : tree.value.map((node) => node.id);
});

/** 再次点击已选中的分类取消选择 */
function onNodeClick(node: TreeNode<string>) {
  const next = node.id === category.value ? undefined : node.id;
  category.value = next;
  emit('change', next);
}

function onShowAll() {
  category.value = undefined;
  emit('change', undefined);
}

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    tree.value = await getCategoryTree();
    expandedKeys.value = tree.value.map((node) => node.id);
  } catch {
    tree.value = [];
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

defineExpose({ reload: load });
</script>

<template>
  <div class="bg-card flex flex-col gap-2 rounded-md p-3">
    <div class="flex items-center justify-between">
      <span class="font-medium">{{ $t('workflow.common.category') }}</span>
      <ElButton
        :disabled="!category"
        link
        size="small"
        type="primary"
        @click="onShowAll"
      >
        {{ $t('workflow.common.allCategories') }}
      </ElButton>
    </div>
    <ElInput
      v-model="keyword"
      :placeholder="$t('workflow.common.searchCategory')"
      clearable
      size="small"
    />
    <div v-loading="loading" class="min-h-0 flex-1 overflow-auto">
      <ElTree
        v-if="visibleTree.length > 0"
        :current-node-key="category"
        :data="visibleTree"
        :default-expanded-keys="expandedKeys"
        :expand-on-click-node="false"
        :props="{ children: 'children', label: 'label' }"
        highlight-current
        node-key="id"
        @node-click="onNodeClick"
      />
      <ElEmpty
        v-else-if="!loading && failed"
        :description="$t('workflow.common.categoryLoadFailed')"
        :image-size="60"
      >
        <ElButton size="small" @click="load">
          {{ $t('workflow.common.retry') }}
        </ElButton>
      </ElEmpty>
      <ElEmpty v-else-if="!loading" :image-size="60" />
    </div>
  </div>
</template>
