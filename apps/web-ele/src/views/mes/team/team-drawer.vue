<script lang="ts" setup>
import type { TeamApi } from '@tuoyu/shared/api/mes/team';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { addTeam, getTeam, updateTeam } from '@tuoyu/shared/api/mes/team';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的工厂 ID；新增时为空 */
const teamId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = (await formApi.getValues()) as TeamApi.Form;
      await (teamId.value
        ? updateTeam({ ...values, teamId: teamId.value })
        : addTeam(values));
      ElMessage.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData() as undefined | { teamId?: string };
    teamId.value = data?.teamId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (teamId.value) {
        const team = await getTeam(teamId.value);
        formApi.updateSchema([
          {
            componentProps: { initialLabel: team.leaderUserName },
            fieldName: 'leaderUserId',
          },
        ]);
        await formApi.setValues(team);
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  teamId.value ? $t('mes.team.edit') : $t('mes.team.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[560px]"
  >
    <Form />
  </Drawer>
</template>
