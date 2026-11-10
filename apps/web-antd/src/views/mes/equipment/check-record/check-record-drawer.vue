<script lang="ts" setup>
import type { EquipmentApi } from '@tuoyu/shared/api/mes/equipment';

import type { CheckRow } from '../common/utils';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addCheckRecord,
  getApplicableCheckItems,
} from '@tuoyu/shared/api/mes/equipment';
import {
  Alert,
  Empty,
  Input,
  InputNumber,
  message,
  RadioButton,
  RadioGroup,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import { $t } from '#/locales';

import { trimDecimal } from '../../_shared/decimal';
import EquipmentTag from '../common/equipment-tag.vue';
import {
  abnormalCount,
  limitsText,
  missingMandatory,
  rowResult,
  toCheckRecordForm,
} from '../common/utils';
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
    dataIndex: 'itemName',
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
      message.warning($t('mes.equipment.checkRecord.selectDeviceFirst'));
      return;
    }
    if (rows.value.length === 0) {
      message.warning($t('mes.equipment.checkRecord.noItems'));
      return;
    }
    const missing = missingMandatory(rows.value);
    if (missing.length > 0) {
      message.warning(
        $t('mes.equipment.checkRecord.mandatoryMissing', { name: missing[0] }),
      );
      return;
    }
    drawerApi.lock();
    try {
      await addCheckRecord(
        toCheckRecordForm(deviceId.value, rows.value, remark.value),
      );
      message.success(
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
        <Select
          v-model:value="deviceId"
          :options="devices"
          :placeholder="$t('mes.equipment.common.devicePlaceholder')"
          class="w-full md:w-96"
          option-filter-prop="label"
          show-search
          @change="(value) => loadItems(value as string | undefined)"
        />
      </div>

      <Alert
        v-if="abnormal > 0"
        :message="
          $t('mes.equipment.checkRecord.abnormalPreview', { count: abnormal })
        "
        show-icon
        type="warning"
      />

      <Empty
        v-if="!deviceId"
        :description="$t('mes.equipment.checkRecord.selectDeviceFirst')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <Table
        v-else
        :columns="columns"
        :data-source="rows"
        :loading="loadingItems"
        :locale="{ emptyText: $t('mes.equipment.checkRecord.noItems') }"
        :pagination="false"
        :row-key="(row: CheckRow) => row.item.checkItemId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemName'">
            <span
              v-if="(record as CheckRow).item.mandatory === 'Y'"
              class="text-destructive mr-1"
            >
              *
            </span>
            {{ (record as CheckRow).item.itemName }}
          </template>
          <template v-else-if="column.key === 'standard'">
            <div>{{ (record as CheckRow).item.checkStandard }}</div>
            <div class="text-muted-foreground text-xs">
              {{ (record as CheckRow).item.checkMethod }}
            </div>
          </template>
          <template v-else-if="column.key === 'input'">
            <div
              v-if="(record as CheckRow).item.resultType === 'numeric'"
              class="flex flex-col gap-1"
            >
              <InputNumber
                v-model:value="record.measuredValue"
                :addon-after="(record as CheckRow).item.unit || undefined"
                :precision="6"
                :formatter="trimDecimal"
                :placeholder="$t('mes.equipment.checkRecord.measuredValue')"
                class="w-full"
              />
              <span class="text-muted-foreground text-xs">
                {{
                  limitsText(
                    (record as CheckRow).item.lowerLimit,
                    (record as CheckRow).item.upperLimit,
                    (record as CheckRow).item.unit,
                  )
                }}
              </span>
            </div>
            <RadioGroup
              v-else
              v-model:value="record.itemResult"
              button-style="solid"
            >
              <RadioButton value="ok">
                {{ $t('mes.equipment.enums.CheckItemResult.ok') }}
              </RadioButton>
              <RadioButton value="ng">
                {{ $t('mes.equipment.enums.CheckItemResult.ng') }}
              </RadioButton>
            </RadioGroup>
          </template>
          <template v-else-if="column.key === 'judge'">
            <EquipmentTag
              v-if="rowResult(record as CheckRow)"
              :value="rowResult(record as CheckRow)"
              type="CheckItemResult"
            />
            <Tag v-else>{{ $t('mes.equipment.checkRecord.notChecked') }}</Tag>
          </template>
          <template v-else-if="column.key === 'remark'">
            <Input v-model:value="record.remark" :maxlength="255" />
          </template>
        </template>
      </Table>

      <div>
        <label class="mb-1 block">{{ $t('crud.remark') }}</label>
        <Input.TextArea
          v-model:value="remark"
          :maxlength="500"
          :placeholder="$t('crud.remarkPlaceholder')"
          :rows="2"
        />
      </div>
    </div>
  </Drawer>
</template>
