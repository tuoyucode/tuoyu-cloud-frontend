<script lang="ts" setup>
import type { TenantApi } from '@tuoyu/shared/api/system/tenant';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  addTenant,
  getTenant,
  isDefaultTenant,
  updateTenant,
} from '@tuoyu/shared/api/system/tenant';
import { ApiCryptoUnavailableError } from '@tuoyu/shared/utils/api-crypto';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { loadFormOptions, useFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();

/** 编辑时的租户编码；新增时为空 */
const tenantId = ref<string>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
});

async function save() {
  const values = (await formApi.getValues()) as TenantApi.CreateForm;
  const data: TenantApi.Form = {
    accountCount: values.accountCount,
    contactPhone: values.contactPhone?.trim(),
    contactUser: values.contactUser?.trim(),
    domain: values.domain?.trim(),
    expireTime: values.expireTime,
    packageId: values.packageId,
    remark: values.remark,
    status: values.status,
    tenantId: tenantId.value ?? values.tenantId,
    tenantName: values.tenantName?.trim(),
  };
  await (tenantId.value
    ? updateTenant(data)
    : addTenant({
        ...data,
        adminPassword: values.adminPassword,
        adminUserName: values.adminUserName?.trim(),
      }));
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      await save();
      message.success($t('crud.saved'));
      emit('success');
      drawerApi.close();
    } catch (error) {
      // 新增租户需要加密发送管理员口令；浏览器无法加密时请求不会发出，这里说明原因
      if (error instanceof ApiCryptoUnavailableError) {
        message.error(error.message);
        return;
      }
      throw error;
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData() as undefined | { tenantId?: string };
    tenantId.value = data?.tenantId;
    const editing = Boolean(tenantId.value);
    // 默认租户（平台）没有套餐、不能停用、不会过期、不限用户数，修改时不显示这几项（后端同样忽略）
    const platform = isDefaultTenant(tenantId.value);
    await formApi.resetForm();
    drawerApi.lock();
    try {
      const options = await loadFormOptions();
      formApi.updateSchema([
        {
          componentProps: { options: options.status },
          dependencies: { if: !platform, triggerFields: ['tenantId'] },
          fieldName: 'status',
        },
        {
          componentProps: { options: options.packages },
          dependencies: { if: !platform, triggerFields: ['tenantId'] },
          fieldName: 'packageId',
        },
        {
          dependencies: { if: !platform, triggerFields: ['tenantId'] },
          fieldName: 'expireTime',
        },
        {
          dependencies: { if: !platform, triggerFields: ['tenantId'] },
          fieldName: 'accountCount',
        },
        // 租户编码创建后不能修改；管理员账号与口令只在新增时填写
        { componentProps: { disabled: editing }, fieldName: 'tenantId' },
        {
          dependencies: { if: !editing, triggerFields: ['tenantId'] },
          fieldName: 'adminUserName',
        },
        {
          dependencies: { if: !editing, triggerFields: ['tenantId'] },
          fieldName: 'adminPassword',
        },
      ]);
      if (tenantId.value) {
        const detail = await getTenant(tenantId.value);
        const packageId =
          detail.packageId === null || detail.packageId === undefined
            ? undefined
            : String(detail.packageId);
        // 现有套餐已停用或删除时不在选项中，显示为“不可用”，保存前需要换一个启用的套餐
        if (
          packageId &&
          !options.packages.some((item) => item.value === packageId)
        ) {
          formApi.updateSchema([
            {
              componentProps: {
                options: [
                  ...options.packages,
                  {
                    label: $t('system.tenant.packageUnavailable'),
                    value: packageId,
                  },
                ],
              },
              fieldName: 'packageId',
            },
          ]);
        }
        await formApi.setValues({ ...detail, packageId });
      }
    } finally {
      drawerApi.unlock();
    }
  },
});

const title = computed(() =>
  tenantId.value ? $t('system.tenant.edit') : $t('system.tenant.create'),
);
</script>

<template>
  <Drawer
    :confirm-text="$t('crud.save')"
    :title="title"
    class="w-full max-w-[640px]"
  >
    <Form />
  </Drawer>
</template>
