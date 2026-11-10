<script lang="ts" setup>
import type { LabelTemplateApi } from '@tuoyu/shared/api/mes/labelTemplate';

import type { LabelLayout } from './label-layout';

import { computed } from 'vue';

import { QRCode } from 'ant-design-vue';

import { $t } from '#/locales';

import Code128Barcode from './code128-barcode.vue';
import { chunkRows, fieldValue } from './label-layout';

/**
 * 按模板排好的标签：一行标签为一页，尺寸以毫米为单位、样式全部写在元素上，
 * 同一份标记既用于页面中的预览，也原样复制到打印页面中
 */
const props = defineProps<{
  labels: LabelTemplateApi.LabelData[];
  layout: LabelLayout;
  template: Pick<LabelTemplateApi.Template, 'barcodeType' | 'fields'>;
}>();

const rows = computed(() => chunkRows(props.labels, props.layout.columns));

const mm = (value: number) => `${value}mm`;

const pageStyle = computed(() => ({
  boxSizing: 'border-box' as const,
  display: 'flex',
  gap: mm(props.layout.gap),
  height: mm(props.layout.page.height),
  width: mm(props.layout.page.width),
}));

const labelStyle = computed(() => {
  const { label } = props.layout;
  return {
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: (props.layout.barcode.kind === 'qrcode'
      ? 'row'
      : 'column') as 'column' | 'row',
    flexShrink: 0,
    gap: mm(label.padding),
    height: mm(label.height),
    overflow: 'hidden',
    padding: mm(label.padding),
    width: mm(label.width),
  };
});

const barcodeStyle = computed(() => ({
  flexShrink: 0,
  height: mm(props.layout.barcode.height),
  width: mm(props.layout.barcode.width),
}));

const textStyle = computed(() => {
  const { text } = props.layout;
  return {
    fontSize: mm(text.fontSize),
    lineHeight: mm(text.lineHeight),
    maxHeight: mm(text.height),
    minWidth: 0,
    overflow: 'hidden',
  };
});

const lineStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

function fieldName(key: string) {
  const i18nKey = `mes.labelTemplate.fieldNames.${key}`;
  const label = $t(i18nKey);
  return label === i18nKey ? key : label;
}

function lines(label: LabelTemplateApi.LabelData) {
  return props.template.fields.map((key) => ({
    key,
    name: fieldName(key),
    value: fieldValue(key, label as unknown as Record<string, unknown>),
  }));
}
</script>

<template>
  <div>
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      :style="pageStyle"
      class="mes-label-page"
    >
      <div
        v-for="(label, index) in row"
        :key="`${rowIndex}-${index}`"
        :style="labelStyle"
        class="mes-label"
      >
        <div
          :class="{ 'mes-label-qr': layout.barcode.kind === 'qrcode' }"
          :style="barcodeStyle"
        >
          <QRCode
            v-if="layout.barcode.kind === 'qrcode'"
            :bordered="false"
            :size="200"
            :value="label.barcode"
            bg-color="#ffffff"
            color="#000000"
            error-level="M"
            type="svg"
          />
          <Code128Barcode v-else :value="label.barcode" />
        </div>
        <div :style="textStyle">
          <div v-for="line in lines(label)" :key="line.key" :style="lineStyle">
            {{ line.name }}：{{ line.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 二维码组件自带固定像素的外框，按条码区缩放（打印页面中的同名规则见 printCss） */
.mes-label-qr > :deep(div) {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  border: 0 !important;
}

.mes-label-qr :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
