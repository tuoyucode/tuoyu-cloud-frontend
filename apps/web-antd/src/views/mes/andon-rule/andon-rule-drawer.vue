<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addAndonRule,
  getAndonRule,
  updateAndonRule,
} from '@tuoyu/shared/api/mes/andonRule';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import {
  loadFormOptions,
  toFormValues,
  toRuleForm,
  useFormSchema,
} from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的规则 ID；新增时为空 */
const andonRuleId = ref<string>();

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
    const values = await formApi.getValues();
    if (
      (values.responseMinutes === undefined ||
        values.responseMinutes === null) &&
      (values.resolveMinutes === undefined || values.resolveMinutes === null)
    ) {
      message.warning($t('mes.andonRule.limitRequired'));
      return;
    }
    drawerApi.lock();
    try {
      const data = toRuleForm(values);
      await (andonRuleId.value
        ? updateAndonRule({ ...data, andonRuleId: andonRuleId.value })
        : addAndonRule(data));
      message.success($t('crud.saved'));
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
    const data = drawerApi.getData() as undefined | { andonRuleId?: string };
    andonRuleId.value = data?.andonRuleId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (andonRuleId.value) {
        await formApi.setValues(
          toFormValues(await getAndonRule(andonRuleId.value)),
        );
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  andonRuleId.value ? $t('mes.andonRule.edit') : $t('mes.andonRule.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('mes.andonRule.formHint') }}
    </p>
    <Form />
  </Drawer>
</template>
