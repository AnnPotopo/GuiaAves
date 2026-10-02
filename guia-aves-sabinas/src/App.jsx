import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importación de Componentes
import Layout from './components/Layout/Layout';
import Home from './components/Home/Home';
import BirdApp from './components/BirdApp/BirdApp';
import BookList from './components/Dashboard/BookList';
import PDFViewer from './components/Editor/PDFViewer';
import EditorDashboard from './components/Editor/EditorDashboard';
import DatabaseManager from './components/Database/DatabaseManager';
import ModerationPanel from './components/Dashboard/ModerationPanel';
import UserProfile from './components/Dashboard/UserProfile';
import RedeemCode from './components/Dashboard/RedeemCode'; // <-- NUEVO MÓDULO

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas con el Layout (Menú Lateral) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/birdapp" element={<BirdApp />} />
          <Route path="/libros" element={<BookList />} />
          <Route path="/database" element={<DatabaseManager />} />
          <Route path="/moderacion" element={<ModerationPanel />} />
          <Route path="/perfil/:usuarioId" element={<UserProfile />} />
          <Route path="/canjear" element={<RedeemCode />} /> {/* <-- NUEVA RUTA */}
        </Route>

        {/* Rutas a Pantalla Completa (Sin Menú Lateral) */}
        <Route path="/creador-guias" element={<EditorDashboard />} />
        <Route path="/visor/:bookId" element={<PDFViewer />} />
      </Routes>
    </BrowserRouter>
  );
}