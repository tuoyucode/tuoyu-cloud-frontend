<script lang="ts" setup>
import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import { computed, ref, watch } from 'vue';

import { getDefectForApproval } from '@tuoyu/shared/api/mes/defect';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ElAlert, ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { $t } from '#/locales';
import EnumTag from '#/views/mes/_shared/enum-tag.vue';

/**
 * 流程办理抽屉中的“业务详情”（不良处置评审流程的表单路径 mes/defect/approval-detail）：
 * 不良的来源、工单、数量与等级，以及申请的处置方式与说明。
 * 流程参与人可以查看，不需要不良记录的查询权限，由后端按流程参与关系校验
 */
const props = defineProps<{ businessId: string; instanceId?: string }>();

const detail = ref<DefectApi.Defect>();
const error = ref('');
const loading = ref(false);

/** 描述列表的列数：中等宽度以上 3 列，窄屏 1 列 */
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMd = breakpoints.greaterOrEqual('md');
const columns = computed(() => (isMd.value ? 3 : 1));

function formatQty(value?: number) {
  return value === null || value === undefined ? '' : String(Number(value));
}

watch(
  () => props.businessId,
  async (businessId) => {
    detail.value = undefined;
    error.value = '';
    if (!businessId) {
      return;
    }
    loading.value = true;
    try {
      detail.value = await getDefectForApproval(businessId);
    } catch (error_) {
      error.value = errorMessageOf(
        error_,
        $t('mes.defect.approvalDetailFailed'),
      );
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-loading="loading">
    <ElAlert
      v-if="error"
      :closable="false"
      :title="error"
      show-icon
      type="warning"
    />
    <ElDescriptions v-else-if="detail" :column="columns" border size="small">
      <ElDescriptionsItem :label="$t('mes.defect.defectCode')">
        {{ detail.defectCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.sourceType')">
        <EnumTag :value="detail.sourceType" type="DefectSource" />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.sourceCode')">
        {{ detail.sourceCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.workorderCode')">
        {{ detail.workorderCode }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.operation')">
        {{ detail.operationName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.product')">
        {{ detail.materialName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.defectQty')">
        <span class="tabular-nums">{{ formatQty(detail.defectQty) }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.defectLevel')">
        <EnumTag :value="detail.defectLevel" type="DefectLevel" />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.handleStatus')">
        <EnumTag :value="detail.handleStatus" type="DefectHandleStatus" />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.description')" :span="columns">
        {{ detail.description }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.handleMethod')">
        <EnumTag
          v-if="detail.handleMethod"
          :value="detail.handleMethod"
          type="DefectHandleMethod"
        />
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.handleUser')">
        {{ detail.handleUserName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('mes.defect.createTime')">
        {{ detail.createTime }}
      </ElDescriptionsItem>
      <ElDescriptionsItem
        :label="$t('mes.defect.handleRemark')"
        :span="columns"
      >
        {{ detail.handleRemark }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('crud.remark')" :span="columns">
        {{ detail.remark }}
      </ElDescriptionsItem>
    </ElDescriptions>
    <div v-else class="min-h-24"></div>
  </div>
</template>
