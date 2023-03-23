<template>
  <div class="row">
    <section class="col-md-4">
      <list
        :isLoading="isSchemaListLoading"
        @refresh="fetchSchemas"
      >
        <b-list-group-item
          v-for="item of schemaDRIs"
          :key="item.dri"
          :active="selectedSchema && item.dri === selectedSchema.dri"
          :variant="item.dri === undefined ? 'secondary' : undefined"
          v-b-tooltip.hover.top="item.dri === undefined ? `All data` : undefined"
          @click="() => selectSchema(item)"
        >
          {{item.title || item.dri}}
        </b-list-group-item>
      </list>
    </section>
    <section class="col-md-8">
      <b-tabs
        content-class="mt-3"
        @activate-tab="handleActivateTab"
        v-model="selectedTabIndex"
        lazy
      >
        <b-tab title="Data Items">
          <list
            :isLoading="isVaultItemListLoading"
            :totalItems="totalVaultItems"
            :currentPage="currentVaultPage"
            :pageItems="vaultPageItems"
            @refresh="fetchVaultItems"
          >
            <template v-slot:header-end>
              <custom-button @click="addItem">New</custom-button>
              <custom-button
                v-for="action of actions"
                :key="action.key"
                @click="executeAction(action)"
                :type="isExecutingAction ? 'success-outline' : 'success'"
                :disabled="isExecutingAction"
              >
                <spinner v-if="isExecutingAction" />
                <template v-else>
                  {{action.title}}
                </template>
              </custom-button>
              <custom-button
                type="danger"
                @click="deleteSelectedVaultItem"
                :disabled="isDeleteButtonDisabled"
              >Delete</custom-button>
            </template>
            <b-list-group-item
              v-for="item of vaultItems"
              :key="item.id"
              :active="selectedVaultItem && item.id === selectedVaultItem.id"
              @click="() => selectVaultItem(item)"
            >
              {{getListTitle(item)}}
            </b-list-group-item>
          </list>
        </b-tab>
        <b-tab title="Charts">
          <b-input-group prepend="Page Size">
            <b-input v-model="dataItemCount" />
          </b-input-group>
          <b-input-group prepend="Page Number">
            <b-input v-model="dataItemPage" />
          </b-input-group>

          <chart-visualizer :items="vaultItems">
          </chart-visualizer>
        </b-tab>
      </b-tabs>
    </section>
    <b-container v-if="showEditView">
      <b-alert
        v-if="saveMessage"
        show
        variant="danger"
      >
        {{saveMessage}}
      </b-alert>
      <form-edit-view
        class="col-md-12 form-edit-view"
        :schemaDri="editViewSchemaDri"
        :isSaving="isSaving"
        @save="saveVaultItem"
        @cancel="() => _showEditView(false)"
      ></form-edit-view>
    </b-container>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { IFetchVaultItems, IStore } from '../store';
import List, { RefreshObj } from '../components/List.vue';
import CustomButton from '../components/Button.vue';
import ChartVisualizer from '../components/ChartVisualizer.vue';
import FormEditView from './FormEditView.vue';
import { VaultItem, VaultMinMeta, VaultPostItem, VaultSchema } from 'vaultifier/dist/module';
import { ActionType } from '@/store/action-type';
import { FetchState } from '@/store/fetch-state';
import { getInstance, soya } from '@/services';
import { NetworkResponse } from 'vaultifier/dist/module/communicator';
import { Action, executeAction, getActionsFromConfig } from '@/utils/actions';
import Handlebars from 'handlebars';

interface IData {
  selectedSchema?: VaultSchema,
  selectedListLabelTemplate?: string,

  showEditView: boolean,
  editViewSchema?: VaultSchema,
  isSaving: boolean,
  isExecutingAction: boolean,
  saveMessage?: string,

  // charting
  selectedTabIndex: number,
  dataItemCount: number,
  dataItemPage?: number,
}

export default Vue.extend({
  mounted() {
    this.initialize();
  },
  data: (): IData => ({
    selectedSchema: undefined,
    selectedListLabelTemplate: undefined,

    showEditView: false,
    editViewSchema: undefined,
    isSaving: false,
    isExecutingAction: false,
    saveMessage: undefined,

    // charting
    selectedTabIndex: 0,
    dataItemCount: 50,
    dataItemPage: undefined,
  }),
  components: {
    CustomButton,
    FormEditView,
    List,
    ChartVisualizer,
  },
  methods: {
    async initialize() {
      await this.fetchSchemas();
    },
    async selectSchema(schema: VaultSchema) {
      const state = this.$store.state as IStore;

      this.selectedSchema = schema;
      // reset template as it needs to be fetched anew
      this.selectedListLabelTemplate = undefined;

      await this.fetchVaultItems();

      const doc = state.schemaDRI.current;
      if (doc) {
        try {
          const sparql = await soya.getSparqlBuilder(doc);
          const bindings = await sparql.query(`
  PREFIX soya: <${doc["@context"]["@base"]}>
  SELECT * WHERE {
      ?base a soya:OverlayDataBudRendering .
      ?base <http://www.w3.org/2000/01/rdf-schema#label> ?label .
  }`);

          if (bindings[0])
            this.selectedListLabelTemplate = bindings[0].get('?label') || undefined;
        } catch { /* we don't care if this does not work */ }
      }
    },
    async selectVaultItem(item?: VaultMinMeta) {
      await this.$store.dispatch(ActionType.FETCH_VAULT_ITEM, item);
    },
    async fetchSchemas() {
      this.selectedSchema = undefined;
      await this.$store.dispatch(ActionType.FETCH_SCHEMA_DRIS);
    },
    async fetchVaultItems(refreshObj?: RefreshObj) {
      const isChart = this.selectedTabIndex === 1;

      let fetchObj: IFetchVaultItems = {
        schema: this.selectedSchema,
        page: refreshObj?.page,
        // we only want to fetch all the content if we display charts
        fetchContent: isChart,
      };

      if (isChart) {
        fetchObj.size = this.dataItemCount;
        fetchObj.page = this.dataItemPage;
      }

      await this.$store.dispatch(ActionType.FETCH_VAULT_ITEMS, fetchObj);
    },
    async deleteSelectedVaultItem() {
      await this.$store.dispatch(ActionType.DELETE_VAULT_ITEM, this.selectedVaultItem);
      await this.fetchSchemas();
    },
    async addItem() {
      await this.selectVaultItem(undefined);
      this._showEditView(true);
    },
    async executeAction(action: Action) {
      this.isExecutingAction = true;

      const vaultifier = getInstance();
      const state = this.$store.state as IStore;
      let response: NetworkResponse | undefined;

      try {
        response = await executeAction(action, vaultifier, this);
      } catch (e) {
        console.error(e);
      }

      if (response) {
        const vaultItemId = response.data.id;
        const vaultItem = await vaultifier.getItem({ id: vaultItemId });

        if (!vaultItem.meta.schema) {
          console.error('Vault item does not have schema DRI!');
        } else {
          await this.fetchSchemas();
          const schema = state.schemaDRI.all.find(x => x.dri === vaultItem.meta.schema);

          if (!schema) {
            console.error('Could not find schema DRI in internal list!');
          } else {
            await this.selectSchema(schema);
            await this.selectVaultItem(vaultItem);
          }
        }
      }

      this.isExecutingAction = false;
    },
    async saveVaultItem(postItem: VaultPostItem, onComplete?: () => void) {
      this.saveMessage = undefined;
      this.isSaving = true;

      try {
        await this.$store.dispatch(ActionType.UPDATE_VAULT_ITEM, postItem);
        this._showEditView(false);
      } catch (e) {
        console.error(e);
        this.saveMessage = 'Could not save item';
      }

      await this.fetchVaultItems();
      this.isSaving = false;

      if (onComplete)
        // indicate saving is complete
        onComplete();
    },
    _showEditView(show: boolean) {
      this.showEditView = show;
      this.saveMessage = undefined;
      this.editViewSchema = this.selectedSchema;

      this.$emit('showEditView', this.showEditView);
    },
    async handleActivateTab() {
      this.selectedSchema = undefined;
      this.$store.dispatch(ActionType.RESET_VAULT_ITEMS);
    },
    getListTitle(vaultItem: VaultItem) {
      if (this.selectedListLabelTemplate)
        return Handlebars.compile(this.selectedListLabelTemplate)(vaultItem.data);
      else
        return vaultItem.id;
    },
  },
  computed: {
    schemaDRIs(): (VaultSchema & { dri?: string })[] {
      return [{ dri: undefined, title: 'Default' }, ...this.$store.state.schemaDRI.all];
    },
    isSchemaListLoading(): boolean {
      return (this.$store.state as IStore).schemaDRI.state === FetchState.FETCHING;
    },
    vaultItems(): VaultItem[] | undefined {
      return this.$store.state.vaultItem.all;
    },
    isVaultItemListLoading(): boolean {
      return (this.$store.state as IStore).vaultItem.allState === FetchState.FETCHING;
    },
    selectedVaultItem(): VaultItem | undefined {
      return (this.$store.state as IStore).vaultItem.current;
    },
    hasSelectedVaultItem(): boolean {
      return !!this.selectedVaultItem;
    },
    isDeleteButtonDisabled(): boolean {
      return !this.hasSelectedVaultItem;
    },
    hasSelectedSchema(): boolean {
      return !!this.selectedSchema;
    },
    editViewSchemaDri(): string | undefined {
      return this.editViewSchema?.dri;
    },
    currentVaultPage(): number | undefined {
      return (this.$store.state as IStore).vaultItem.paging?.current;
    },
    totalVaultItems(): number | undefined {
      return (this.$store.state as IStore).vaultItem.paging?.totalItems;
    },
    vaultPageItems(): number | undefined {
      return (this.$store.state as IStore).vaultItem.paging?.pageItems;
    },
    actions(): Action[] {
      return getActionsFromConfig('settings', 'additionalListActions');
    }
  }
})
</script>

<style scoped>
.form-edit-view {
  margin-top: 2em;
}
</style>