<script lang="ts" setup>
import type { TeamApi } from '@tuoyu/shared/api/mes/team';
import type { UserApi } from '@tuoyu/shared/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { listTeamMembers, updateTeamMembers } from '@tuoyu/shared/api/mes/team';
import { hasPermission } from '@tuoyu/shared/utils/permission';
import { Button, Empty, message, Table } from 'ant-design-vue';

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

const columns = computed(() => [
  { dataIndex: 'nickname', key: 'nickname', title: $t('mes.team.nickname') },
  ...(editable.value
    ? [{ align: 'right' as const, key: 'actions', title: '', width: 100 }]
    : []),
]);

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
      message.success($t('crud.saved'));
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
      <Button v-if="editable" type="primary" @click="onAdd">
        {{ $t('mes.team.addMembers') }}
      </Button>
    </div>
    <Table
      :columns="columns"
      :data-source="members"
      :loading="loading"
      :pagination="false"
      :scroll="{ y: 360 }"
      row-key="userId"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <Button
            danger
            size="small"
            type="link"
            @click="onRemove(String(record.userId))"
          >
            {{ $t('mes.team.removeMember') }}
          </Button>
        </template>
      </template>
      <template #emptyText>
        <Empty :description="$t('mes.team.noMembers')" />
      </template>
    </Table>
  </Modal>
</template>
