<template>
  <b-card no-body>
    <b-tabs
      pills
      card
      v-model="activeTabIndex"
    >
      <b-tab
        title="Raw Data"
        v-if="showRawView"
      >
        <raw-data
          :item="item"
          :isSaving="isSaving"
          @save="saveVaultItem"
        ></raw-data>
      </b-tab>
      <b-tab
        title="Form"
        v-if="hasSchema"
        lazy
      >
        <form-edit-view
          :item="item"
          :schemaDri="schemaDri"
          :allowSelectSchema="true"
          :hasCancel="false"
          :isSaving="isSaving"
          @save="saveVaultItem"
        ></form-edit-view>
      </b-tab>
    </b-tabs>
  </b-card>
</template>

<style scoped>
.flex-container {
  display: flex;
  align-items: center;
  margin-bottom: 2em;
}

.signature-logo {
  margin-right: 2em;
  max-width: 4em;
}

.sign-button {
  margin-left: auto;
}
</style>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { VaultItem, VaultMinMeta, VaultPostItem } from 'vaultifier';
import RawData from './RawData.vue';

import FormEditView from './FormEditView.vue';

import { ActionType } from '@/store/action-type';

interface Data {
  isSaving: boolean;
  activeTabIndex: number;
}

export default Vue.extend({
  props: {
    item: Object as PropType<VaultItem>,
    showRawView: {
      default: true,
      type: Boolean as PropType<boolean>,
    },
  },
  data: (): Data => ({
    isSaving: false,
    activeTabIndex: 0,
  }),
  components: {
    RawData,
    FormEditView,
  },
  computed: {
    schemaDri(): string | undefined {
      return this.item.meta.schema;
    },
    hasSchema(): boolean {
      return !!this.schemaDri;
    },
  },
  methods: {
    async saveVaultItem(item: VaultPostItem, onComplete?: () => void) {
      this.isSaving = true;

      try {
        await this.$store.dispatch(ActionType.UPDATE_VAULT_ITEM, item);
      } catch {
        /* TODO: Error handling */
      }

      this.isSaving = false;

      if (onComplete)
        // indicate saving is complete
        onComplete();
    },
  },
})
</script>