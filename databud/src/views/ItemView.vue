<template>
  <b-container>
    <data-visualizer
      v-if="vaultItem"
      :item="vaultItem"
    />
    <spinner v-else />
  </b-container>
</template>

<script lang="ts">
import Vue from 'vue';
import DataVisualizer from '../components/DataVisualizer.vue';

import { IStore } from '@/store';
import { ActionType } from '@/store/action-type';
import { VaultItem, VaultMinMeta } from 'vaultifier';
import Spinner from '@/components/Spinner.vue';
export default Vue.extend({
  props: {
    itemId: String,
  },
  components: {
    DataVisualizer,
    Spinner,
  },
  mounted() {
    this.$store.dispatch(ActionType.FETCH_VAULT_ITEM, {
      id: parseInt(this.itemId)
    } as VaultMinMeta)
  },
  computed: {
    vaultItem(): VaultItem | undefined {
      return (this.$store.state as IStore).vaultItem.current;
    }
  }
});
</script>