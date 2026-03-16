import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App';
import { Home } from './pages/Home';
import { NewFormation } from './pages/NewFormation';
import { FormationCasePage } from './pages/FormationCase';
import { CompliancePage } from './pages/Compliance';
import { DocumentsPage } from './pages/Documents';
import './styles/globals.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/formation/new" element={<NewFormation />} />
          <Route path="/formation/:id" element={<FormationCasePage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Routes>
      </App>
    </BrowserRouter>
  </React.StrictMode>
);
