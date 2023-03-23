<template>
  <pre class="card">{{ jsonContent }}</pre>
</template>

<style scoped>
.card {
  padding: 1em;

  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.card:hover {
  overflow: auto;
  text-overflow: clip;
}
</style>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    data: Object,
  },
  computed: {
    jsonContent(): string {
      return JSON.stringify(this.data, null, 2).trim();
    }
  }
})
</script>