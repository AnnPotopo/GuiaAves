import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home/Home';
import BirdApp from './components/BirdApp/BirdApp';
import BookList from './components/Dashboard/BookList';
import EditorLayout from './components/Editor/EditorLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Pantalla de Bienvenida */}
        <Route path="/" element={<Home />} />

        {/* 2. El Identificador (Tu App de Aves) */}
        <Route path="/birdapp" element={<BirdApp />} />

        {/* 3. TU PANEL DE LIBROS (Aquí están a salvo) */}
        <Route path="/libros" element={<BookList />} />

        {/* 4. El Editor (Donde diseñas las páginas) */}
        <Route path="/editor/:bookId" element={<EditorLayout />} />
      </Routes>
    </BrowserRouter>
  );
}