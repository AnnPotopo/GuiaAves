import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BookOpen, Mic, BarChart3, ChevronRight } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const { user, isAdmin } = useOutletContext();

    const modulos = [
        { id: 'birdapp', titulo: 'Identificador', descripcion: 'Descubre especies, revisa el mapa y crea tus listas.', icono: <Mic className="w-6 h-6 text-emerald-600" />, color: 'bg-emerald-50 hover:border-emerald-300', ruta: '/birdapp', adminOnly: false },
        { id: 'libros', titulo: 'Editor de Libros', descripcion: 'Administra la enciclopedia global y diseña páginas.', icono: <BookOpen className="w-6 h-6 text-blue-600" />, color: 'bg-blue-50 hover:border-blue-300', ruta: '/libros', adminOnly: true },
        { id: 'dashboard', titulo: 'Centro de Comando', descripcion: 'Estadísticas globales, mapas y reportes exportables.', icono: <BarChart3 className="w-6 h-6 text-purple-600" />, color: 'bg-purple-50 hover:border-purple-300', ruta: '/dashboard', adminOnly: true }
    ];

    return (
        <div className="p-6 md:p-10 relative">
            <div className="max-w-4xl mx-auto mt-4 md:mt-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
                    Hola, <span className="text-emerald-600">{user.displayName.split(' ')[0]}</span> 👋
                </h1>
                <p className="text-gray-500 mb-10 text-lg">¿Qué te gustaría hacer hoy?</p>

                <div className="grid gap-5 md:grid-cols-2">
                    {modulos.filter(m => !m.adminOnly || isAdmin).map((modulo) => (
                        <div key={modulo.id} onClick={() => navigate(modulo.ruta)} className={`bg-white rounded-2xl p-6 cursor-pointer border border-gray-200 shadow-sm transition-all duration-200 group flex items-start gap-5 ${modulo.color}`}>
                            <div className={`${modulo.color.split(' ')[0]} p-4 rounded-2xl shrink-0 group-hover:scale-110 transition-transform`}>{modulo.icono}</div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-emerald-700 transition-colors">{modulo.titulo}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed">{modulo.descripcion}</p>
                            </div>
                            <div className="shrink-0 pt-1"><ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" /></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}