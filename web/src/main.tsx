import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MembershipProvider } from './membership/MembershipProvider';
import './index.css';
import './components/AudioInputStatus.css';
import './components/DeliveryCues.css';
import './theme.css';
import './components/StageLights.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MembershipProvider>
      <App />
    </MembershipProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
