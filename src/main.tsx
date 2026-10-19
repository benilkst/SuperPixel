/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrasi Service Worker PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('PWA: Versi baru tersedia');
  },
  onOfflineReady() {
    console.info('PWA: Siap digunakan secara offline');
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
