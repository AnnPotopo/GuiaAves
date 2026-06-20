import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './components/Home/Home';
import BirdApp from './components/BirdApp/BirdApp';
import BookList from './components/Dashboard/BookList';
import PDFViewer from './components/Editor/PDFViewer';
import UserProfile from './components/Dashboard/UserProfile';
import EditorLayout from './components/Editor/EditorLayout';
import AdminDashboard from './components/BirdApp/AdminDashboard';
import DatabaseManager from './components/Database/DatabaseManager';
import 'leaflet/dist/leaflet.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Usamos el Layout como "Plantilla" para todas estas rutas */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="birdapp" element={<BirdApp />} />
          <Route path="libros" element={<BookList />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="database" element={<DatabaseManager />} />
        </Route>

        {/* El Editor queda independiente para ser Pantalla Completa */}
        <Route path="/editor/:bookId" element={<EditorLayout />} />
        <Route path="/visor/:bookId" element={<PDFViewer />} />
        <Route path="/perfil/:usuarioId" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  );
}