<script lang="ts" setup>
import type { CodeRuleApi } from '#/api/mes/codeRule';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { addCodeRule, getCodeRule, updateCodeRule } from '#/api/mes/codeRule';
import { $t } from '#/locales';

import { exampleCode, loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的规则 ID；新增时为空 */
const ruleId = ref<string>();

/** 按当前填写的值生成的示例编号 */
const example = ref('');

const [Form, formApi] = useVbenForm({
  handleValuesChange(values) {
    example.value = exampleCode(values);
  },
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
      const values = (await formApi.getValues()) as CodeRuleApi.Form;
      const data = { ...values, datePattern: values.datePattern ?? '' };
      await (ruleId.value
        ? updateCodeRule({ ...data, ruleId: ruleId.value })
        : addCodeRule(data));
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
    const data = drawerApi.getData() as undefined | { ruleId?: string };
    ruleId.value = data?.ruleId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
        // 流水号按规则编码保存，创建后不能修改
        {
          componentProps: { disabled: Boolean(ruleId.value) },
          fieldName: 'ruleCode',
        },
      ]);
      if (ruleId.value) {
        const rule = await getCodeRule(ruleId.value);
        await formApi.setValues({
          ...rule,
          datePattern: rule.datePattern ?? '',
        });
      }
      example.value = exampleCode(await formApi.getValues());
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  ruleId.value ? $t('mes.codeRule.edit') : $t('mes.codeRule.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[560px]"
  >
    <Form />
    <div class="bg-muted mt-2 rounded-md px-3 py-2 text-sm">
      <span class="text-muted-foreground">{{
        $t('mes.codeRule.example')
      }}</span>
      <span class="ml-2 font-mono">{{ example }}</span>
    </div>
  </Drawer>
</template>
