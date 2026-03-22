import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookList from './components/Dashboard/BookList';
import EditorLayout from './components/Editor/EditorLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pantalla de inicio donde verás todos tus libros */}
        <Route path="/" element={<BookList />} />

        {/* El editor, que recibe el ID del libro en la URL */}
        <Route path="/editor/:bookId" element={<EditorLayout />} />
      </Routes>
    </BrowserRouter>
  );
}