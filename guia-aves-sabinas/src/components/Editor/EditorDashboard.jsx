import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookPlus, BookOpen, Loader2 } from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function EditorDashboard() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "libros"));
                const booksData = [];
                querySnapshot.forEach((doc) => {
                    booksData.push({ id: doc.id, ...doc.data() });
                });
                setBooks(booksData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    const handleCreateNew = async () => {
        const newBookId = `guia-${Date.now()}`;
        const newBookRef = doc(db, "libros", newBookId);
        const initialData = {
            titulo: "Nueva Guía Interactiva",
            fechaCreacion: new Date().toLocaleDateString(),
            paginas: [
                {
                    id: '1',
                    tipo: 'portada',
                    config: {
                        titulo: 'Aves de Sabinas',
                        subtitulo: 'Guía',
                        backgroundColor: '#065f46',
                        textColor: '#ffffff'
                    }
                }
            ]
        };
        try {
            await setDoc(newBookRef, initialData);
            navigate(`/editor/${newBookId}`);
        } catch (error) {
            alert("Error al crear la guía.");
        }
    };

    return (
        <div className="h-full bg-gray-50 p-10 font-sans overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-100 p-3 rounded-xl">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800">
                            Creador de Guías Interactivas
                        </h1>
                        <p className="text-gray-500">
                            Diseña enciclopedias visuales página por página
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                            onClick={handleCreateNew}
                            className="h-64 border-2 border-dashed border-gray-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition group bg-white"
                        >
                            <BookPlus className="w-12 h-12 text-gray-400 mb-4 group-hover:text-blue-500 transition-colors" />
                            <span className="font-bold text-gray-600 group-hover:text-blue-600">
                                Crear Nueva Guía
                            </span>
                        </div>
                        {books.map(book => (
                            <div key={book.id} className="h-64 bg-white shadow-sm border border-gray-200 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition">
                                <div>
                                    <BookOpen className="w-8 h-8 text-blue-600 mb-4" />
                                    <h2 className="text-xl font-bold truncate text-gray-800">
                                        {book.titulo}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Creación: {book.fechaCreacion}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate(`/editor/${book.id}`)}
                                    className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition"
                                >
                                    Abrir Editor
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}