<script lang="ts" setup>
import type { KeyNode } from '@tuoyu/shared/pages/system/permission-tree';
import type { TreeInstance } from 'element-plus';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import {
  collectTreeKeys,
  withAncestors,
  withoutSelectedAncestors,
} from '@tuoyu/shared/pages/system/permission-tree';
import { ElButton, ElCheckbox, ElEmpty, ElTooltip, ElTree } from 'element-plus';

import { $t } from '#/locales';

type TreeNode = KeyNode & {
  children?: TreeNode[];
  disabled?: boolean;
  label: string;
};

const props = defineProps<{
  disabled?: boolean;
  treeData: TreeNode[];
}>();

const emit = defineEmits<{ change: [] }>();

/** 勾选的节点（父子联动时与界面一致，不含半选的上级） */
const checkedKeys = defineModel<string[]>('checkedKeys', { required: true });

/** 父子联动（后端的 menuCheckStrictly / deptCheckStrictly） */
const linkage = defineModel<boolean>('linkage', { required: true });

const treeRef = ref<TreeInstance>();

/** 展开的节点；树组件不受控，这里随展开、收起事件同步 */
const expandedKeys = ref(new Set<string>());

const firstLevelKeys = computed(() =>
  props.treeData.map((node) => String(node.id)),
);

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
    allKeys.value.length > 0 && expandedKeys.value.size >= allKeys.value.length,
);

const allChecked = computed(
  () =>
    allKeys.value.length > 0 &&
    visibleCheckedCount.value >= allKeys.value.length,
);

/** 整棵树不可操作时所有节点禁用，否则按节点自己的设置 */
const treeProps = {
  children: 'children',
  disabled: (data: { disabled?: boolean }) =>
    Boolean(props.disabled || data.disabled),
  label: 'label',
};

// 树数据变化时默认展开第一层（与树组件的 default-expanded-keys 一致）
watch(
  () => props.treeData,
  () => {
    expandedKeys.value = new Set(firstLevelKeys.value);
  },
  { immediate: true },
);

/** 把勾选状态同步到树组件：勾选的节点、树数据或联动方式变化后都要重新设置 */
async function syncChecked() {
  await nextTick();
  treeRef.value?.setCheckedKeys(checkedKeys.value);
}

watch([checkedKeys, () => props.treeData, linkage], syncChecked, {
  flush: 'post',
});

onMounted(syncChecked);

function setChecked(keys: string[]) {
  checkedKeys.value = keys;
  emit('change');
}

function onCheck() {
  const checked = (treeRef.value?.getCheckedKeys() ?? []).map(String);
  setChecked([...checked, ...hiddenKeys.value]);
}

function onNodeExpand(data: TreeNode) {
  expandedKeys.value.add(String(data.id));
}

function onNodeCollapse(data: TreeNode) {
  expandedKeys.value.delete(String(data.id));
}

function toggleExpand() {
  const expand = !allExpanded.value;
  const nodes = Object.values(treeRef.value?.store.nodesMap ?? {});
  for (const node of nodes) {
    node.expanded = expand;
  }
  expandedKeys.value = new Set(expand ? allKeys.value : []);
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
      <ElButton
        :disabled="treeData.length === 0"
        size="small"
        @click="toggleExpand"
      >
        {{ allExpanded ? $t('crud.collapseAll') : $t('crud.expandAll') }}
      </ElButton>
      <ElButton
        :disabled="disabled || treeData.length === 0"
        class="!ml-0"
        size="small"
        @click="toggleCheckAll"
      >
        {{
          allChecked ? $t('system.role.uncheckAll') : $t('system.role.checkAll')
        }}
      </ElButton>
      <ElTooltip :content="$t('system.role.linkageHelp')" placement="top">
        <ElCheckbox
          :disabled="disabled"
          :model-value="linkage"
          @change="(value) => onLinkageChange(value as boolean)"
        >
          {{ $t('system.role.linkage') }}
        </ElCheckbox>
      </ElTooltip>
      <span class="text-muted-foreground ml-auto text-xs">
        {{ $t('system.role.checkedCount', { count: visibleCheckedCount }) }}
      </span>
    </div>
    <div class="border-border max-h-[50vh] overflow-auto rounded-md border p-2">
      <ElTree
        v-if="treeData.length > 0"
        ref="treeRef"
        :check-strictly="!linkage"
        :data="treeData"
        :default-expanded-keys="firstLevelKeys"
        :expand-on-click-node="false"
        :props="treeProps"
        node-key="id"
        show-checkbox
        @check="onCheck"
        @node-collapse="onNodeCollapse"
        @node-expand="onNodeExpand"
      />
      <ElEmpty v-else :image-size="64" />
    </div>
  </div>
</template>
