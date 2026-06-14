import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';                     // <-- initialisation AVANT tout le reste
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);