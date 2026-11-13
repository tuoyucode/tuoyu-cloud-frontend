<script lang="ts" setup>
import type { UserApi } from '@tuoyu/shared/api/system/user';

import { computed, ref } from 'vue';

import { listUserOptions } from '@tuoyu/shared/api/system/user';
import { ElSelectV2 } from 'element-plus';

import { $t } from '#/locales';

/**
 * 按昵称搜索并选择一个用户（只要求登录的选择用户接口，不含联系方式）。
 * 编辑时用 initialLabel 显示已选用户的昵称，搜索前不必加载全部用户
 */
const props = defineProps<{
  initialLabel?: string;
  modelValue?: null | string;
  placeholder?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value?: string] }>();

/** 每次搜索最多返回的用户数 */
const SEARCH_SIZE = 20;

const users = ref<UserApi.Option[]>([]);
const loading = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;

const options = computed(() => {
  const list = users.value.map((user) => ({
    label: `${user.nickName}（${user.userName}）`,
    value: String(user.userId),
  }));
  const current = props.modelValue ? String(props.modelValue) : undefined;
  if (current && !list.some((item) => item.value === current)) {
    list.unshift({ label: props.initialLabel || current, value: current });
  }
  return list;
});

async function search(keyword: string) {
  const seq = ++searchSeq;
  loading.value = true;
  try {
    const page = await listUserOptions({
      nickName: keyword || undefined,
      page: 1,
      pageSize: SEARCH_SIZE,
    });
    // 只采用最后一次搜索的结果
    if (seq === searchSeq) {
      users.value = page.items;
    }
  } finally {
    if (seq === searchSeq) {
      loading.value = false;
    }
  }
}

function onSearch(keyword: string) {
  clearTimeout(timer);
  timer = setTimeout(() => search(keyword.trim()), 300);
}

function onDropdownVisibleChange(open: boolean) {
  if (open && users.value.length === 0) {
    search('');
  }
}

function onChange(value: unknown) {
  emit('update:modelValue', value ? String(value) : undefined);
}
</script>

<template>
  <ElSelectV2
    :loading="loading"
    :loading-text="$t('mes.team.searching')"
    :model-value="modelValue ?? undefined"
    :options="options"
    :placeholder="placeholder ?? $t('mes.team.searchUser')"
    :remote-method="onSearch"
    class="w-full"
    clearable
    filterable
    remote
    @change="onChange"
    @visible-change="onDropdownVisibleChange"
  />
</template>
