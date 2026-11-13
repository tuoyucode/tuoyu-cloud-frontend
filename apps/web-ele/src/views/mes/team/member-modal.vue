<script lang="ts" setup>
import type { TeamApi } from '@tuoyu/shared/api/mes/team';
import type { UserApi } from '@tuoyu/shared/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { listTeamMembers, updateTeamMembers } from '@tuoyu/shared/api/mes/team';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import {
  ElButton,
  ElEmpty,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { $t } from '#/locales';
import UserSelectModal from '#/views/workflow/components/user-select-modal.vue';

/**
 * 班组成员：查看、添加、移除，确认后整体保存（空列表表示清空成员）。
 * 打开时传入 { teamId, teamName }
 */
const emit = defineEmits<{ success: [] }>();

type OpenData = { teamId: string; teamName: string };

const teamId = ref('');
const teamName = ref('');
const members = ref<TeamApi.Member[]>([]);
const loading = ref(false);

const editable = computed(() => hasPermission('mes:team:edit'));

const [UserModal, userModalApi] = useVbenModal({
  connectedComponent: UserSelectModal,
  destroyOnClose: true,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!editable.value) {
      modalApi.close();
      return;
    }
    modalApi.lock();
    try {
      await updateTeamMembers(
        teamId.value,
        members.value.map((member) => member.userId),
      );
      ElMessage.success($t('crud.saved'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as OpenData;
    teamId.value = data.teamId;
    teamName.value = data.teamName;
    members.value = [];
    loading.value = true;
    try {
      members.value = await listTeamMembers(data.teamId);
    } finally {
      loading.value = false;
    }
  },
});

function onAdd() {
  userModalApi
    .setData({
      excludeIds: members.value.map((member) => member.userId),
      multiple: true,
      title: $t('mes.team.addMembers'),
    })
    .open();
}

function onSelected(users: UserApi.Option[]) {
  const existing = new Set(members.value.map((member) => member.userId));
  const added = users
    .map((user) => ({ nickname: user.nickName, userId: String(user.userId) }))
    .filter((user) => !existing.has(user.userId));
  members.value = [...members.value, ...added];
}

function onRemove(userId: string) {
  members.value = members.value.filter((member) => member.userId !== userId);
}
</script>

<template>
  <Modal
    :confirm-text="editable ? $t('mes.team.saveMembers') : $t('mes.team.close')"
    :title="$t('mes.team.membersOf', { name: teamName })"
    class="w-full max-w-[640px]"
  >
    <UserModal @select="onSelected" />
    <div class="mb-3 flex items-center justify-between">
      <span class="text-muted-foreground">
        {{ $t('mes.team.memberTotal', { count: members.length }) }}
      </span>
      <ElButton v-if="editable" type="primary" @click="onAdd">
        {{ $t('mes.team.addMembers') }}
      </ElButton>
    </div>
    <ElTable
      v-loading="loading"
      :data="members"
      max-height="360"
      row-key="userId"
      size="small"
    >
      <ElTableColumn :label="$t('mes.team.nickname')" prop="nickname" />
      <ElTableColumn v-if="editable" align="right" width="100">
        <template #default="{ row }">
          <ElButton
            link
            size="small"
            type="danger"
            @click="onRemove(String(row.userId))"
          >
            {{ $t('mes.team.removeMember') }}
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty :description="$t('mes.team.noMembers')" />
      </template>
    </ElTable>
  </Modal>
</template>
