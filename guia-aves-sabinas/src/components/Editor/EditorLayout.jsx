import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Menu, Upload, Save, ArrowLeft, FileText,
    Square, Palette, Layers3, Droplets, AlignCenter, Layout,
    Trash2, FileEdit, Book, Image as ImageIcon, Link as LinkIcon, FileCheck, Printer, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import PageRenderer from './PageRenderer';

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

export default function EditorLayout() {
    const { bookId } = useParams();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('pages'); // pages, content, design, print
    const [isSaving, setIsSaving] = useState(false);

    const [bookTitle, setBookTitle] = useState("Cargando...");
    const [bookSize, setBookSize] = useState("trade"); // Por defecto Trade Paperback para imprenta
    const [pages, setPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Estados de Configuración de Imprenta
    const [printSettings, setPrintSettings] = useState({
        showBleed: false,
        showMargins: false,
        splitPages: false
    });

    useEffect(() => {
        const loadBookFromFirebase = async () => {
            if (!bookId) return;
            try {
                const docRef = doc(db, "libros", bookId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBookTitle(data.titulo || "Sin título");
                    setBookSize(data.bookSize || "trade");
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

    const updatePrintSettings = (key, value) => {
        setPrintSettings(prev => ({ ...prev, [key]: value }));
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
            config: { backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1, imagePosition: 'left', showCornerCircle: true, titlePosition: 'data', titleBgOpacity: 0.6, titleBgColor: '#000000' }
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
                    backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1, imagePosition: 'left', showCornerCircle: true, titlePosition: 'data', titleBgOpacity: 0.6, titleBgColor: '#000000',
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
        e.target.value = null;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, "libros", bookId);
            await setDoc(docRef, {
                titulo: bookTitle,
                bookSize: bookSize,
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

    const handlePrint = () => {
        // Forzamos la vista de páginas sueltas antes de imprimir la Tripa
        updatePrintSettings('splitPages', true);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    return (
        <div className="flex h-screen bg-gray-200 overflow-hidden font-sans">

            {/* MENÚ LATERAL IZQUIERDO */}
            <div className={`bg-[#111827] text-gray-300 transition-all duration-300 flex flex-col z-20 ${sidebarOpen ? 'w-[320px]' : 'w-16'}`}>

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

                {/* Tabs de navegación ampliados */}
                {sidebarOpen && (
                    <div className="flex border-b border-gray-800 text-[9px] font-bold tracking-wider shrink-0">
                        <button onClick={() => setActiveTab('pages')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'pages' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <Layers3 className="w-4 h-4" /> PÁGINAS
                        </button>
                        <button onClick={() => setActiveTab('content')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'content' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <FileEdit className="w-4 h-4" /> CONTENIDO
                        </button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'design' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                            <Palette className="w-4 h-4" /> DISEÑO
                        </button>
                        <button onClick={() => setActiveTab('print')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'print' ? 'bg-emerald-800 text-white' : 'hover:bg-gray-800'}`}>
                            <Printer className="w-4 h-4" /> IMPRENTA
                        </button>
                    </div>
                )}

                <div className="flex flex-col flex-1 py-4 overflow-y-auto custom-scrollbar">

                    {/* ================= TAB 1: PÁGINAS ================= */}
                    {activeTab === 'pages' && (
                        <div className={`${!sidebarOpen && 'flex flex-col items-center'} px-3`}>
                            <div className="mb-6 border-b border-gray-800 pb-4">
                                <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Formato del Libro</p>
                                {sidebarOpen && (
                                    <select
                                        value={bookSize}
                                        onChange={(e) => setBookSize(e.target.value)}
                                        className="w-full bg-gray-800 text-sm text-gray-200 p-2.5 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="trade">Trade Paperback (6x9")</option>
                                        <option value="letter">Carta / Letter (8.5x11")</option>
                                        <option value="standard">Pantalla Web</option>
                                    </select>
                                )}
                            </div>

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
                                <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded">
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
                                <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {currentPage.tipo === 'ave' && (
                                <ControlPanel title="Posición del Título">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => updateCurrentPageConfig('titlePosition', 'data')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.titlePosition !== 'image' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>En Datos</button>
                                        <button onClick={() => updateCurrentPageConfig('titlePosition', 'image')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.titlePosition === 'image' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>En Foto</button>
                                    </div>

                                    {currentPage.config.titlePosition === 'image' && (
                                        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <label className="text-[11px] text-gray-400 font-bold uppercase">Color de Fondo</label>
                                                <input type="color" value={currentPage.config.titleBgColor || '#000000'} onChange={(e) => updateCurrentPageConfig('titleBgColor', e.target.value)} className="w-8 h-6 border-0 cursor-pointer bg-transparent" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-2 font-bold uppercase">Nivel de Transparencia</label>
                                                <div className="flex items-center gap-2">
                                                    <Droplets className="w-4 h-4 text-gray-500" />
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={currentPage.config.titleBgOpacity !== undefined ? currentPage.config.titleBgOpacity : 0.6}
                                                        onChange={(e) => updateCurrentPageConfig('titleBgOpacity', parseFloat(e.target.value))}
                                                        className="w-full h-1 accent-emerald-500 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </ControlPanel>
                            )}

                            {currentPage.tipo === 'ave' && (
                                <ControlPanel title="Estructura y Decoración">
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <button onClick={() => updateCurrentPageConfig('imagePosition', 'left')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.imagePosition !== 'right' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Foto Izquierda</button>
                                        <button onClick={() => updateCurrentPageConfig('imagePosition', 'right')} className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.imagePosition === 'right' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Foto Derecha</button>
                                    </div>

                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-2 bg-gray-800 p-2 rounded border border-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={currentPage.config.showCornerCircle !== false}
                                            onChange={(e) => updateCurrentPageConfig('showCornerCircle', e.target.checked)}
                                            className="accent-emerald-500 w-4 h-4"
                                        />
                                        Mostrar círculo en la esquina
                                    </label>
                                </ControlPanel>
                            )}

                            {currentPage.tipo === 'ave' && (
                                <ControlPanel title="Formato de Campos (Sangría vs Bloque)">
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'orden', label: 'Orden' },
                                            { id: 'familia', label: 'Familia' },
                                            { id: 'longitud', label: 'Longitud' },
                                            { id: 'nom059', label: 'NOM 059' },
                                            { id: 'iucn', label: 'IUCN' },
                                            { id: 'habitat', label: 'Hábitat' },
                                            { id: 'alimentacion', label: 'Alim.' },
                                            { id: 'canto', label: 'Canto' },
                                            { id: 'dimorfismo', label: 'Dimorf.' },
                                            { id: 'descripcion', label: 'Desc.' }
                                        ].map(f => (
                                            <label key={f.id} className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                                <span className="mb-1 text-gray-300 font-semibold truncate">{f.label}</span>
                                                <select
                                                    value={currentPage.config[`block_${f.id}`] !== undefined ? (currentPage.config[`block_${f.id}`] ? 'block' : 'inline') : (f.id === 'descripcion' ? 'block' : 'inline')}
                                                    onChange={(e) => updateCurrentPageConfig(`block_${f.id}`, e.target.value === 'block')}
                                                    className="bg-gray-900 border border-gray-600 rounded text-[10px] p-1 text-white focus:outline-none"
                                                >
                                                    <option value="inline">Lado (Sangría)</option>
                                                    <option value="block">Abajo (Bloque)</option>
                                                </select>
                                            </label>
                                        ))}
                                    </div>
                                </ControlPanel>
                            )}

                            {(currentPage.tipo === 'ave' || currentPage.tipo === 'foto') && (
                                <ControlPanel title="Imagen / Fotografía">
                                    <div className="flex items-center gap-2 mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                                        <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Pega aquí el link..."
                                            value={currentPage.config.imageSrc || ''}
                                            onChange={(e) => updateCurrentPageConfig('imageSrc', e.target.value)}
                                            className="bg-transparent text-sm text-white w-full focus:outline-none"
                                        />
                                    </div>
                                </ControlPanel>
                            )}
                        </div>
                    )}

                    {/* ================= TAB 4: IMPRENTA ================= */}
                    {activeTab === 'print' && sidebarOpen && (
                        <div className="px-4">
                            <div className="bg-emerald-900/40 border border-emerald-800 p-4 rounded-lg mb-4">
                                <div className="flex items-start gap-3 text-emerald-300 mb-2">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-xs font-bold uppercase tracking-wider">Aviso de Exportación</p>
                                </div>
                                <p className="text-[11px] text-emerald-100/70 text-justify leading-relaxed">
                                    Al generar el PDF desde el navegador, se guardará en <b>RGB</b>. Recuerda usar Acrobat o un conversor en línea para pasarlo a <b>CMYK (FOGRA39)</b> antes de entregarlo a la imprenta. Las fuentes sí se incrustarán automáticamente.
                                </p>
                            </div>

                            <ControlPanel title="Guías Visuales">
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer bg-gray-800 p-3 rounded border border-gray-700 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={printSettings.showBleed}
                                        onChange={(e) => updatePrintSettings('showBleed', e.target.checked)}
                                        className="accent-red-500 w-4 h-4"
                                    />
                                    Ver Sangría (Rebase 3mm)
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer bg-gray-800 p-3 rounded border border-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={printSettings.showMargins}
                                        onChange={(e) => updatePrintSettings('showMargins', e.target.checked)}
                                        className="accent-blue-500 w-4 h-4"
                                    />
                                    Ver Márgenes Seguros (1.5cm)
                                </label>
                            </ControlPanel>

                            <ControlPanel title="Formato de Exportación">
                                <p className="text-[11px] text-gray-400 mb-3">La imprenta requiere la "Tripa" (interiores) en páginas separadas, no en pliegos.</p>
                                <label className="flex items-center gap-2 text-sm text-emerald-400 font-bold cursor-pointer bg-gray-800 p-3 rounded border border-emerald-800/50">
                                    <input
                                        type="checkbox"
                                        checked={printSettings.splitPages}
                                        onChange={(e) => updatePrintSettings('splitPages', e.target.checked)}
                                        className="accent-emerald-500 w-4 h-4"
                                    />
                                    Modo "Páginas Sueltas"
                                </label>
                            </ControlPanel>

                            <button
                                onClick={handlePrint}
                                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2"
                            >
                                <Printer className="w-5 h-5" />
                                Preparar PDF (Tripa)
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center p-4 transition mt-auto justify-center shrink-0 ${isSaving ? 'bg-emerald-800 text-gray-300 cursor-not-allowed' : 'hover:bg-emerald-600 bg-emerald-700 text-white'}`}
                >
                    <Save className="w-5 h-5 min-w-[20px]" />
                    {sidebarOpen && <span className="ml-3 text-sm font-bold">{isSaving ? 'Guardando...' : 'Guardar en Nube'}</span>}
                </button>
            </div>

            {/* ÁREA DE TRABAJO CENTRAL */}
            <div className="flex-1 flex flex-col relative overflow-auto bg-gray-300 print:bg-white z-0">
                <div className="min-h-full p-8 flex flex-col items-center justify-center print:p-0">

                    {/* Renderizado de UNA sola página en pantalla */}
                    <div className="transition-all duration-300 transform scale-100 origin-center print:hidden shadow-2xl">
                        <PageRenderer pageData={pages[currentPageIndex]} bookSize={bookSize} printSettings={printSettings} />
                    </div>

                    {/* ESTE CONTENEDOR ESTÁ OCULTO EN PANTALLA, SOLO SE MUESTRA AL IMPRIMIR EL PDF COMPLETO */}
                    <div className="hidden print:block w-full">
                        {pages.map((p) => (
                            <PageRenderer key={`print-${p.id}`} pageData={p} bookSize={bookSize} printSettings={printSettings} />
                        ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-6 print:hidden font-mono bg-white/50 px-3 py-1 rounded">Libro: {bookTitle} | Formato: {bookSize}</p>
                </div>
            </div>

            {/* MENÚ LATERAL DERECHO (ÍNDICE DE PÁGINAS) */}
            <div className="w-64 bg-white border-l border-gray-300 flex flex-col shadow-2xl print:hidden z-10 shrink-0">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Índice
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{pages.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-100">
                    {pages.map((p, idx) => {
                        let pageName = p.tipo;
                        if (p.tipo === 'ave') pageName = p.config.nombreComun || 'Ave sin nombre';
                        if (p.tipo === 'portada') pageName = p.config.titulo || 'Portada';

                        return (
                            <button
                                key={p.id}
                                onClick={() => setCurrentPageIndex(idx)}
                                className={`w-full text-left flex flex-col p-3 rounded-lg transition border ${idx === currentPageIndex ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow'}`}
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${idx === currentPageIndex ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    Pág. {idx + 1} • {p.tipo}
                                </span>
                                <span className="text-sm font-semibold text-gray-800 capitalize truncate">
                                    {pageName}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}