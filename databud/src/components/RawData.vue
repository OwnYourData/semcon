<template>
  <div class="row">
    <div class="col-md-4">
      <div class="top-container">
        <h3 class="heading">System</h3>
      </div>
      <raw-json :data="systemData" />
      <div class="top-container">
        <h3 class="heading">Meta</h3>
        <b-checkbox
          class="check"
          v-model="isMetaEditable"
        >Editable</b-checkbox>
      </div>
      <b-textarea
        v-if="isMetaEditable"
        v-model="editableMeta"
        rows="10"
        class="textarea"
      />
      <raw-json
        v-else
        :data="item.meta"
      />
    </div>
    <div class="col-md-8">
      <div class="top-container">
        <h3 class="heading">Content</h3>
        <span
          class="text-muted"
          v-if="isEncrypted"
        > (encrypted)</span>
        <b-checkbox
          class="check"
          v-model="isDataEditable"
        >Editable</b-checkbox>
        <custom-button
          class="btn-save"
          @click="save"
          :type="isSaving ? 'primary-outline' : undefined"
          v-if="isDataEditable || isMetaEditable"
          :disabled="isSaving"
        >
          <spinner v-if="isSaving" />
          <template v-else>
            Save
          </template>
        </custom-button>

      </div>

      <vue-monaco-editor
        v-if="isDataEditable"
        class="monaco"
        language="json"
        v-model="editableData"
      />
      <raw-json
        v-else
        :data="item.data"
      />
    </div>
  </div>
</template>

<script lang="ts">
// @ts-ignore
import { VaultItem, VaultPostItem } from 'vaultifier';
import Vue, { PropType } from 'vue'
import RawJson from './RawJson.vue';
import CustomButton from './Button.vue';
import Spinner from './Spinner.vue';

interface Data {
  isDataEditable: boolean;
  isMetaEditable: boolean;
  editableData: string;
  editableMeta: string;
}

export default Vue.extend({
  components: {
    RawJson,
    CustomButton,
    Spinner,
  },
  props: {
    item: {
      type: Object as PropType<VaultItem>,
    },
    isSaving: {
      type: Boolean as PropType<boolean>,
    }
  },
  data: (): Data => ({
    isDataEditable: false,
    isMetaEditable: false,
    editableData: '',
    editableMeta: '',
  }),
  created() {
    this.resetEditableData();
  },
  methods: {
    resetEditableData() {
      this.editableData = JSON.stringify(this.item.data, undefined, 2);
      this.editableMeta = JSON.stringify(this.item.meta, undefined, 2);
    },
    save() {
      console.log('save')
      const postItem: VaultPostItem = {
        ...this.item,
      };

      this.$emit('save', postItem);
    },
  },
  watch: {
    editableData(value: string) {
      try {
        this.item.data = JSON.parse(value);
      } catch { /* */ }
    },
    editableMeta(value: string) {
      try {
        this.item.meta = JSON.parse(value);
      } catch { /* */ }
    },
    item() {
      this.resetEditableData();
    },
  },
  computed: {
    systemData(): any {
      const copy = { ...this.item };
      // @ts-ignore
      delete copy.raw;
      // @ts-ignore
      delete copy.data;
      // @ts-ignore
      delete copy.meta;
      return copy;
    },
    isEncrypted(): boolean {
      return this.item.isEncrypted;
    }
  }
});
</script>

<style scoped>
.top-container {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
}

.check {
  margin-left: 1em;
}

.btn-save {
  margin-left: auto;
}

.textarea {
  font-family: monospace;
  font-size: 0.85em;
}

.monaco {
  max-height: 600px;
}
</style>