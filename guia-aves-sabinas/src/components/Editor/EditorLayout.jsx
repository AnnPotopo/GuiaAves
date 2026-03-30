import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Menu, Upload, Save, ArrowLeft, FileText,
    Square, Palette, Layers3, Droplets, AlignCenter, Layout,
    Trash2, FileEdit, Book, Image as ImageIcon, Link as LinkIcon, FileCheck, Printer, AlertTriangle, BookOpen, FileDigit,
    Maximize, MoveHorizontal, MoveVertical, Loader2, FolderPlus, Settings2,
    ChevronUp, ChevronDown, GripVertical, ImagePlus, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../../firebase/config';
import PageRenderer from './PageRenderer';
import PrintEngine from './PrintEngine';

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
    const [activeTab, setActiveTab] = useState('pages');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [editorViewMode, setEditorViewMode] = useState('spread');

    const [bookTitle, setBookTitle] = useState("Cargando...");
    const [bookSize, setBookSize] = useState("trade");
    const [pages, setPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const [bookGroups, setBookGroups] = useState([{ id: 'default', name: 'Libro Principal' }]);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [pageNumberPosition, setPageNumberPosition] = useState('default');
    const [signatureSize, setSignatureSize] = useState(16);

    const [printSettings, setPrintSettings] = useState({
        showBleed: false,
        showMargins: false,
        splitPages: true,
        cropMarks: true,
        slugInfo: true
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
                    if (data.grupos) setBookGroups(data.grupos);
                    if (data.showPageNumbers !== undefined) setShowPageNumbers(data.showPageNumbers);
                    if (data.pageNumberPosition) setPageNumberPosition(data.pageNumberPosition);
                    if (data.signatureSize) setSignatureSize(data.signatureSize);
                } else {
                    alert("No se encontró este libro en la base de datos.");
                }
            } catch (error) {
                console.error("Error al cargar el libro:", error);
            }
        };
        loadBookFromFirebase();
    }, [bookId]);

    const pagesWithNumbers = React.useMemo(() => {
        let currentNum = 1;
        return pages.map(p => {
            const numPages = (p.tipo === 'ave' || p.tipo === 'portada') ? 2 : 1;
            const startNum = currentNum;
            currentNum += numPages;
            return { ...p, _startPageNum: startNum, _numPages: numPages };
        });
    }, [pages]);

    // CÁLCULO EN TIEMPO REAL DE LAS ESPECIES CONSOLIDADAS
    const consolidatedSpecies = React.useMemo(() => {
        const avesMap = {};
        pages.forEach(p => {
            if (p.tipo === 'ave') {
                const c = p.config || {};
                const birdName = (c.nombreCientifico || c.nombreComun || '').trim();
                if (!birdName) return;

                const safeId = birdName.toLowerCase().replace(/[^a-z0-9]/g, '_');

                if (!avesMap[safeId]) {
                    avesMap[safeId] = {
                        id: safeId,
                        nombreCientifico: c.nombreCientifico || '',
                        nombreComun: c.nombreComun || '',
                        orden: c.orden || '',
                        familia: c.familia || '',
                        nom059: c.nom059 || '',
                        iucn: c.iucn || '',
                        longitud: c.longitud || '',
                        habitat: c.habitat || '',
                        alimentacion: c.alimentacion || '',
                        canto: c.canto || '',
                        dimorfismo: c.dimorfismo || '',
                        descripcion: c.descripcion || '',
                        imagenUrl: c.imageSrc || ''
                    };
                } else {
                    const existing = avesMap[safeId];
                    if (!existing.nombreCientifico && c.nombreCientifico) existing.nombreCientifico = c.nombreCientifico;
                    if (!existing.nombreComun && c.nombreComun) existing.nombreComun = c.nombreComun;
                    if (!existing.orden && c.orden) existing.orden = c.orden;
                    if (!existing.familia && c.familia) existing.familia = c.familia;
                    if (!existing.nom059 && c.nom059) existing.nom059 = c.nom059;
                    if (!existing.iucn && c.iucn) existing.iucn = c.iucn;
                    if (!existing.longitud && c.longitud) existing.longitud = c.longitud;
                    if (!existing.habitat && c.habitat) existing.habitat = c.habitat;
                    if (!existing.alimentacion && c.alimentacion) existing.alimentacion = c.alimentacion;
                    if (!existing.canto && c.canto) existing.canto = c.canto;
                    if (!existing.dimorfismo && c.dimorfismo) existing.dimorfismo = c.dimorfismo;

                    if (!existing.imagenUrl && c.imageSrc) {
                        existing.imagenUrl = c.imageSrc;
                    }

                    if (c.descripcion) {
                        if (existing.descripcion && existing.descripcion !== c.descripcion && !existing.descripcion.includes(c.descripcion)) {
                            existing.descripcion = existing.descripcion + '\n\n' + c.descripcion;
                        } else if (!existing.descripcion) {
                            existing.descripcion = c.descripcion;
                        }
                    }
                }
            }
        });
        return Object.values(avesMap);
    }, [pages]);

    const currentPage = pagesWithNumbers[currentPageIndex] || null;

    const updateCurrentPageConfig = (key, value) => {
        setPages(prevPages => {
            const newPages = [...prevPages];
            newPages[currentPageIndex] = { ...currentPage, config: { ...currentPage.config, [key]: value } };
            return newPages;
        });
    };

    const updatePrintSettings = (key, value) => setPrintSettings(prev => ({ ...prev, [key]: value }));

    const handleAddGroup = () => setBookGroups([...bookGroups, { id: `g_${Date.now()}`, name: 'Nuevo Grupo' }]);

    const handleUpdateGroupName = (id, newName) => {
        setBookGroups(bookGroups.map(g => g.id === id ? { ...g, name: newName } : g));
    };

    const movePageUp = (index) => {
        if (index === 0) return;
        const newPages = [...pages];
        const temp = newPages[index - 1];
        newPages[index - 1] = newPages[index];
        newPages[index] = temp;
        setPages(newPages);
        setCurrentPageIndex(index - 1);
    };

    const movePageDown = (index) => {
        if (index === pages.length - 1) return;
        const newPages = [...pages];
        const temp = newPages[index + 1];
        newPages[index + 1] = newPages[index];
        newPages[index] = temp;
        setPages(newPages);
        setCurrentPageIndex(index + 1);
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => e.target.classList.add("opacity-50"), 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove("opacity-50");
        setDraggedIndex(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        const newPages = [...pages];
        const draggedPage = newPages[draggedIndex];
        newPages.splice(draggedIndex, 1);
        newPages.splice(targetIndex, 0, draggedPage);
        setPages(newPages);
        setCurrentPageIndex(targetIndex);
        setDraggedIndex(null);
    };

    const handleDeletePage = () => {
        if (pages.length <= 1) return alert("El libro debe tener al menos una página.");
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
            config: {
                groupId: 'default', backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6',
                imageOpacity: 1, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, imageFit: 'cover', imagePosition: 'left',
                showCornerCircle: true, showPlaceholderBox: false, showCopyright: false, copyrightText: '', extraCopyrights: [],
                titlePosition: 'data', hideTitle: false, hidePageNumber: false, titleBgOpacity: 0.6, titleBgColor: '#000000',
                fontFamily: 'system-ui, sans-serif', fontSize: '11pt', lineHeight: '1.625', marginSize: '15mm',
                dataImages: [], extraImages: [], galleryLayout: 'single',
                insideBgColor: '#ffffff', insideImageOpacity: 1, insideImageScale: 1, insideImageOffsetX: 0, insideImageOffsetY: 0, insideImageFit: 'cover'
            }
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
            const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: 'binary' }).Sheets[XLSX.read(evt.target.result, { type: 'binary' }).SheetNames[0]]);
            const newPagesFromExcel = data.map((row, index) => ({
                id: `excel-${Date.now()}-${index}`, tipo: 'ave',
                config: {
                    groupId: 'default', backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, imageFit: 'cover', imagePosition: 'left', showCornerCircle: true, showPlaceholderBox: false, showCopyright: false, copyrightText: '', extraCopyrights: [], titlePosition: 'data', hideTitle: false, hidePageNumber: false, titleBgOpacity: 0.6, titleBgColor: '#000000', fontFamily: 'system-ui, sans-serif', fontSize: '11pt', lineHeight: '1.625', marginSize: '15mm', dataImages: [], extraImages: [], galleryLayout: 'single',
                    nombreCientifico: row['Nombre cientifico'] || row['Nombre Cientifico'] || '', nombreComun: row['Nombre Comun'] || row['Nombre común'] || '',
                    orden: row['Orden'] || '', familia: row['Familia'] || '', iucn: row['Estado de conservación (IUCN)'] || '', nom059: row['Estado de conservación (NOM 059)'] || '',
                    descripcion: row['Descripción'] || row['Descripcion'] || '', dimorfismo: row['Dimorfismo'] || '', longitud: row['Longitud'] || '',
                    canto: row['Canto y llamado'] || '', habitat: row['Hábitat'] || row['Habitat'] || '', alimentacion: row['Alimentación'] || row['Alimentacion'] || ''
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
            await setDoc(doc(db, "libros", bookId), {
                titulo: bookTitle,
                bookSize: bookSize,
                paginas: pages,
                grupos: bookGroups,
                showPageNumbers,
                pageNumberPosition,
                signatureSize,
                fechaActualizacion: new Date().toLocaleDateString()
            }, { merge: true });

            // GUARDADO FUSIÓN DE ESPECIES EN FIREBASE
            const savePromises = consolidatedSpecies.map(aveData =>
                setDoc(doc(db, "especies", aveData.id), aveData, { merge: true })
            );
            await Promise.all(savePromises);

            alert(`¡Libro y Base de Datos de Especies guardados con éxito!`);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => setTimeout(() => { window.print(); }, 500);

    const handleImageUploadGeneric = async (e, configKey) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingImage(true);
        try {
            const options = { maxSizeMB: 2.0, maxWidthOrHeight: 2700, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85 };
            const compressedFile = await imageCompression(file, options);
            const fileName = `${Date.now()}_comprimida.jpg`;
            const storageRef = ref(storage, `libros/${bookId}/${fileName}`);
            await uploadBytes(storageRef, compressedFile);
            const downloadURL = await getDownloadURL(storageRef);
            updateCurrentPageConfig(configKey, downloadURL);
        } catch (error) { alert("Error al procesar foto."); } finally { setIsUploadingImage(false); e.target.value = null; }
    };

    const handleImageUpload = async (e) => {
        handleImageUploadGeneric(e, 'imageSrc');
    };

    const getImposedSpreads = () => {
        const spreads = [];

        bookGroups.forEach((group, groupIndex) => {
            const groupPagesWithNumbers = pagesWithNumbers.filter(p => (p.config.groupId || 'default') === group.id);
            if (groupPagesWithNumbers.length === 0) return;

            const phys = [];
            groupPagesWithNumbers.forEach(p => {
                if (p.tipo === 'ave') {
                    const isImageRight = p.config.imagePosition === 'right';
                    phys.push({ parent: p, forceHalf: isImageRight ? 'data' : 'image', pageNum: p._startPageNum });
                    phys.push({ parent: p, forceHalf: isImageRight ? 'image' : 'data', pageNum: p._startPageNum + 1 });
                } else if (p.tipo === 'portada') {
                    phys.push({ parent: p, forceHalf: 'front', pageNum: p._startPageNum });
                    phys.push({ parent: p, forceHalf: 'inside', pageNum: p._startPageNum + 1 });
                } else {
                    phys.push({ parent: p, forceHalf: null, pageNum: p._startPageNum });
                }
            });

            let N = phys.length;
            const remainder = N % 4;
            if (remainder !== 0) {
                const padCount = 4 - remainder;
                for (let i = 0; i < padCount; i++) {
                    phys.push({ isBlankPad: true, pageNum: '-' });
                }
            }

            N = phys.length;
            const totalHojas = N / 4;

            for (let i = 1; i <= totalHojas; i++) {
                spreads.push({ left: phys[N - 2 * i + 1], right: phys[2 * i - 2], sigIndex: groupIndex + 1, sheetIndex: i, side: 'Frente' });
                spreads.push({ left: phys[2 * i - 1], right: phys[N - 2 * i], sigIndex: groupIndex + 1, sheetIndex: i, side: 'Atrás' });
            }
        });
        return spreads;
    };

    return (
        <>
            <div className="flex h-screen bg-gray-200 overflow-hidden font-sans print:hidden">

                <div className={`bg-[#111827] text-gray-300 transition-all duration-300 flex flex-col z-20 ${sidebarOpen ? 'w-[320px]' : 'w-16'}`}>
                    <div className="flex flex-col border-b border-gray-800">
                        <div className="flex items-center justify-between p-4">
                            {sidebarOpen && (
                                <button onClick={() => navigate('/')} className="hover:text-white flex items-center text-sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                                </button>
                            )}
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

                    {sidebarOpen && (
                        <div className="flex border-b border-gray-800 text-[9px] font-bold tracking-wider shrink-0">
                            <button onClick={() => setActiveTab('pages')} className={`flex-1 p-2 md:p-3 flex flex-col items-center gap-1 ${activeTab === 'pages' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                                <Layers3 className="w-4 h-4" /> PÁGINAS
                            </button>
                            <button onClick={() => setActiveTab('content')} className={`flex-1 p-2 md:p-3 flex flex-col items-center gap-1 ${activeTab === 'content' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                                <FileEdit className="w-4 h-4" /> CONTENIDO
                            </button>
                            <button onClick={() => setActiveTab('design')} className={`flex-1 p-2 md:p-3 flex flex-col items-center gap-1 ${activeTab === 'design' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}>
                                <Palette className="w-4 h-4" /> DISEÑO
                            </button>
                            {/* NUEVO BOTON PARA BASE DE DATOS */}
                            <button onClick={() => setActiveTab('database')} className={`flex-1 p-2 md:p-3 flex flex-col items-center gap-1 ${activeTab === 'database' ? 'bg-emerald-800 text-white' : 'hover:bg-gray-800'}`}>
                                <Database className="w-4 h-4" /> DATOS
                            </button>
                            <button onClick={() => setActiveTab('print')} className={`flex-1 p-2 md:p-3 flex flex-col items-center gap-1 ${activeTab === 'print' ? 'bg-blue-800 text-white' : 'hover:bg-gray-800'}`}>
                                <Printer className="w-4 h-4" /> IMPRENTA
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col flex-1 py-4 overflow-y-auto custom-scrollbar">

                        {activeTab === 'database' && sidebarOpen && (
                            <div className="px-4 py-2">
                                <div className="bg-emerald-900/30 border border-emerald-800 p-4 rounded-lg text-center">
                                    <Database className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <h3 className="text-emerald-100 font-bold text-sm">Visor de Pokedex</h3>
                                    <p className="text-[10px] text-emerald-200/70 mt-1">
                                        Aquí puedes ver cómo se consolidan las fichas múltiples en una sola base de datos de especies.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pages' && (
                            <div className={`${!sidebarOpen && 'flex flex-col items-center'} px-3`}>
                                <div className="mb-6 border-b border-gray-800 pb-4">
                                    <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Asignar Grupo (Bonche)</p>
                                    {sidebarOpen && (
                                        <select
                                            value={currentPage?.config.groupId || 'default'}
                                            onChange={(e) => updateCurrentPageConfig('groupId', e.target.value)}
                                            className="w-full bg-gray-800 text-sm text-gray-200 p-2.5 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none mb-4"
                                        >
                                            {bookGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    )}
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
                                        {sidebarOpen && <span className="ml-3 text-sm font-semibold">Subir Excel</span>}
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

                        {activeTab === 'content' && sidebarOpen && currentPage && (
                            <div className="px-4">
                                <div className="mb-4 bg-gray-800 p-3 rounded flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Editando Textos</p>
                                        <p className="font-bold text-white capitalize">Pág. {currentPage._startPageNum}: {currentPage.tipo}</p>
                                    </div>
                                    <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {currentPage.tipo === 'portada' && (
                                    <div className="space-y-1">
                                        <TextInput label="Título" value={currentPage.config.titulo} onChange={(val) => updateCurrentPageConfig('titulo', val)} />
                                        <TextInput label="Subtítulo" value={currentPage.config.subtitulo} onChange={(val) => updateCurrentPageConfig('subtitulo', val)} />
                                    </div>
                                )}

                                {currentPage.tipo === 'foto' && (
                                    <div className="space-y-1">
                                        <TextInput label="Título de la Página (Opcional)" value={currentPage.config.titulo} onChange={(val) => updateCurrentPageConfig('titulo', val)} />
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
                                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                                <span className="mb-1 text-gray-300 font-semibold">NOM 059</span>
                                                <select
                                                    value={currentPage.config.nom059 || ''}
                                                    onChange={(e) => updateCurrentPageConfig('nom059', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                                >
                                                    <option value="">(Vacío)</option>
                                                    <option value="No listada">No listada</option>
                                                    <option value="Protección especial (Pr)">Protección especial (Pr)</option>
                                                    <option value="Amenazada (A)">Amenazada (A)</option>
                                                    <option value="En Peligro (P)">En Peligro (P)</option>
                                                    <option value="Probablemente Extinta (E)">Probablemente Extinta (E)</option>
                                                </select>
                                            </label>
                                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                                <span className="mb-1 text-gray-300 font-semibold">IUCN</span>
                                                <select
                                                    value={currentPage.config.iucn || ''}
                                                    onChange={(e) => updateCurrentPageConfig('iucn', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                                >
                                                    <option value="">(Vacío)</option>
                                                    <option value="No evaluada (NE)">No evaluada (NE)</option>
                                                    <option value="Datos insuficientes (DD)">Datos insuficientes (DD)</option>
                                                    <option value="Preocupación menor (LC)">Preocupación menor (LC)</option>
                                                    <option value="Casi amenazada (NT)">Casi amenazada (NT)</option>
                                                    <option value="Vulnerable (VU)">Vulnerable (VU)</option>
                                                    <option value="En peligro (EN)">En peligro (EN)</option>
                                                    <option value="Peligro crítico (CR)">Peligro crítico (CR)</option>
                                                    <option value="Extinta en estado silvestre (EW)">Ext. silvestre (EW)</option>
                                                    <option value="Extinta (EX)">Extinta (EX)</option>
                                                </select>
                                            </label>
                                        </div>

                                        <TextInput label="Longitud" value={currentPage.config.longitud} onChange={(val) => updateCurrentPageConfig('longitud', val)} />
                                        <TextInput label="Hábitat" value={currentPage.config.habitat} onChange={(val) => updateCurrentPageConfig('habitat', val)} />
                                        <TextInput label="Alimentación" value={currentPage.config.alimentacion} onChange={(val) => updateCurrentPageConfig('alimentacion', val)} />
                                        <TextInput label="Canto y Llamado" value={currentPage.config.canto} onChange={(val) => updateCurrentPageConfig('canto', val)} />
                                        <TextInput label="Dimorfismo" value={currentPage.config.dimorfismo} onChange={(val) => updateCurrentPageConfig('dimorfismo', val)} isTextArea />
                                        <TextInput label="Descripción" value={currentPage.config.descripcion} onChange={(val) => updateCurrentPageConfig('descripcion', val)} isTextArea />

                                        <ControlPanel title="Imágenes en Descripción">
                                            <button
                                                onClick={() => {
                                                    const currentDataImages = currentPage.config.dataImages || [];
                                                    updateCurrentPageConfig('dataImages', [...currentDataImages, {
                                                        url: '', caption: '', align: 'center', textMode: 'caption',
                                                        textVerticalAlign: 'center', scale: 1, offsetX: 0, offsetY: 0,
                                                        paddingTop: 'mt-0', paddingBottom: 'mb-4', widthSize: '60%',
                                                        captionFontSize: '10px', captionFontFamily: 'inherit'
                                                    }]);
                                                }}
                                                className="w-full bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition"
                                            >
                                                <ImagePlus className="w-4 h-4" /> Añadir Imagen Extra
                                            </button>

                                            {(currentPage.config.dataImages || []).map((img, idx) => (
                                                <div key={idx} className="bg-gray-800 p-2 rounded mt-2 border border-gray-700 relative">
                                                    <button
                                                        onClick={() => {
                                                            const newArr = [...currentPage.config.dataImages];
                                                            newArr.splice(idx, 1);
                                                            updateCurrentPageConfig('dataImages', newArr);
                                                        }}
                                                        className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>

                                                    <p className="text-[10px] text-gray-500 mb-2 font-bold">Imagen {idx + 1}</p>

                                                    <input
                                                        type="text"
                                                        placeholder="Link de la imagen..."
                                                        value={img.url}
                                                        onChange={(e) => {
                                                            const newArr = [...currentPage.config.dataImages];
                                                            newArr[idx].url = e.target.value;
                                                            updateCurrentPageConfig('dataImages', newArr);
                                                        }}
                                                        className="w-full bg-gray-900 text-xs text-white p-1.5 rounded mb-2 border border-gray-700 focus:outline-none"
                                                    />

                                                    <textarea
                                                        placeholder="Texto o Pie de foto..."
                                                        value={img.caption}
                                                        onChange={(e) => {
                                                            const newArr = [...currentPage.config.dataImages];
                                                            newArr[idx].caption = e.target.value;
                                                            updateCurrentPageConfig('dataImages', newArr);
                                                        }}
                                                        className="w-full bg-gray-900 text-xs text-white p-1.5 rounded mb-2 border border-gray-700 focus:outline-none min-h-[50px] whitespace-pre-wrap break-words"
                                                    />

                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Fuente del texto</label>
                                                            <select
                                                                value={img.captionFontFamily || 'inherit'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].captionFontFamily = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="inherit">Misma del libro</option>
                                                                <option value="'Arial', sans-serif">Arial</option>
                                                                <option value="'Georgia', serif">Georgia</option>
                                                                <option value="'Times New Roman', serif">Times New Roman</option>
                                                                <option value="'Courier New', monospace">Courier New</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Tamaño de letra</label>
                                                            <select
                                                                value={img.captionFontSize || '10px'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].captionFontSize = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="8px">8px (Muy pequeño)</option>
                                                                <option value="9px">9px (Pequeño)</option>
                                                                <option value="10px">10px (Normal)</option>
                                                                <option value="11px">11px (Grande)</option>
                                                                <option value="12px">12px (Muy grande)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Alineación Horizontal</label>
                                                            <select
                                                                value={img.align}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].align = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="center">Alinear Centro</option>
                                                                <option value="left">Alinear Izquierda</option>
                                                                <option value="right">Alinear Derecha</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Modo del Texto</label>
                                                            <select
                                                                value={img.textMode || 'caption'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].textMode = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="caption">Pie de foto (Abajo)</option>
                                                                <option value="side">Texto a su lado</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {img.textMode === 'side' && (
                                                        <div className="mb-2">
                                                            <label className="text-[10px] text-gray-400 block mb-1">Alineación Vertical del Texto</label>
                                                            <select
                                                                value={img.textVerticalAlign || 'center'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].textVerticalAlign = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none mb-2"
                                                            >
                                                                <option value="top">Texto alineado Arriba</option>
                                                                <option value="center">Texto alineado al Centro</option>
                                                                <option value="bottom">Texto alineado Abajo</option>
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div className="mb-2">
                                                        <label className="text-[10px] text-gray-400 block mb-1">Tamaño de Imagen</label>
                                                        <select
                                                            value={img.widthSize || (img.textMode === 'side' ? '45%' : '60%')}
                                                            onChange={(e) => {
                                                                const newArr = [...currentPage.config.dataImages];
                                                                newArr[idx].widthSize = e.target.value;
                                                                updateCurrentPageConfig('dataImages', newArr);
                                                            }}
                                                            className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                        >
                                                            <option value="25%">Pequeño (25%)</option>
                                                            <option value="33%">Tercio (33%)</option>
                                                            <option value="45%">Casi mitad (45%)</option>
                                                            <option value="50%">Mitad (50%)</option>
                                                            <option value="60%">Normal (60%)</option>
                                                            <option value="75%">Grande (75%)</option>
                                                            <option value="100%">Ancho Completo (100%)</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Espaciado Superior</label>
                                                            <select
                                                                value={img.paddingTop || 'mt-0'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].paddingTop = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="mt-0">Nada (0)</option>
                                                                <option value="mt-2">Poco</option>
                                                                <option value="mt-4">Normal</option>
                                                                <option value="mt-8">Bastante</option>
                                                                <option value="mt-12">Mucho</option>
                                                                <option value="mt-16">Gigante</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-gray-400 block mb-1">Espaciado Inferior</label>
                                                            <select
                                                                value={img.paddingBottom || img.padding || 'mb-4'}
                                                                onChange={(e) => {
                                                                    const newArr = [...currentPage.config.dataImages];
                                                                    newArr[idx].paddingBottom = e.target.value;
                                                                    updateCurrentPageConfig('dataImages', newArr);
                                                                }}
                                                                className="w-full bg-gray-900 text-[10px] text-gray-300 p-1.5 rounded border border-gray-700 focus:outline-none"
                                                            >
                                                                <option value="mb-0">Nada (0)</option>
                                                                <option value="mb-2">Poco</option>
                                                                <option value="mb-4">Normal</option>
                                                                <option value="mb-8">Bastante</option>
                                                                <option value="mb-12">Mucho</option>
                                                                <option value="mb-16">Gigante</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2 bg-gray-900 p-2 rounded">
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                <span>Zoom</span><span>{img.scale || 1}x</span>
                                                            </label>
                                                            <input type="range" min="0.5" max="3" step="0.05" value={img.scale || 1} onChange={(e) => { const newArr = [...currentPage.config.dataImages]; newArr[idx].scale = parseFloat(e.target.value); updateCurrentPageConfig('dataImages', newArr); }} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                <span>Eje X</span><span>{img.offsetX || 0}%</span>
                                                            </label>
                                                            <input type="range" min="-100" max="100" step="1" value={img.offsetX || 0} onChange={(e) => { const newArr = [...currentPage.config.dataImages]; newArr[idx].offsetX = parseFloat(e.target.value); updateCurrentPageConfig('dataImages', newArr); }} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                <span>Eje Y</span><span>{img.offsetY || 0}%</span>
                                                            </label>
                                                            <input type="range" min="-100" max="100" step="1" value={img.offsetY || 0} onChange={(e) => { const newArr = [...currentPage.config.dataImages]; newArr[idx].offsetY = parseFloat(e.target.value); updateCurrentPageConfig('dataImages', newArr); }} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </ControlPanel>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'design' && sidebarOpen && currentPage && (
                            <div>
                                <div className="px-4 mb-2 flex justify-between items-center bg-gray-800 p-3 mx-4 rounded">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Editando Estilos</p>
                                        <p className="font-bold text-white capitalize">Pág. {currentPage._startPageNum}: {currentPage.tipo}</p>
                                    </div>
                                    <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <ControlPanel title="Tipografía y Diseño de Página">
                                    <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer mb-2 bg-gray-800 p-2 rounded border border-gray-700 w-full">
                                        <input
                                            type="checkbox"
                                            checked={currentPage.config.hidePageNumber || false}
                                            onChange={(e) => updateCurrentPageConfig('hidePageNumber', e.target.checked)}
                                            className="accent-emerald-500 w-4 h-4"
                                        />
                                        No mostrar número de pág. (Sólo en esta página)
                                    </label>
                                    <div className="flex items-center justify-between gap-2 mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                                        <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer w-full">
                                            <input
                                                type="checkbox"
                                                checked={showPageNumbers}
                                                onChange={(e) => setShowPageNumbers(e.target.checked)}
                                                className="accent-emerald-500 w-4 h-4"
                                            />
                                            Num. de Pág. Global
                                        </label>
                                        <select
                                            value={pageNumberPosition}
                                            onChange={(e) => setPageNumberPosition(e.target.value)}
                                            disabled={!showPageNumbers}
                                            className="bg-gray-900 border border-gray-600 rounded text-[10px] p-1 text-white focus:outline-none w-1/2"
                                        >
                                            <option value="default">Alternado (Exterior)</option>
                                            <option value="inner">Alternado (Interior Lomo)</option>
                                            <option value="left">Siempre Izq.</option>
                                            <option value="center">Centro</option>
                                            <option value="right">Siempre Der.</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                            <span className="mb-1 text-gray-300 font-semibold">Fuente (Tipografía)</span>
                                            <select
                                                value={currentPage.config.fontFamily || 'system-ui, sans-serif'}
                                                onChange={(e) => updateCurrentPageConfig('fontFamily', e.target.value)}
                                                className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                            >
                                                <option value="system-ui, sans-serif">Moderna (Sans-Serif)</option>
                                                <option value="'Arial', sans-serif">Arial</option>
                                                <option value="'Helvetica', sans-serif">Helvetica</option>
                                                <option value="'Verdana', sans-serif">Verdana</option>
                                                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                                <option value="'Georgia', serif">Clásica Editorial (Georgia)</option>
                                                <option value="'Times New Roman', serif">Times New Roman</option>
                                                <option value="'Garamond', serif">Garamond</option>
                                                <option value="'Courier New', monospace">Técnica (Courier New)</option>
                                            </select>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                                <span className="mb-1 text-gray-300 font-semibold">Tamaño Letra</span>
                                                <select
                                                    value={currentPage.config.fontSize || '11pt'}
                                                    onChange={(e) => updateCurrentPageConfig('fontSize', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                                >
                                                    <option value="9pt">9pt (Pequeño)</option>
                                                    <option value="10pt">10pt (Estándar)</option>
                                                    <option value="11pt">11pt (Cómodo)</option>
                                                    <option value="12pt">12pt (Grande)</option>
                                                </select>
                                            </label>
                                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                                <span className="mb-1 text-gray-300 font-semibold">Interlineado</span>
                                                <select
                                                    value={currentPage.config.lineHeight || '1.625'}
                                                    onChange={(e) => updateCurrentPageConfig('lineHeight', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                                >
                                                    <option value="1.2">Compacto (1.2)</option>
                                                    <option value="1.5">Normal (1.5)</option>
                                                    <option value="1.625">Relajado (1.6)</option>
                                                    <option value="2">Doble (2.0)</option>
                                                </select>
                                            </label>
                                        </div>
                                        <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                            <span className="mb-1 text-gray-300 font-semibold">Márgenes</span>
                                            <select
                                                value={currentPage.config.marginSize || '15mm'}
                                                onChange={(e) => updateCurrentPageConfig('marginSize', e.target.value)}
                                                className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                            >
                                                <option value="10mm">10mm (Estrecho)</option>
                                                <option value="15mm">15mm (Estándar)</option>
                                                <option value="20mm">20mm (Amplio)</option>
                                            </select>
                                        </label>
                                    </div>
                                </ControlPanel>

                                {currentPage.tipo === 'ave' && (
                                    <ControlPanel title="Posición del Título">
                                        <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={currentPage.config.hideTitle || false}
                                                onChange={(e) => updateCurrentPageConfig('hideTitle', e.target.checked)}
                                                className="accent-emerald-500 w-4 h-4"
                                            />
                                            Ocultar Título (No mostrar Nombres)
                                        </label>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => updateCurrentPageConfig('titlePosition', 'data')}
                                                className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.titlePosition !== 'image' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                En Datos
                                            </button>
                                            <button
                                                onClick={() => updateCurrentPageConfig('titlePosition', 'image')}
                                                className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.titlePosition === 'image' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                En Foto
                                            </button>
                                        </div>
                                        {currentPage.config.titlePosition === 'image' && (
                                            <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <label className="text-[11px] text-gray-400 font-bold uppercase">Color de Fondo</label>
                                                    <input
                                                        type="color"
                                                        value={currentPage.config.titleBgColor || '#000000'}
                                                        onChange={(e) => updateCurrentPageConfig('titleBgColor', e.target.value)}
                                                        className="w-8 h-6 border-0 cursor-pointer bg-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 block mb-2 font-bold uppercase">Transparencia</label>
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
                                            <button
                                                onClick={() => updateCurrentPageConfig('imagePosition', 'left')}
                                                className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.imagePosition !== 'right' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                Foto Izquierda
                                            </button>
                                            <button
                                                onClick={() => updateCurrentPageConfig('imagePosition', 'right')}
                                                className={`p-2 text-sm rounded flex items-center justify-center ${currentPage.config.imagePosition === 'right' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                Foto Derecha
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 mt-2 bg-gray-800 p-2 rounded border border-gray-700">
                                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={currentPage.config.showCornerCircle !== false} onChange={(e) => updateCurrentPageConfig('showCornerCircle', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                                                Mostrar círculo decorativo
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={currentPage.config.showPlaceholderBox || false} onChange={(e) => updateCurrentPageConfig('showPlaceholderBox', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                                                Mostrar etiqueta PLACEHOLDER
                                            </label>
                                        </div>
                                    </ControlPanel>
                                )}

                                {currentPage.tipo === 'portada' && (
                                    <ControlPanel title="Ajustes del Reverso (Página Par)">
                                        <div className="flex items-center justify-between gap-2 mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                                            <label className="text-sm text-gray-400">Color de Fondo (Reverso)</label>
                                            <input type="color" value={currentPage.config.insideBgColor || '#ffffff'} onChange={(e) => updateCurrentPageConfig('insideBgColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" />
                                        </div>

                                        <div className="bg-gray-800 p-2 rounded border border-gray-700 mb-3">
                                            <p className="text-[10px] text-gray-500 mb-2">Imagen del Reverso</p>
                                            <label className={`flex items-center justify-center w-full gap-2 p-1.5 rounded text-xs text-white cursor-pointer transition ${isUploadingImage ? 'bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-500'} mb-2 shadow`}>
                                                {isUploadingImage ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</> : <><Upload className="w-3 h-3" /> Subir Imagen Reverso</>}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadGeneric(e, 'insideImageSrc')} disabled={isUploadingImage} />
                                            </label>
                                            <div className="flex items-center gap-2 mb-2">
                                                <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <input type="text" placeholder="Link de foto..." value={currentPage.config.insideImageSrc || ''} onChange={(e) => updateCurrentPageConfig('insideImageSrc', e.target.value)} className="bg-gray-900 rounded p-1 text-xs text-white w-full focus:outline-none" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 mt-2 bg-gray-900 p-2 rounded">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[9px] text-gray-400">Modo de Ajuste</label>
                                                    <select value={currentPage.config.insideImageFit || 'cover'} onChange={(e) => updateCurrentPageConfig('insideImageFit', e.target.value)} className="bg-gray-800 border border-gray-600 rounded text-[9px] p-0.5 text-white focus:outline-none">
                                                        <option value="cover">Llenar</option>
                                                        <option value="contain">Ajustar Completa</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1"><span>Zoom</span><span>{currentPage.config.insideImageScale || 1}x</span></label>
                                                    <input type="range" min="0.5" max="3" step="0.05" value={currentPage.config.insideImageScale || 1} onChange={(e) => updateCurrentPageConfig('insideImageScale', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1"><span>Eje X</span><span>{currentPage.config.insideImageOffsetX || 0}%</span></label>
                                                    <input type="range" min="-100" max="100" step="1" value={currentPage.config.insideImageOffsetX || 0} onChange={(e) => updateCurrentPageConfig('insideImageOffsetX', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1"><span>Eje Y</span><span>{currentPage.config.insideImageOffsetY || 0}%</span></label>
                                                    <input type="range" min="-100" max="100" step="1" value={currentPage.config.insideImageOffsetY || 0} onChange={(e) => updateCurrentPageConfig('insideImageOffsetY', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Opacidad</span><span>{currentPage.config.insideImageOpacity !== undefined ? currentPage.config.insideImageOpacity : 1}</span></label>
                                                    <input type="range" min="0" max="1" step="0.05" value={currentPage.config.insideImageOpacity !== undefined ? currentPage.config.insideImageOpacity : 1} onChange={(e) => updateCurrentPageConfig('insideImageOpacity', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>
                                    </ControlPanel>
                                )}

                                {currentPage.tipo === 'ave' && (
                                    <ControlPanel title="Formato de Campos">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[{ id: 'orden', label: 'Orden' }, { id: 'familia', label: 'Familia' }, { id: 'longitud', label: 'Longitud' }, { id: 'nom059', label: 'NOM 059' }, { id: 'iucn', label: 'IUCN' }, { id: 'habitat', label: 'Hábitat' }, { id: 'alimentacion', label: 'Alim.' }, { id: 'canto', label: 'Canto' }, { id: 'dimorfismo', label: 'Dimorf.' }, { id: 'descripcion', label: 'Desc.' }].map(f => (
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
                                    <ControlPanel title="Galería y Mosaicos (Pág. Imagen)">

                                        <label className="text-[11px] text-gray-400 block mb-2 font-bold uppercase mt-2">Plantilla de Galería</label>
                                        <select
                                            value={currentPage.config.galleryLayout || 'single'}
                                            onChange={(e) => updateCurrentPageConfig('galleryLayout', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded text-[11px] p-2 text-white focus:outline-none mb-4"
                                        >
                                            <option value="single">Foto Única (Con ajustes de zoom)</option>
                                            <option value="grid2-v">2 Fotos (Verticales)</option>
                                            <option value="grid2-h">2 Fotos (Horizontales)</option>
                                            <option value="grid3">3 Fotos (1 Arriba, 2 Abajo)</option>
                                            <option value="grid4">4 Fotos (Cuadrícula)</option>
                                            <option value="mosaic">Mosaico (Estilo Collage)</option>
                                        </select>

                                        <div className="bg-gray-800 p-2 rounded border border-gray-700 mb-3">
                                            <div className="flex items-center justify-between mb-2 border-b border-gray-700 pb-2">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ajustes Foto Principal</p>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentPage.config.showCopyright || false}
                                                        onChange={(e) => updateCurrentPageConfig('showCopyright', e.target.checked)}
                                                        className="accent-emerald-500 w-3 h-3"
                                                    />
                                                    <span className="text-[10px] text-gray-300">Créditos</span>
                                                </label>
                                            </div>
                                            <label className={`flex items-center justify-center w-full gap-2 p-1.5 rounded text-xs text-white cursor-pointer transition ${isUploadingImage ? 'bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-500'} mb-2 shadow`}>
                                                {isUploadingImage ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</> : <><Upload className="w-3 h-3" /> Subir Foto Principal</>}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadGeneric(e, 'imageSrc')} disabled={isUploadingImage} />
                                            </label>
                                            <div className="flex items-center gap-2 mb-2">
                                                <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text" placeholder="Link de foto..."
                                                    value={currentPage.config.imageSrc || ''}
                                                    onChange={(e) => updateCurrentPageConfig('imageSrc', e.target.value)}
                                                    className="bg-gray-900 rounded p-1 text-xs text-white w-full focus:outline-none"
                                                />
                                            </div>

                                            {currentPage.config.showCopyright && (
                                                <input
                                                    type="text" placeholder="Ej: © 2026 Juan Pérez"
                                                    value={currentPage.config.copyrightText || ''}
                                                    onChange={(e) => updateCurrentPageConfig('copyrightText', e.target.value)}
                                                    className="w-full bg-gray-900 text-[10px] text-white p-1.5 rounded mb-2 border border-gray-600 focus:outline-none"
                                                />
                                            )}

                                            <div className="grid grid-cols-1 gap-2 mt-2 bg-gray-900 p-2 rounded">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[9px] text-gray-400">Modo de Ajuste</label>
                                                    <select
                                                        value={currentPage.config.imageFit || 'cover'}
                                                        onChange={(e) => updateCurrentPageConfig('imageFit', e.target.value)}
                                                        className="bg-gray-800 border border-gray-600 rounded text-[9px] p-0.5 text-white focus:outline-none"
                                                    >
                                                        <option value="cover">Llenar</option>
                                                        <option value="contain">Ajustar Completa</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                        <span>Zoom</span><span>{currentPage.config.imageScale || 1}x</span>
                                                    </label>
                                                    <input type="range" min="0.5" max="3" step="0.05" value={currentPage.config.imageScale || 1} onChange={(e) => updateCurrentPageConfig('imageScale', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                        <span>Eje X</span><span>{currentPage.config.imageOffsetX || 0}%</span>
                                                    </label>
                                                    <input type="range" min="-100" max="100" step="1" value={currentPage.config.imageOffsetX || 0} onChange={(e) => updateCurrentPageConfig('imageOffsetX', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                        <span>Eje Y</span><span>{currentPage.config.imageOffsetY || 0}%</span>
                                                    </label>
                                                    <input type="range" min="-100" max="100" step="1" value={currentPage.config.imageOffsetY || 0} onChange={(e) => updateCurrentPageConfig('imageOffsetY', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Opacidad</span><span>{currentPage.config.imageOpacity !== undefined ? currentPage.config.imageOpacity : 1}</span>
                                                    </label>
                                                    <input type="range" min="0" max="1" step="0.05" value={currentPage.config.imageOpacity !== undefined ? currentPage.config.imageOpacity : 1} onChange={(e) => updateCurrentPageConfig('imageOpacity', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>

                                        {(currentPage.config.galleryLayout && currentPage.config.galleryLayout !== 'single') && (
                                            <div className="bg-gray-800 p-2 rounded border border-gray-700 mb-3">
                                                <p className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-wider">Fotos Adicionales</p>
                                                {(currentPage.config.extraImages || []).map((item, idx) => {
                                                    const isObj = typeof item === 'object' && item !== null;
                                                    const imgUrl = isObj ? item.url : item;
                                                    const imgScale = isObj ? (item.scale || 1) : 1;
                                                    const imgOffsetX = isObj ? (item.offsetX || 0) : 0;
                                                    const imgOffsetY = isObj ? (item.offsetY || 0) : 0;
                                                    const imgFit = isObj ? (item.fit || 'cover') : 'cover';

                                                    const updateExtra = (key, val) => {
                                                        const newArr = [...currentPage.config.extraImages];
                                                        const current = newArr[idx];
                                                        const newObj = typeof current === 'object' && current !== null ? { ...current } : { url: current, scale: 1, offsetX: 0, offsetY: 0, fit: 'cover' };
                                                        newObj[key] = val;
                                                        newArr[idx] = newObj;
                                                        updateCurrentPageConfig('extraImages', newArr);
                                                    };

                                                    return (
                                                        <div key={idx} className="bg-gray-900 p-2 rounded mb-3 border border-gray-700">
                                                            <p className="text-[9px] text-gray-500 mb-1">Imagen {idx + 2}</p>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                <input
                                                                    type="text" placeholder={`Link de foto ${idx + 2}...`}
                                                                    value={imgUrl}
                                                                    onChange={(e) => updateExtra('url', e.target.value)}
                                                                    className="bg-transparent text-xs text-white w-full focus:outline-none"
                                                                />
                                                                <button onClick={() => {
                                                                    const newArr = [...currentPage.config.extraImages];
                                                                    newArr.splice(idx, 1);
                                                                    updateCurrentPageConfig('extraImages', newArr);
                                                                }} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                                                            </div>

                                                            {currentPage.config.showCopyright && (
                                                                <input
                                                                    type="text" placeholder={`Créditos foto ${idx + 2}...`}
                                                                    value={currentPage.config.extraCopyrights?.[idx] || ''}
                                                                    onChange={(e) => {
                                                                        const newArr = [...(currentPage.config.extraCopyrights || [])];
                                                                        newArr[idx] = e.target.value;
                                                                        updateCurrentPageConfig('extraCopyrights', newArr);
                                                                    }}
                                                                    className="w-full bg-gray-800 text-[10px] text-gray-300 p-1.5 rounded border border-gray-600 focus:outline-none mb-2"
                                                                />
                                                            )}

                                                            <div className="grid grid-cols-1 gap-2 bg-gray-800 p-2 rounded mt-2">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="text-[9px] text-gray-400">Modo de Ajuste</label>
                                                                    <select
                                                                        value={imgFit}
                                                                        onChange={(e) => updateExtra('fit', e.target.value)}
                                                                        className="bg-gray-700 border border-gray-600 rounded text-[9px] p-0.5 text-white focus:outline-none"
                                                                    >
                                                                        <option value="cover">Llenar</option>
                                                                        <option value="contain">Ajustar Completa</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                        <span>Zoom</span><span>{imgScale}x</span>
                                                                    </label>
                                                                    <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={(e) => updateExtra('scale', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                        <span>Eje X</span><span>{imgOffsetX}%</span>
                                                                    </label>
                                                                    <input type="range" min="-100" max="100" step="1" value={imgOffsetX} onChange={(e) => updateExtra('offsetX', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] text-gray-400 flex justify-between mb-1">
                                                                        <span>Eje Y</span><span>{imgOffsetY}%</span>
                                                                    </label>
                                                                    <input type="range" min="-100" max="100" step="1" value={imgOffsetY} onChange={(e) => updateExtra('offsetY', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button onClick={() => updateCurrentPageConfig('extraImages', [...(currentPage.config.extraImages || []), { url: '', scale: 1, offsetX: 0, offsetY: 0, fit: 'cover' }])} className="w-full text-[10px] bg-gray-700 hover:bg-gray-600 text-white py-2 rounded mt-1">+ Añadir imagen a galería</button>
                                            </div>
                                        )}
                                    </ControlPanel>
                                )}

                                <ControlPanel title="Colores Generales">
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
                            </div>
                        )}

                        {/* TAB 4: IMPRENTA */}
                        {activeTab === 'print' && sidebarOpen && (
                            <div className="px-4">
                                <div className="bg-emerald-900/40 border border-emerald-800 p-4 rounded-lg mb-4">
                                    <div className="flex items-start gap-3 text-emerald-300 mb-2">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Exportación a PDF</p>
                                    </div>
                                    <p className="text-[11px] text-emerald-100/70 text-justify leading-relaxed">Para exportar el diseño exacto, selecciona "Preparar PDF" y guarda como archivo usando la opción nativa de tu navegador.</p>
                                </div>

                                <ControlPanel title="Formato de Encuadernación">
                                    <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700 mb-2">
                                        <span className="mb-1 text-gray-300 font-semibold">Diseño de Imprenta</span>
                                        <select
                                            value={editorViewMode === 'imposed' ? 'imposed' : 'split'}
                                            onChange={(e) => {
                                                setEditorViewMode(e.target.value);
                                                updatePrintSettings('splitPages', e.target.value === 'split');
                                            }}
                                            className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none"
                                        >
                                            <option value="split">Páginas Sueltas (Normal)</option>
                                            <option value="imposed">Cuadernillos (Imposición)</option>
                                        </select>
                                    </label>
                                    {editorViewMode === 'imposed' && (
                                        <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                            <span className="mb-1 text-gray-300 font-semibold">Páginas por Cuadernillo</span>
                                            <select value={signatureSize} onChange={(e) => setSignatureSize(parseInt(e.target.value))} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
                                                <option value="4">4 Páginas (1 Hoja)</option>
                                                <option value="8">8 Páginas (2 Hojas)</option>
                                                <option value="16">16 Páginas (4 Hojas)</option>
                                                <option value="32">32 Páginas (8 Hojas)</option>
                                            </select>
                                        </label>
                                    )}
                                </ControlPanel>

                                <ControlPanel title="Ajustes de Pre-Prensa (PDF)">
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer bg-gray-800 p-3 rounded border border-gray-700 mb-2 hover:bg-gray-700 transition">
                                        <input type="checkbox" checked={printSettings.cropMarks} onChange={(e) => updatePrintSettings('cropMarks', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                                        Incluir Marcas de Corte
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer bg-gray-800 p-3 rounded border border-gray-700 mb-2 hover:bg-gray-700 transition">
                                        <input type="checkbox" checked={printSettings.slugInfo} onChange={(e) => updatePrintSettings('slugInfo', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                                        Información del Documento
                                    </label>
                                </ControlPanel>

                                <button onClick={handlePrint} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2">
                                    <Printer className="w-5 h-5" /> Preparar PDF
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={handleSave} disabled={isSaving} className={`flex items-center p-4 transition mt-auto justify-center shrink-0 ${isSaving ? 'bg-emerald-800 text-gray-300 cursor-not-allowed' : 'hover:bg-emerald-600 bg-emerald-700 text-white'}`}>
                        <Save className="w-5 h-5 min-w-[20px]" />
                        {sidebarOpen && <span className="ml-3 text-sm font-bold">{isSaving ? 'Guardando...' : 'Guardar en Nube'}</span>}
                    </button>
                </div>

                <div className="flex-1 flex flex-col relative overflow-auto bg-gray-300 z-0 items-center">

                    <div className="flex items-center gap-2 mt-6 print:hidden bg-white p-1 rounded-lg shadow-sm z-10">
                        <button onClick={() => { setEditorViewMode('spread'); updatePrintSettings('splitPages', false); }} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'spread' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <BookOpen className="w-4 h-4" /> Pliego Unido
                        </button>
                        <button onClick={() => { setEditorViewMode('split'); updatePrintSettings('splitPages', true); }} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'split' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <FileDigit className="w-4 h-4" /> Páginas Separadas
                        </button>
                        <button onClick={() => { setEditorViewMode('imposed'); updatePrintSettings('splitPages', true); }} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'imposed' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Settings2 className="w-4 h-4" /> Bonches (Imposición)
                        </button>
                    </div>

                    <div className="min-h-full p-8 flex flex-col items-center justify-center w-full">
                        <div className="transition-all duration-300 transform scale-100 origin-center w-full flex justify-center">

                            {/* VISOR DE BASE DE DATOS (NUEVO PESTAÑA DATOS) */}
                            {activeTab === 'database' ? (
                                <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6">
                                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">Base de Datos de Especies (Consolidada)</h2>
                                    {consolidatedSpecies.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No hay especies detectadas en las fichas del libro.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {consolidatedSpecies.map(sp => (
                                                <div key={sp.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-4">
                                                    {sp.imagenUrl ? (
                                                        <img src={sp.imagenUrl} alt={sp.nombreComun} className="w-20 h-20 object-cover rounded-md shadow-sm" />
                                                    ) : (
                                                        <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-400"><ImageIcon className="w-8 h-8" /></div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-800 truncate">{sp.nombreComun || '(Sin Nombre Común)'}</h4>
                                                        <p className="text-xs italic text-gray-500 truncate mb-2">{sp.nombreCientifico}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {sp.nom059 && <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">NOM: {sp.nom059}</span>}
                                                            {sp.iucn && <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">IUCN: {sp.iucn}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // VISTA NORMAL DEL LIBRO
                                editorViewMode === 'imposed' ? (
                                    <div className="flex flex-col gap-16">
                                        {getImposedSpreads().map((spread, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <p className="text-xs font-mono text-gray-500 mb-2 bg-white/50 px-3 py-1 rounded-full">
                                                    Grupo {spread.sigIndex} | Hoja {spread.sheetIndex} - {spread.side}
                                                </p>
                                                <div className="flex gap-0 shadow-2xl">
                                                    <PageRenderer pageData={spread.left.parent} forceHalf={spread.left.forceHalf} pageNum={spread.left.pageNum} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: true }} isPrintMode={false} showPageNumbers={showPageNumbers} pageNumberPosition={pageNumberPosition} />
                                                    <PageRenderer pageData={spread.right.parent} forceHalf={spread.right.forceHalf} pageNum={spread.right.pageNum} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: true }} isPrintMode={false} showPageNumbers={showPageNumbers} pageNumberPosition={pageNumberPosition} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <PageRenderer pageData={currentPage} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: editorViewMode === 'split' }} isPrintMode={false} showPageNumbers={showPageNumbers} pageNum={currentPage?._startPageNum} pageNumberPosition={pageNumberPosition} />
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-64 bg-white border-l border-gray-300 flex flex-col shadow-2xl z-10 shrink-0">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2"><FileCheck className="w-4 h-4 text-emerald-600" />Índice</h3>
                        <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{pagesWithNumbers.length > 0 ? pagesWithNumbers[pagesWithNumbers.length - 1]._startPageNum + (pagesWithNumbers[pagesWithNumbers.length - 1]._numPages - 1) : 0} Pág.</span>
                            <button onClick={handleAddGroup} className="text-gray-500 hover:text-emerald-600 p-1" title="Añadir Grupo"><FolderPlus className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gray-100">
                        {bookGroups.map(group => {
                            const groupPages = pagesWithNumbers.map((p, idx) => ({ ...p, originalIndex: idx })).filter(p => (p.config.groupId || 'default') === group.id);
                            return (
                                <div key={group.id} className="mb-5 bg-white p-2 rounded shadow-sm border border-gray-200">
                                    <input
                                        value={group.name}
                                        onChange={(e) => handleUpdateGroupName(group.id, e.target.value)}
                                        className="font-bold text-gray-800 text-[10px] uppercase tracking-wider bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none w-full mb-2 pb-1"
                                    />
                                    <div className="space-y-1.5">
                                        {groupPages.length === 0 && <p className="text-[10px] text-gray-400 italic">No hay páginas</p>}
                                        {groupPages.map(p => {
                                            let pageName = p.tipo;
                                            if (p.tipo === 'ave') pageName = p.config.nombreComun || 'Ave sin nombre';
                                            if (p.tipo === 'portada') pageName = p.config.titulo || 'Portada';
                                            const pageRange = p._numPages > 1 ? `${p._startPageNum}-${p._startPageNum + p._numPages - 1}` : p._startPageNum;

                                            return (
                                                <div
                                                    key={p.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, p.originalIndex)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, p.originalIndex)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`flex items-center w-full bg-white rounded-lg transition border ${p.originalIndex === currentPageIndex && editorViewMode !== 'imposed' && activeTab !== 'database' ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'border-transparent hover:border-emerald-300 hover:shadow'}`}
                                                >
                                                    <div className="cursor-grab text-gray-400 hover:text-gray-600 pl-2 pr-1 py-3" title="Arrastrar para mover">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <button onClick={() => { setCurrentPageIndex(p.originalIndex); if (activeTab === 'database') setActiveTab('pages'); setEditorViewMode(editorViewMode === 'imposed' ? 'spread' : editorViewMode); }} className="flex-1 text-left flex flex-col py-2 overflow-hidden">
                                                        <span className={`text-[9px] font-bold tracking-wider mb-0.5 ${p.originalIndex === currentPageIndex && editorViewMode !== 'imposed' && activeTab !== 'database' ? 'text-emerald-600' : 'text-gray-400'}`}>Pág. {pageRange} • {p.tipo}</span>
                                                        <span className="text-xs font-semibold text-gray-700 capitalize truncate w-full block">{pageName}</span>
                                                    </button>
                                                    <div className="flex flex-col gap-0 border-l border-gray-100 px-1 py-1">
                                                        <button onClick={(e) => { e.stopPropagation(); movePageUp(p.originalIndex); }} disabled={p.originalIndex === 0} className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 p-0.5" title="Mover Arriba"><ChevronUp className="w-4 h-4" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); movePageDown(p.originalIndex); }} disabled={p.originalIndex === pages.length - 1} className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 p-0.5" title="Mover Abajo"><ChevronDown className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {editorViewMode === 'imposed' ? (
                <div className="hidden print:block w-full bg-white m-0 p-0 z-[9999] absolute top-0 left-0">
                    <style dangerouslySetInnerHTML={{ __html: `@media print { @page { margin: 0 !important; size: auto; } body, html { margin: 0 !important; padding: 0 !important; background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }` }} />
                    {getImposedSpreads().map((spread, idx) => (
                        <div key={`print-spread-${idx}`} className="flex break-after-page">
                            <PageRenderer pageData={spread.left.parent} forceHalf={spread.left.forceHalf} pageNum={spread.left.pageNum} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: true }} isPrintMode={true} showPageNumbers={showPageNumbers} pageNumberPosition={pageNumberPosition} bookTitle={bookTitle} />
                            <PageRenderer pageData={spread.right.parent} forceHalf={spread.right.forceHalf} pageNum={spread.right.pageNum} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: true }} isPrintMode={true} showPageNumbers={showPageNumbers} pageNumberPosition={pageNumberPosition} bookTitle={bookTitle} />
                        </div>
                    ))}
                </div>
            ) : (
                <PrintEngine pages={pagesWithNumbers} bookSize={bookSize} printSettings={printSettings} bookTitle={bookTitle} showPageNumbers={showPageNumbers} pageNumberPosition={pageNumberPosition} />
            )}
        </>
    );
}