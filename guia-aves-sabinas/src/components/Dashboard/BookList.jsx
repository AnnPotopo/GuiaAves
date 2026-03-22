import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookPlus, BookOpen } from 'lucide-react';

export default function BookList() {
    const navigate = useNavigate();
    // Aquí luego cargaremos los libros reales desde Firebase
    const [books, setBooks] = useState([
        { id: 'guia-sabinas-01', titulo: 'Guía de Aves Nativas', fecha: '2026-03-21' }
    ]);

    const handleCreateNew = () => {
        // Aquí luego crearemos un documento en Firebase y obtendremos su ID
        const newBookId = `nuevo-libro-${Date.now()}`;
        navigate(`/editor/${newBookId}`);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-10 font-sans text-gray-800">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-emerald-800 mb-8">Mis Publicaciones</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjeta para crear nuevo libro */}
                    <div
                        onClick={handleCreateNew}
                        className="h-64 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-500 transition"
                    >
                        <BookPlus className="w-12 h-12 text-gray-400 mb-4" />
                        <span className="font-semibold text-gray-600">Crear Nuevo Libro</span>
                    </div>

                    {/* Lista de libros existentes */}
                    {books.map(book => (
                        <div key={book.id} className="h-64 bg-white shadow-md rounded-lg p-6 flex flex-col justify-between hover:shadow-xl transition">
                            <div>
                                <BookOpen className="w-8 h-8 text-emerald-600 mb-4" />
                                <h2 className="text-xl font-bold">{book.titulo}</h2>
                                <p className="text-sm text-gray-500 mt-2">Última edición: {book.fecha}</p>
                            </div>
                            <button
                                onClick={() => navigate(`/editor/${book.id}`)}
                                className="w-full py-2 bg-emerald-100 text-emerald-800 rounded font-semibold hover:bg-emerald-200"
                            >
                                Abrir Editor
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}