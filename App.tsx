
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EditorPage } from './components/pages/EditorPage';
import { HomePage } from './components/pages/HomePage';
import { DocsPage } from './components/pages/DocsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
