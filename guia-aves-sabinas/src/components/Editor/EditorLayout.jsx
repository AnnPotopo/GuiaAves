import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, Plus, Upload, Image as ImageIcon, Type, Save, ArrowLeft, FileText, Square } from 'lucide-react';
import PageRenderer from './PageRenderer';

export default function EditorLayout() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Estado inicial del libro (luego vendrá de Firebase)
    const [pages, setPages] = useState([
        { id: '1', tipo: 'portada', config: { titulo: 'Aves de Sabinas Hidalgo', color: '#10b981' } }
    ]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const handleSave = () => {
        alert(`Guardando libro ${bookId} en Firebase... (Lógica pendiente)`);
    };

    const handleAddPage = (tipo) => {
        const newPage = { id: Date.now().toString(), tipo: tipo, config: {} };
        setPages([...pages, newPage]);
        setCurrentPageIndex(pages.length);
    };

    return (
        <div className="flex h-screen bg-gray-200 overflow-hidden font-sans">

            {/* MENÚ LATERAL IZQUIERDO */}
            <div className={`bg-[#1e293b] text-gray-300 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-16'}`}>

                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    {sidebarOpen && <button onClick={() => navigate('/')} className="hover:text-white flex items-center"><ArrowLeft className="w-5 h-5 mr-2" /> Inicio</button>}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:text-white ml-auto">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col flex-1 py-4 overflow-y-auto space-y-2">

                    <div className="px-4 pb-2">
                        <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 ${!sidebarOpen && 'hidden'}`}>Agregar Páginas</p>
                        <button onClick={() => handleAddPage('portada')} className="flex items-center w-full p-2 rounded hover:bg-gray-800 transition">
                            <Square className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="ml-3 text-sm">Página de Portada</span>}
                        </button>
                        <button onClick={() => handleAddPage('ave')} className="flex items-center w-full p-2 rounded hover:bg-gray-800 transition">
                            <FileText className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="ml-3 text-sm">Ficha de Ave</span>}
                        </button>
                    </div>

                    <div className="px-4 py-2 border-t border-gray-700">
                        <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 ${!sidebarOpen && 'hidden'}`}>Herramientas</p>
                        <label className="flex items-center w-full p-2 rounded hover:bg-gray-800 transition cursor-pointer">
                            <Upload className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="ml-3 text-sm">Importar Excel</span>}
                            <input type="file" className="hidden" accept=".xlsx" />
                        </label>
                        <button className="flex items-center w-full p-2 rounded hover:bg-gray-800 transition">
                            <ImageIcon className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="ml-3 text-sm">Ajustar Imagen</span>}
                        </button>
                        <button className="flex items-center w-full p-2 rounded hover:bg-gray-800 transition">
                            <Type className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="ml-3 text-sm">Estilos de Texto</span>}
                        </button>
                    </div>
                </div>

                <button onClick={handleSave} className="flex items-center p-4 hover:bg-emerald-600 bg-emerald-700 text-white transition mt-auto justify-center">
                    <Save className="w-5 h-5 min-w-[20px]" />
                    {sidebarOpen && <span className="ml-3 text-sm font-bold">Guardar Cambios</span>}
                </button>
            </div>

            {/* ÁREA DE TRABAJO (PREVISUALIZACIÓN) */}
            <div className="flex-1 flex flex-col relative overflow-auto">
                <div className="min-h-full p-8 flex flex-col items-center justify-center">

                    {/* Navegador de páginas superior */}
                    <div className="flex gap-2 mb-4">
                        {pages.map((p, idx) => (
                            <button
                                key={p.id}
                                onClick={() => setCurrentPageIndex(idx)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === currentPageIndex ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    {/* Renderizador de la página actual */}
                    <PageRenderer pageData={pages[currentPageIndex]} />

                </div>
            </div>

        </div>
    );
}