<script lang="ts" setup>
import type { MaterialRequestApi } from '@tuoyu/shared/api/mes/materialRequest';

import { ref, watch } from 'vue';

import { getMaterialRequestForApproval } from '@tuoyu/shared/api/mes/materialRequest';
import { errorMessageOf } from '@tuoyu/shared/utils/api-result';
import { ElAlert } from 'element-plus';

import { $t } from '#/locales';

import MaterialRequestDetail from './material-request-detail.vue';

/**
 * 流程办理抽屉中的“业务详情”（补料申请流程的表单路径 mes/material-request/approval-detail）。
 * 流程参与人可以查看，不需要领退料单的查询权限，由后端按流程参与关系校验
 */
const props = defineProps<{ businessId: string; instanceId?: string }>();

const detail = ref<MaterialRequestApi.Request>();
const error = ref('');
const loading = ref(false);

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
      detail.value = await getMaterialRequestForApproval(businessId);
    } catch (error_) {
      error.value = errorMessageOf(
        error_,
        $t('mes.materialRequest.approvalDetailFailed'),
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
    <MaterialRequestDetail v-else-if="detail" :detail="detail" />
    <div v-else class="min-h-24"></div>
  </div>
</template>
