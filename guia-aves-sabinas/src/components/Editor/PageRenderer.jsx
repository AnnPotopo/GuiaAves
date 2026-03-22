import React from 'react';
import { ImageIcon } from 'lucide-react';

export default function PageRenderer({ pageData }) {
    if (!pageData) return null;

    // 1. Diseño de Portada
    if (pageData.tipo === 'portada') {
        return (
            <div className="w-[850px] h-[550px] shadow-2xl flex rounded-sm overflow-hidden bg-emerald-600 text-white relative">
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <h1 className="text-6xl font-bold mb-4">{pageData.config?.titulo || 'Título del Libro'}</h1>
                    <p className="text-xl opacity-80">Guía de Campo</p>
                </div>
            </div>
        );
    }

    // 2. Diseño de Ficha de Ave (Tu diseño original adaptado)
    if (pageData.tipo === 'ave') {
        return (
            <div className="w-[850px] h-[550px] bg-white shadow-2xl flex rounded-sm overflow-hidden relative">
                {/* Mitad Izquierda (Imagen) */}
                <div className="w-1/2 h-full bg-gray-100 flex items-center justify-center text-gray-400 p-8 text-center border-r border-gray-200">
                    <div className="flex flex-col items-center">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                        <p>Usa la herramienta "Ajustar Imagen" para agregar la foto de esta especie.</p>
                    </div>
                </div>
                {/* Mitad Derecha (Datos) */}
                <div className="w-1/2 h-full p-10 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-bl-full"></div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Nombre Común</h2>
                    <h3 className="text-md italic text-gray-600 border-b border-gray-300 pb-4 mb-4">Nombre Científico</h3>
                    <div className="space-y-3 text-sm">
                        <p><strong>Familia:</strong> -</p>
                        <p><strong>Orden:</strong> -</p>
                        <p><strong>NOM 059:</strong> -</p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Página en blanco por defecto
    return (
        <div className="w-[850px] h-[550px] bg-white shadow-2xl flex items-center justify-center text-gray-300">
            Página en blanco
        </div>
    );
}