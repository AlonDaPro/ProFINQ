// Self-hosted variable font: no third-party request, and every subset declares a
// unicode-range, so the browser downloads only the scripts a page uses (Latin, Hebrew, Arabic).
import '@fontsource-variable/rubik/wght.css';
import './styles/main.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

const app = createApp(App);

app.config.errorHandler = (error, _instance, info) => {
  console.error(`Unhandled error (${info})`, error);
};

app.use(createPinia());
app.use(router);
app.mount('#app');
