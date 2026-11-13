<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';
import type { CheckRow } from '@tuoyu/shared/pages/mes/equipment-utils';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addCheckRecord,
  getApplicableCheckItems,
} from '@tuoyu/shared/api/mes/equipment';
import { trimFixedDecimal } from '@tuoyu/shared/pages/mes/decimal';
import {
  abnormalCount,
  limitsText,
  missingMandatory,
  rowResult,
  toCheckRecordForm,
} from '@tuoyu/shared/pages/mes/equipment-utils';
import {
  ElAlert,
  ElEmpty,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

import EquipmentTag from '../common/equipment-tag.vue';
import { deviceOptions } from './data';

/** 新增点检：选择设备后按适用的点检项目逐项填写，数值型按上下限即时显示判定结果 */
const emit = defineEmits<{ success: [] }>();

const devices = ref<{ label: string; value: string }[]>([]);
const deviceId = ref<string>();
const rows = ref<CheckRow[]>([]);
const remark = ref('');
const loadingItems = ref(false);

const abnormal = computed(() => abnormalCount(rows.value));

const columns = computed(() => [
  {
    key: 'itemName',
    title: $t('mes.equipment.checkItem.itemName'),
    width: 180,
  },
  { key: 'standard', title: $t('mes.equipment.checkItem.checkStandard') },
  { key: 'input', title: $t('mes.equipment.checkRecord.result'), width: 220 },
  { key: 'judge', title: '', width: 80 },
  {
    key: 'remark',
    title: $t('mes.equipment.checkRecord.itemRemark'),
    width: 180,
  },
]);

async function loadItems(id?: string) {
  rows.value = [];
  if (!id) {
    return;
  }
  loadingItems.value = true;
  try {
    const items: EquipmentApi.CheckItem[] = await getApplicableCheckItems(id);
    rows.value = items.map((item) => ({ item }));
  } finally {
    loadingItems.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!deviceId.value) {
      ElMessage.warning($t('mes.equipment.checkRecord.selectDeviceFirst'));
      return;
    }
    if (rows.value.length === 0) {
      ElMessage.warning($t('mes.equipment.checkRecord.noItems'));
      return;
    }
    const missing = missingMandatory(rows.value);
    if (missing.length > 0) {
      ElMessage.warning(
        $t('mes.equipment.checkRecord.mandatoryMissing', { name: missing[0] }),
      );
      return;
    }
    drawerApi.lock();
    try {
      await addCheckRecord(
        toCheckRecordForm(deviceId.value, rows.value, remark.value),
      );
      ElMessage.success(
        abnormal.value > 0
          ? $t('mes.equipment.checkRecord.submittedAbnormal')
          : $t('mes.equipment.checkRecord.submitted'),
      );
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
    deviceId.value = undefined;
    rows.value = [];
    remark.value = '';
    try {
      devices.value = await deviceOptions();
    } catch {
      // 失败原因已由请求层提示
      devices.value = [];
    }
  },
});

function rowOf(row: Record<string, any>) {
  return row as CheckRow;
}

/** 实测值保留 6 位小数（与后端一致），失去焦点后去掉末尾多余的 0 */
const measuredFormatter = trimFixedDecimal(6);

/** 清空时 Element Plus 给出 undefined 或 null，统一存为 null */
function onMeasured(row: CheckRow, value?: null | number) {
  row.measuredValue = value ?? null;
}
</script>

<template>
  <Drawer
    :confirm-text="$t('mes.equipment.checkRecord.submit')"
    :title="$t('mes.equipment.checkRecord.createTitle')"
    class="w-full max-w-[1000px]"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label class="mb-1 block">
          <span class="text-destructive mr-1">*</span>
          {{ $t('mes.equipment.common.device') }}
        </label>
        <ElSelect
          v-model="deviceId"
          :placeholder="$t('mes.equipment.common.devicePlaceholder')"
          class="w-full md:w-96!"
          filterable
          @change="(value) => loadItems(value as string | undefined)"
        >
          <ElOption
            v-for="option in devices"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </div>

      <ElAlert
        v-if="abnormal > 0"
        :closable="false"
        :title="
          $t('mes.equipment.checkRecord.abnormalPreview', { count: abnormal })
        "
        show-icon
        type="warning"
      />

      <ElEmpty
        v-if="!deviceId"
        :description="$t('mes.equipment.checkRecord.selectDeviceFirst')"
        :image-size="60"
      />
      <ElTable
        v-else
        v-loading="loadingItems"
        :data="rows"
        :empty-text="$t('mes.equipment.checkRecord.noItems')"
        :row-key="(row: CheckRow) => row.item.checkItemId"
        size="small"
      >
        <ElTableColumn
          v-for="column in columns"
          :key="column.key"
          :label="column.title"
          :min-width="column.width ?? 160"
        >
          <template #default="{ row }">
            <template v-if="column.key === 'itemName'">
              <span
                v-if="rowOf(row).item.mandatory === 'Y'"
                class="text-destructive mr-1"
              >
                *
              </span>
              {{ rowOf(row).item.itemName }}
            </template>
            <template v-else-if="column.key === 'standard'">
              <div>{{ rowOf(row).item.checkStandard }}</div>
              <div class="text-muted-foreground text-xs">
                {{ rowOf(row).item.checkMethod }}
              </div>
            </template>
            <template v-else-if="column.key === 'input'">
              <div
                v-if="rowOf(row).item.resultType === 'numeric'"
                class="flex flex-col gap-1"
              >
                <ElInputNumber
                  :formatter="measuredFormatter"
                  :model-value="rowOf(row).measuredValue ?? undefined"
                  :precision="6"
                  :placeholder="$t('mes.equipment.checkRecord.measuredValue')"
                  class="w-full!"
                  controls-position="right"
                  @update:model-value="(value) => onMeasured(rowOf(row), value)"
                >
                  <template v-if="rowOf(row).item.unit" #suffix>
                    {{ rowOf(row).item.unit }}
                  </template>
                </ElInputNumber>
                <span class="text-muted-foreground text-xs">
                  {{
                    limitsText(
                      rowOf(row).item.lowerLimit,
                      rowOf(row).item.upperLimit,
                      rowOf(row).item.unit,
                    )
                  }}
                </span>
              </div>
              <ElRadioGroup v-else v-model="rowOf(row).itemResult" size="small">
                <ElRadioButton value="ok">
                  {{ $t('mes.equipment.enums.CheckItemResult.ok') }}
                </ElRadioButton>
                <ElRadioButton value="ng">
                  {{ $t('mes.equipment.enums.CheckItemResult.ng') }}
                </ElRadioButton>
              </ElRadioGroup>
            </template>
            <template v-else-if="column.key === 'judge'">
              <EquipmentTag
                v-if="rowResult(rowOf(row))"
                :value="rowResult(rowOf(row))"
                type="CheckItemResult"
              />
              <ElTag v-else type="info">
                {{ $t('mes.equipment.checkRecord.notChecked') }}
              </ElTag>
            </template>
            <template v-else-if="column.key === 'remark'">
              <ElInput v-model="rowOf(row).remark" :maxlength="255" />
            </template>
          </template>
        </ElTableColumn>
      </ElTable>

      <div>
        <label class="mb-1 block">{{ $t('crud.remark') }}</label>
        <ElInput
          v-model="remark"
          :maxlength="500"
          :placeholder="$t('crud.remarkPlaceholder')"
          :rows="2"
          type="textarea"
        />
      </div>
    </div>
  </Drawer>
</template>
