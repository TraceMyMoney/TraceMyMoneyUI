import App from './App.vue'
import { registerPlugins } from '@/plugins'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { fetchAccessToken } from './helper/helper'

// date-picker
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

const app = createApp(App)
registerPlugins(app)
app.use(createPinia())
fetchAccessToken();

// Add the datepicker
app.component('VueDatePicker', VueDatePicker);

app.mount('#app');
