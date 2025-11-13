import { createRoot } from 'react-dom/client';
import './index.css';
import App from "./App.jsx";
import '../app/renderer.js'


createRoot(document.getElementById('root')).render(
    <App />
);

if (window.IN_DESKTOP_ENV) {
    console.info(`Desktop app is detected`)
} else {
    console.info("Web browser is detected")
}
