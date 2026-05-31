import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import App from './App';
const root = document.getElementById('root');
if (!root)
    throw new Error('#root not found');
createRoot(root).render(_jsx(App, {}));
