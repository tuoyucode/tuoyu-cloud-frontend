<script lang="ts" setup>
import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addLabelTemplate,
  getLabelTemplate,
  updateLabelTemplate,
} from '@tuoyu/shared/api/mes/labelTemplate';
import { labelLayout } from '@tuoyu/shared/pages/mes/label-layout';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import LabelSheet from '../_shared/label-sheet.vue';
import {
  DEFAULT_FIELDS,
  keepApplicableFields,
  loadFormOptions,
  sampleLabel,
  toTemplateForm,
  useFormSchema,
} from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的模板 ID；新增时为空 */
const labelTemplateId = ref<string>();

/** 按当前填写的值预览的模板 */
const preview = ref<LabelTemplateApi.Form>();

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged.includes('targetType')) {
      // 换了适用对象：去掉不适用的字段，没有剩下的时用该对象的默认字段
      const kept = keepApplicableFields(values.fields, values.targetType);
      const target = values.targetType as LabelTemplateApi.Target;
      const fields = kept.length > 0 ? kept : (DEFAULT_FIELDS[target] ?? []);
      if (fields.join(',') !== (values.fields ?? []).join(',')) {
        formApi.setFieldValue('fields', fields);
        return;
      }
    }
    preview.value = toTemplateForm(values);
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

const previewLayout = computed(() => {
  const spec = preview.value;
  if (
    !spec ||
    !(spec.paperWidth >= 10) ||
    !(spec.paperHeight >= 10) ||
    spec.fields.length === 0
  ) {
    return undefined;
  }
  return labelLayout({ ...spec, columnCount: 1 });
});

const previewLabels = computed(() => [sampleLabel(preview.value?.targetType)]);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const data = toTemplateForm(await formApi.getValues());
      await (labelTemplateId.value
        ? updateLabelTemplate({
            ...data,
            labelTemplateId: labelTemplateId.value,
          })
        : addLabelTemplate(data));
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
    const data = drawerApi.getData() as
      | undefined
      | { labelTemplateId?: string };
    labelTemplateId.value = data?.labelTemplateId;
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        { componentProps: { options: options.status }, fieldName: 'status' },
      ]);
      if (labelTemplateId.value) {
        await formApi.setValues(await getLabelTemplate(labelTemplateId.value));
      }
      preview.value = toTemplateForm(await formApi.getValues());
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  labelTemplateId.value
    ? $t('mes.labelTemplate.edit')
    : $t('mes.labelTemplate.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[680px]"
  >
    <Form />
    <h3 class="mb-2 mt-2 font-medium">{{ $t('mes.labelTemplate.preview') }}</h3>
    <div class="mes-label-preview bg-muted overflow-auto p-3">
      <LabelSheet
        v-if="previewLayout && preview"
        :labels="previewLabels"
        :layout="previewLayout"
        :template="preview"
      />
      <span v-else class="text-muted-foreground text-sm">
        {{ $t('mes.labelTemplate.previewUnavailable') }}
      </span>
    </div>
  </Drawer>
</template>

<style scoped>
.mes-label-preview :deep(.mes-label) {
  color: #000;
  outline: 1px dashed hsl(var(--border));
  background: #fff;
}
</style>
