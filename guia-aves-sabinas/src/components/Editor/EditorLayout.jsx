import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Menu, Upload, Save, ArrowLeft, FileText,
    Square, Palette, Layers3, Droplets, AlignCenter, Layout,
    Trash2, FileEdit, Book, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Asegúrate de que esta ruta a tu config.js sea correcta
import PageRenderer from './PageRenderer';

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================
const ControlPanel = ({ children, title }) => (
    <div className="border-t border-gray-800 pt-4 mt-4 px-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">{title}</p>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const TextInput = ({ label, value, onChange, isTextArea }) => (
    <div className="mb-2">
        <label className="text-xs text-gray-400 block mb-1">{label}</label>
        {isTextArea ? (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-800 text-sm text-gray-200 p-2 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none min-h-[80px]"
            />
        ) : (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-800 text-sm text-gray-200 p-2 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
        )}
    </div>
);

// ==========================================
// COMPONENTE PRINCIPAL: EDITOR LAYOUT
// ==========================================
export default function EditorLayout() {
    const { bookId } = useParams();
    const navigate = useNavigate();

    // Estados de interfaz
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('pages'); // 'pages', 'content', 'design'
    const [isSaving, setIsSaving] = useState(false);

    // Estado Global del Libro
    const [bookTitle, setBookTitle] = useState("Cargando...");
    const [pages, setPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // 1. CARGAR DATOS DESDE FIREBASE
    useEffect(() => {
        const loadBookFromFirebase = async () => {
            if (!bookId) return;
            try {
                const docRef = doc(db, "libros", bookId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBookTitle(data.titulo || "Sin título");
                    setPages(data.paginas || []);
                } else {
                    alert("No se encontró este libro en la base de datos.");
                }
            } catch (error) {
                console.error("Error al cargar el libro:", error);
            }
        };

        loadBookFromFirebase();
    }, [bookId]);

    const currentPage = pages[currentPageIndex] || null;

    // 2. FUNCIONES DE EDICIÓN Y GESTIÓN DE PÁGINAS
    const updateCurrentPageConfig = (key, value) => {
        setPages(prevPages => {
            const newPages = [...prevPages];
            newPages[currentPageIndex] = {
                ...currentPage,
                config: { ...currentPage.config, [key]: value }
            };
            return newPages;
        });
    };

    const handleDeletePage = () => {
        if (pages.length <= 1) {
            alert("El libro debe tener al menos una página.");
            return;
        }
        if (window.confirm("¿Estás seguro de que deseas eliminar esta página?")) {
            const newPages = pages.filter((_, idx) => idx !== currentPageIndex);
            setPages(newPages);
            setCurrentPageIndex(prev => (prev >= newPages.length ? newPages.length - 1 : prev));
            setActiveTab('pages');
        }
    };

    const handleAddPage = (tipo) => {
        const newPage = {
            id: Date.now().toString(),
            tipo: tipo,
            config: { backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1 }
        };
        setPages([...pages, newPage]);
        setCurrentPageIndex(pages.length);
        setActiveTab(tipo === 'blanco' || tipo === 'foto' ? 'design' : 'content');
    };

    const handleExcelImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const newPagesFromExcel = data.map((row, index) => ({
                id: `excel-${Date.now()}-${index}`,
                tipo: 'ave',
                config: {
                    backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1,
                    nombreCientifico: row['Nombre cientifico'] || row['Nombre Cientifico'] || '',
                    nombreComun: row['Nombre Comun'] || row['Nombre común'] || '',
                    orden: row['Orden'] || '',
                    familia: row['Familia'] || '',
                    iucn: row['Estado de conservación (IUCN)'] || '',
                    nom059: row['Estado de conservación (NOM 059)'] || '',
                    descripcion: row['Descripción'] || row['Descripcion'] || '',
                    dimorfismo: row['Dimorfismo'] || '',
                    longitud: row['Longitud'] || '',
                    canto: row['Canto y llamado'] || '',
                    habitat: row['Hábitat'] || row['Habitat'] || '',
                    alimentacion: row['Alimentación'] || row['Alimentacion'] || ''
                }
            }));

            setPages(prevPages => [...prevPages, ...newPagesFromExcel]);
            alert(`¡Se importaron ${newPagesFromExcel.length} aves correctamente!`);
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // Reset input
    };

    // 3. GUARDAR EN FIREBASE
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, "libros", bookId);
            await setDoc(docRef, {
                titulo: bookTitle,
                paginas: pages,
                fechaActualizacion: new Date().toLocaleDateString()
            }, { merge: true });

            alert(`¡Libro guardado en la nube con éxito!`);
        } catch (error) {
            console.error("Error al guardar en Firebase:", error);
            alert("Hubo un error al guardar. Revisa tu consola.");
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // RENDERIZADO DE LA INTERFAZ
    // ==========================================
    return (
        <div className="flex h-screen bg-gray-200 overflow-hidden font-sans">

            {/* MENÚ LATERAL IZQUIERDO */}
            <div className={`bg-[#111827] text-gray-300 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-[320px]' : 'w-16'}`}>

                {/* Header del Sidebar */}
                <div className="flex flex-col border-b border-gray-800">
                    <div className="flex items-center justify-between p-4">
                        {sidebarOpen && <button onClick={() => navigate('/')} className="hover:text-white flex items-center text-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Volver</button>}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:text-white ml-auto">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>

                    {sidebarOpen && (
                        <div className="px-4 pb-4 flex items-center gap-2">
                            <Book className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <input
                                type="text"
                                value={bookTitle}
                                onChange={(e) => setBookTitle(e.target.value)}
                                className="bg-transparent border-b border-gray-700 text-white font-bold w-full focus:border-emerald-500 focus:outline-none px-1"
                                placeholder="Título del Libro..."
                            />
                        </div>
                    )}
                </div>

                {/* Tabs de navegación */}
                {sidebarOpen && (
                    <div className="flex border-b border-gray-800 text-[11px] font-bold tracking-wider shrink-0">
                        <button onClick={() => setActiveTab('pages')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'pages' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <Layers3 className="w-4 h-4" /> PÁGINAS
                        </button>
                        <button onClick={() => setActiveTab('content')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'content' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <FileEdit className="w-4 h-4" /> CONTENIDO
                        </button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'design' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <Palette className="w-4 h-4" /> DISEÑO
                        </button>
                    </div>
                )}

                {/* Contenedor scrolleable de herramientas */}
                <div className="flex flex-col flex-1 py-4 overflow-y-auto custom-scrollbar">

                    {/* ================= TAB 1: PÁGINAS ================= */}
                    {activeTab === 'pages' && (
                        <div className={`${!sidebarOpen && 'flex flex-col items-center'} px-3`}>

                            <div className="mb-6 border-b border-gray-800 pb-4">
                                <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Importar Datos</p>
                                <label className="flex items-center w-full p-2.5 rounded bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-800/50 transition cursor-pointer">
                                    <Upload className="w-5 h-5 min-w-[20px]" />
                                    {sidebarOpen && <span className="ml-3 text-sm font-semibold">Subir Excel de Aves</span>}
                                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
                                </label>
                            </div>

                            <p className={`text-xs uppercase tracking-wider text-gray-600 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Agregar Nueva</p>
                            <button onClick={() => handleAddPage('portada')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1">
                                <Square className="w-5 h-5 min-w-[20px] text-emerald-400" />
                                {sidebarOpen && <span className="ml-3 text-sm">Portada / Título</span>}
                            </button>
                            <button onClick={() => handleAddPage('ave')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1">
                                <FileText className="w-5 h-5 min-w-[20px] text-blue-400" />
                                {sidebarOpen && <span className="ml-3 text-sm">Ficha de Ave</span>}
                            </button>
                            <button onClick={() => handleAddPage('foto')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1">
                                <ImageIcon className="w-5 h-5 min-w-[20px] text-purple-400" />
                                {sidebarOpen && <span className="ml-3 text-sm">Página de Foto</span>}
                            </button>
                            <button onClick={() => handleAddPage('blanco')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition">
                                <Layout className="w-5 h-5 min-w-[20px] text-gray-400" />
                                {sidebarOpen && <span className="ml-3 text-sm">Página en Blanco</span>}
                            </button>
                        </div>
                    )}

                    {/* ================= TAB 2: CONTENIDO ================= */}
                    {activeTab === 'content' && sidebarOpen && currentPage && (
                        <div className="px-4">
                            <div className="mb-4 bg-gray-800 p-3 rounded flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Editando Textos</p>
                                    <p className="font-bold text-white capitalize">Pág. {currentPageIndex + 1}: {currentPage.tipo}</p>
                                </div>
                                <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded" title="Eliminar Página">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {currentPage.tipo === 'portada' && (
                                <div className="space-y-1">
                                    <TextInput label="Título Principal" value={currentPage.config.titulo} onChange={(val) => updateCurrentPageConfig('titulo', val)} />
                                    <TextInput label="Subtítulo" value={currentPage.config.subtitulo} onChange={(val) => updateCurrentPageConfig('subtitulo', val)} />
                                </div>
                            )}

                            {currentPage.tipo === 'ave' && (
                                <div className="space-y-1">
                                    <TextInput label="Nombre Común" value={currentPage.config.nombreComun} onChange={(val) => updateCurrentPageConfig('nombreComun', val)} />
                                    <TextInput label="Nombre Científico" value={currentPage.config.nombreCientifico} onChange={(val) => updateCurrentPageConfig('nombreCientifico', val)} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput label="Orden" value={currentPage.config.orden} onChange={(val) => updateCurrentPageConfig('orden', val)} />
                                        <TextInput label="Familia" value={currentPage.config.familia} onChange={(val) => updateCurrentPageConfig('familia', val)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput label="NOM 059" value={currentPage.config.nom059} onChange={(val) => updateCurrentPageConfig('nom059', val)} />
                                        <TextInput label="IUCN" value={currentPage.config.iucn} onChange={(val) => updateCurrentPageConfig('iucn', val)} />
                                    </div>
                                    <TextInput label="Longitud / Tamaño" value={currentPage.config.longitud} onChange={(val) => updateCurrentPageConfig('longitud', val)} />
                                    <TextInput label="Hábitat" value={currentPage.config.habitat} onChange={(val) => updateCurrentPageConfig('habitat', val)} />
                                    <TextInput label="Alimentación" value={currentPage.config.alimentacion} onChange={(val) => updateCurrentPageConfig('alimentacion', val)} />
                                    <TextInput label="Canto y Llamado" value={currentPage.config.canto} onChange={(val) => updateCurrentPageConfig('canto', val)} />
                                    <TextInput label="Dimorfismo" value={currentPage.config.dimorfismo} onChange={(val) => updateCurrentPageConfig('dimorfismo', val)} isTextArea />
                                    <TextInput label="Descripción" value={currentPage.config.descripcion} onChange={(val) => updateCurrentPageConfig('descripcion', val)} isTextArea />
                                </div>
                            )}

                            {(currentPage.tipo === 'foto' || currentPage.tipo === 'blanco') && (
                                <div className="text-center p-6 text-gray-500 text-sm">
                                    Esta página no contiene campos de texto editables. Ve a la pestaña de <b>Diseño</b> para modificarla.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= TAB 3: DISEÑO ================= */}
                    {activeTab === 'design' && sidebarOpen && currentPage && (
                        <div>
                            <div className="px-4 mb-2 flex justify-between items-center bg-gray-800 p-3 mx-4 rounded">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Editando Estilos</p>
                                    <p className="font-bold text-white capitalize">Pág. {currentPageIndex + 1}: {currentPage.tipo}</p>
                                </div>
                                <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded" title="Eliminar Página">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <ControlPanel title="Colores">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-sm text-gray-400">Fondo</label>
                                    <input type="color" value={currentPage.config.backgroundColor || '#ffffff'} onChange={(e) => updateCurrentPageConfig('backgroundColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" />
                                </div>
                                {(currentPage.tipo === 'ave' || currentPage.tipo === 'portada') && (
                                    <>
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-sm text-gray-400">Texto Principal</label>
                                            <input type="color" value={currentPage.config.textColor || '#1f2937'} onChange={(e) => updateCurrentPageConfig('textColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" />
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-sm text-gray-400">Iconos / Acentos</label>
                                            <input type="color" value={currentPage.config.themeColor || '#3b82f6'} onChange={(e) => updateCurrentPageConfig('themeColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" />
                                        </div>
                                    </>
                                )}
                            </ControlPanel>

                            {(currentPage.tipo === 'ave' || currentPage.tipo === 'foto') && (
                                <ControlPanel title="Imagen">
                                    <button onClick={() => updateCurrentPageConfig('imageSrc', prompt('Pega la URL de la imagen:'))} className="flex items-center justify-center w-full p-2 bg-gray-700 rounded text-sm hover:bg-gray-600 mb-3 text-white">
                                        <Upload className="w-4 h-4 mr-2" /> Subir/Cambiar Foto
                                    </button>
                                    <label className="text-sm text-gray-400 block mb-1">Opacidad (Transparencia)</label>
                                    <div className="flex items-center gap-2">
                                        <Droplets className="w-4 h-4 text-gray-600" />
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={currentPage.config.imageOpacity !== undefined ? currentPage.config.imageOpacity : 1}
                                            onChange={(e) => updateCurrentPageConfig('imageOpacity', parseFloat(e.target.value))}
                                            className="w-full h-1 accent-emerald-500 cursor-pointer"
                                        />
                                    </div>
                                </ControlPanel>
                            )}

                            {currentPage.tipo === 'portada' && (
                                <ControlPanel title="Alineación Título">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => updateCurrentPageConfig('layout', 'left')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.layout !== 'center' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Abajo Izq.</button>
                                        <button onClick={() => updateCurrentPageConfig('layout', 'center')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.layout === 'center' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}><AlignCenter className="w-4 h-4 mr-2" /> Centro</button>
                                    </div>
                                </ControlPanel>
                            )}
                        </div>
                    )}
                </div>

                {/* Botón Guardar Nube */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center p-4 transition mt-auto justify-center shrink-0 ${isSaving ? 'bg-emerald-800 text-gray-300 cursor-not-allowed' : 'hover:bg-emerald-600 bg-emerald-700 text-white'}`}
                >
                    <Save className="w-5 h-5 min-w-[20px]" />
                    {sidebarOpen && <span className="ml-3 text-sm font-bold">{isSaving ? 'Guardando...' : 'Guardar en Nube'}</span>}
                </button>
            </div>

            {/* ÁREA DE TRABAJO */}
            <div className="flex-1 flex flex-col relative overflow-auto">
                <div className="min-h-full p-8 flex flex-col items-center justify-center print:p-0 print:bg-white">

                    {/* Navegador de páginas (Burbujas) */}
                    <div className="flex flex-wrap justify-center gap-2 mb-6 bg-white p-2 rounded-full shadow print:hidden max-w-3xl">
                        {pages.map((p, idx) => (
                            <button
                                key={p.id}
                                onClick={() => setCurrentPageIndex(idx)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition ${idx === currentPageIndex ? 'bg-gray-900 text-white scale-110 shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    {/* Renderizador de la página */}
                    <div className="transition-all duration-300 transform scale-100 origin-center print:scale-100">
                        <PageRenderer pageData={pages[currentPageIndex]} />
                    </div>

                    <p className="text-xs text-gray-500 mt-6 print:hidden">Libro: {bookTitle} | Página {currentPageIndex + 1} de {pages.length}</p>
                </div>
            </div>

        </div>
    );
}