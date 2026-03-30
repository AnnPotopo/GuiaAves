import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, Bird } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4 flex items-center justify-center gap-3">
                        <Bird className="w-10 h-10 text-emerald-600" />
                        Herramientas <span className="text-emerald-600">Sabinas</span>
                    </h1>
                    <p className="text-gray-500">Selecciona la plataforma a la que deseas acceder</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* TARJETA 1: IDENTIFICADOR */}
                    <div
                        onClick={() => navigate('/birdapp')}
                        className="bg-white rounded-2xl p-8 cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 group"
                    >
                        <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
                            <Mic className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Identificador de Aves</h2>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Explora el bosque, graba cantos en tiempo real con IA y llena tu colección de avistamientos.
                        </p>
                    </div>

                    {/* TARJETA 2: EDITOR DE LIBROS */}
                    <div
                        onClick={() => navigate('/libros')} // <-- ¡ESTA RUTA SALVA TUS LIBROS!
                        className="bg-white rounded-2xl p-8 cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
                    >
                        <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                            <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Editor de Libros</h2>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Administra tus libros, diseña las páginas y exporta para imprenta.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}