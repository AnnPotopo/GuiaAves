import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookPlus, BookOpen } from 'lucide-react';
// Importamos Firebase
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Asegúrate de que la ruta sea correcta

export default function BookList() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar los libros desde Firebase al abrir la página
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
                console.error("Error cargando libros:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    // Crear un nuevo libro directamente en Firebase
    const handleCreateNew = async () => {
        const newBookId = `guia-${Date.now()}`;
        const newBookRef = doc(db, "libros", newBookId);

        const initialData = {
            titulo: "Nueva Guía de Aves",
            fechaCreacion: new Date().toLocaleDateString(),
            paginas: [
                { id: '1', tipo: 'portada', config: { titulo: 'Aves de Sabinas', subtitulo: 'Guía de Campo', backgroundColor: '#065f46', textColor: '#ffffff', themeColor: '#a7f3d0', layout: 'center' } }
            ]
        };

        try {
            await setDoc(newBookRef, initialData);
            navigate(`/editor/${newBookId}`);
        } catch (error) {
            console.error("Error creando libro:", error);
            alert("Hubo un error al crear el libro.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-10 font-sans text-gray-800">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-emerald-800 mb-8">Mis Publicaciones</h1>

                {loading ? (
                    <p className="text-gray-500">Cargando tus libros desde la nube...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                            onClick={handleCreateNew}
                            className="h-64 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-500 transition"
                        >
                            <BookPlus className="w-12 h-12 text-gray-400 mb-4" />
                            <span className="font-semibold text-gray-600">Crear Nuevo Libro</span>
                        </div>

                        {books.map(book => (
                            <div key={book.id} className="h-64 bg-white shadow-md rounded-lg p-6 flex flex-col justify-between hover:shadow-xl transition">
                                <div>
                                    <BookOpen className="w-8 h-8 text-emerald-600 mb-4" />
                                    <h2 className="text-xl font-bold truncate">{book.titulo}</h2>
                                    <p className="text-sm text-gray-500 mt-2">Creación: {book.fechaCreacion}</p>
                                    <p className="text-xs text-gray-400 mt-1">{book.paginas?.length || 0} páginas</p>
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
                )}
            </div>
        </div>
    );
}