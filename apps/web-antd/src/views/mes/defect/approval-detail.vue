<script lang="ts" setup>
import type { DefectApi } from '@tuoyu/shared/api/mes/defect';

import { ref, watch } from 'vue';

import { getDefectForApproval } from '@tuoyu/shared/api/mes/defect';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { Alert, Descriptions, DescriptionsItem, Spin } from 'ant-design-vue';

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
  <Spin :spinning="loading">
    <Alert v-if="error" :message="error" show-icon type="warning" />
    <Descriptions
      v-else-if="detail"
      :column="{ xs: 1, md: 3 }"
      bordered
      size="small"
    >
      <DescriptionsItem :label="$t('mes.defect.defectCode')">
        {{ detail.defectCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.sourceType')">
        <EnumTag :value="detail.sourceType" type="DefectSource" />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.sourceCode')">
        {{ detail.sourceCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.workorderCode')">
        {{ detail.workorderCode }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.operation')">
        {{ detail.operationName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.product')">
        {{ detail.materialName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.defectQty')">
        <span class="tabular-nums">{{ formatQty(detail.defectQty) }}</span>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.defectLevel')">
        <EnumTag :value="detail.defectLevel" type="DefectLevel" />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.handleStatus')">
        <EnumTag :value="detail.handleStatus" type="DefectHandleStatus" />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.description')" :span="3">
        {{ detail.description }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.handleMethod')">
        <EnumTag
          v-if="detail.handleMethod"
          :value="detail.handleMethod"
          type="DefectHandleMethod"
        />
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.handleUser')">
        {{ detail.handleUserName }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.createTime')">
        {{ detail.createTime }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('mes.defect.handleRemark')" :span="3">
        {{ detail.handleRemark }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('crud.remark')" :span="3">
        {{ detail.remark }}
      </DescriptionsItem>
    </Descriptions>
    <div v-else class="min-h-24"></div>
  </Spin>
</template>
