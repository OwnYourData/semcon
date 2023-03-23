import Vue from 'vue';
import App from './App.vue';
import { router } from './router';
import { getStore } from './store';

import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

import VueBootstrapTypeahead from 'vue-bootstrap-typeahead';

import { ConfigService } from './services/config-service';

(async () => {
  await ConfigService.initialize();

  Vue.use(BootstrapVue);
  Vue.use(IconsPlugin);
  
  Vue.component('b-typeahead', VueBootstrapTypeahead);

  new Vue({
    router,
    store: getStore(),
    render: h => h(App)
  }).$mount('#app')
}
)();
