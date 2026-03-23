import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Menu, Upload, Save, ArrowLeft, FileText, 
  Square, Palette, Layers3, Droplets, AlignCenter, Layout, 
  Trash2, FileEdit, Book, Image as ImageIcon, Link as LinkIcon, FileCheck, Printer, AlertTriangle, BookOpen, FileDigit,
  Maximize, MoveHorizontal, MoveVertical, Loader2, FolderPlus, Settings2,
  ChevronUp, ChevronDown, GripVertical // NUEVOS ICONOS PARA REORGANIZAR
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
            <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-800 text-sm text-gray-200 p-2 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none min-h-[80px]" />
        ) : (
            <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-800 text-sm text-gray-200 p-2 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none" />
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
  
  // NUEVO: Estado para arrastrar y soltar
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [bookGroups, setBookGroups] = useState([{ id: 'default', name: 'Libro Principal' }]);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
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
          const numPages = p.tipo === 'ave' ? 2 : 1;
          const startNum = currentNum;
          currentNum += numPages;
          return { ...p, _startPageNum: startNum, _numPages: numPages };
      });
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

  const handleAddGroup = () => {
      setBookGroups([...bookGroups, { id: `g_${Date.now()}`, name: 'Nuevo Grupo' }]);
  };

  const handleUpdateGroupName = (id, newName) => {
      setBookGroups(bookGroups.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  // NUEVO: FUNCIONES DE REORDENAMIENTO DE PÁGINAS
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

  // NUEVO: LÓGICA DE DRAG AND DROP
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
    const newPage = { id: Date.now().toString(), tipo: tipo, config: { groupId: 'default', backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, imageFit: 'cover', imagePosition: 'left', showCornerCircle: true, titlePosition: 'data', titleBgOpacity: 0.6, titleBgColor: '#000000', fontFamily: 'system-ui, sans-serif', fontSize: '11pt', lineHeight: '1.625', marginSize: '15mm' } };
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
          groupId: 'default',
          backgroundColor: '#ffffff', textColor: '#1f2937', themeColor: '#3b82f6', imageOpacity: 1, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0, imageFit: 'cover', imagePosition: 'left', showCornerCircle: true, titlePosition: 'data', titleBgOpacity: 0.6, titleBgColor: '#000000', fontFamily: 'system-ui, sans-serif', fontSize: '11pt', lineHeight: '1.625', marginSize: '15mm',
          nombreCientifico: row['Nombre cientifico'] || row['Nombre Cientifico'] || '',
          nombreComun: row['Nombre Comun'] || row['Nombre común'] || '',
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
      await setDoc(doc(db, "libros", bookId), { titulo: bookTitle, bookSize: bookSize, paginas: pages, grupos: bookGroups, showPageNumbers, signatureSize, fechaActualizacion: new Date().toLocaleDateString() }, { merge: true });
      alert(`¡Libro guardado en la nube con éxito!`);
    } catch (error) {
      alert("Hubo un error al guardar. Revisa tu consola.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
      setTimeout(() => { window.print(); }, 500);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
        const options = { 
            maxSizeMB: 2.0, 
            maxWidthOrHeight: 2700, 
            useWebWorker: true,
            fileType: 'image/jpeg', 
            initialQuality: 0.85 
        };
        const compressedFile = await imageCompression(file, options);
        const fileName = `${Date.now()}_comprimida.jpg`;
        const storageRef = ref(storage, `libros/${bookId}/${fileName}`);
        await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(storageRef);
        updateCurrentPageConfig('imageSrc', downloadURL);
    } catch (error) {
        console.error("Error al procesar/subir imagen:", error);
        alert("Ocurrió un error al procesar tu foto. Revisa la consola.");
    } finally {
        setIsUploadingImage(false);
        e.target.value = null;
    }
  };

  const getImposedSpreads = () => {
      const phys = [];
      pagesWithNumbers.forEach(p => {
          if (p.tipo === 'ave') {
              const isImageRight = p.config.imagePosition === 'right';
              phys.push({ parent: p, forceHalf: isImageRight ? 'data' : 'image', pageNum: p._startPageNum });
              phys.push({ parent: p, forceHalf: isImageRight ? 'image' : 'data', pageNum: p._startPageNum + 1 });
          } else {
              phys.push({ parent: p, forceHalf: null, pageNum: p._startPageNum });
          }
      });

      const spreads = [];
      const numSigs = Math.ceil(phys.length / signatureSize);
      for (let s = 0; s < numSigs; s++) {
          const sigPages = phys.slice(s * signatureSize, (s + 1) * signatureSize);
          while (sigPages.length < signatureSize) {
              sigPages.push({ isBlankPad: true, pageNum: '-' });
          }
          for (let i = 0; i < signatureSize / 2; i++) {
              const leftIdx = i % 2 === 0 ? signatureSize - 1 - i : i;
              const rightIdx = i % 2 === 0 ? i : signatureSize - 1 - i;
              spreads.push({ left: sigPages[leftIdx], right: sigPages[rightIdx], sigIndex: s + 1 });
          }
      }
      return spreads;
  };

  return (
    <>
      <div className="flex h-screen bg-gray-200 overflow-hidden font-sans print:hidden">
        
        <div className={`bg-[#111827] text-gray-300 transition-all duration-300 flex flex-col z-20 ${sidebarOpen ? 'w-[320px]' : 'w-16'}`}>
          <div className="flex flex-col border-b border-gray-800">
              <div className="flex items-center justify-between p-4">
              {sidebarOpen && <button onClick={() => navigate('/')} className="hover:text-white flex items-center text-sm"><ArrowLeft className="w-4 h-4 mr-2"/> Volver</button>}
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:text-white ml-auto"><Menu className="w-6 h-6" /></button>
              </div>
              {sidebarOpen && (
                  <div className="px-4 pb-4 flex items-center gap-2">
                      <Book className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <input type="text" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} className="bg-transparent border-b border-gray-700 text-white font-bold w-full focus:border-emerald-500 focus:outline-none px-1" placeholder="Título del Libro..." />
                  </div>
              )}
          </div>

          {sidebarOpen && (
              <div className="flex border-b border-gray-800 text-[9px] font-bold tracking-wider shrink-0">
                  <button onClick={() => setActiveTab('pages')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'pages' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}><Layers3 className="w-4 h-4" /> PÁGINAS</button>
                  <button onClick={() => setActiveTab('content')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'content' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}><FileEdit className="w-4 h-4" /> CONTENIDO</button>
                  <button onClick={() => setActiveTab('design')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'design' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}><Palette className="w-4 h-4" /> DISEÑO</button>
                  <button onClick={() => setActiveTab('print')} className={`flex-1 p-3 flex flex-col items-center gap-1 ${activeTab === 'print' ? 'bg-emerald-800 text-white' : 'hover:bg-gray-800'}`}><Printer className="w-4 h-4" /> IMPRENTA</button>
              </div>
          )}

          <div className="flex flex-col flex-1 py-4 overflow-y-auto custom-scrollbar">
            
            {activeTab === 'pages' && (
               <div className={`${!sidebarOpen && 'flex flex-col items-center'} px-3`}>
                  <div className="mb-6 border-b border-gray-800 pb-4">
                      <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Asignar Grupo</p>
                      {sidebarOpen && (
                          <select value={currentPage?.config.groupId || 'default'} onChange={(e) => updateCurrentPageConfig('groupId', e.target.value)} className="w-full bg-gray-800 text-sm text-gray-200 p-2.5 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none mb-4">
                              {bookGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                      )}
                      
                      <p className={`text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 ${!sidebarOpen && 'hidden'}`}>Formato del Libro</p>
                      {sidebarOpen && (
                          <select value={bookSize} onChange={(e) => setBookSize(e.target.value)} className="w-full bg-gray-800 text-sm text-gray-200 p-2.5 rounded border border-gray-700 focus:border-emerald-500 focus:outline-none">
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
                  <button onClick={() => handleAddPage('portada')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1"><Square className="w-5 h-5 min-w-[20px] text-emerald-400" />{sidebarOpen && <span className="ml-3 text-sm">Portada / Título</span>}</button>
                  <button onClick={() => handleAddPage('ave')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1"><FileText className="w-5 h-5 min-w-[20px] text-blue-400" />{sidebarOpen && <span className="ml-3 text-sm">Ficha de Ave</span>}</button>
                  <button onClick={() => handleAddPage('foto')} className="flex items-center w-full p-2.5 rounded hover:bg-gray-800 transition mb-1"><ImageIcon className="w-5 h-5 min-w-[20px] text-purple-400" />{sidebarOpen && <span className="ml-3 text-sm">Página de Foto</span>}</button>
              </div>
            )}

            {activeTab === 'content' && sidebarOpen && currentPage && (
                <div className="px-4">
                    <div className="mb-4 bg-gray-800 p-3 rounded flex justify-between items-center">
                        <div><p className="text-[10px] text-gray-400 uppercase">Editando Textos</p><p className="font-bold text-white capitalize">Pág. {currentPage._startPageNum}: {currentPage.tipo}</p></div>
                        <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {currentPage.tipo === 'portada' && (
                        <div className="space-y-1"><TextInput label="Título" value={currentPage.config.titulo} onChange={(val) => updateCurrentPageConfig('titulo', val)} /><TextInput label="Subtítulo" value={currentPage.config.subtitulo} onChange={(val) => updateCurrentPageConfig('subtitulo', val)} /></div>
                    )}
                    {currentPage.tipo === 'ave' && (
                        <div className="space-y-1">
                            <TextInput label="Nombre Común" value={currentPage.config.nombreComun} onChange={(val) => updateCurrentPageConfig('nombreComun', val)} />
                            <TextInput label="Nombre Científico" value={currentPage.config.nombreCientifico} onChange={(val) => updateCurrentPageConfig('nombreCientifico', val)} />
                            <div className="grid grid-cols-2 gap-2"><TextInput label="Orden" value={currentPage.config.orden} onChange={(val) => updateCurrentPageConfig('orden', val)} /><TextInput label="Familia" value={currentPage.config.familia} onChange={(val) => updateCurrentPageConfig('familia', val)} /></div>
                            <div className="grid grid-cols-2 gap-2"><TextInput label="NOM 059" value={currentPage.config.nom059} onChange={(val) => updateCurrentPageConfig('nom059', val)} /><TextInput label="IUCN" value={currentPage.config.iucn} onChange={(val) => updateCurrentPageConfig('iucn', val)} /></div>
                            <TextInput label="Longitud" value={currentPage.config.longitud} onChange={(val) => updateCurrentPageConfig('longitud', val)} />
                            <TextInput label="Hábitat" value={currentPage.config.habitat} onChange={(val) => updateCurrentPageConfig('habitat', val)} />
                            <TextInput label="Alimentación" value={currentPage.config.alimentacion} onChange={(val) => updateCurrentPageConfig('alimentacion', val)} />
                            <TextInput label="Canto y Llamado" value={currentPage.config.canto} onChange={(val) => updateCurrentPageConfig('canto', val)} />
                            <TextInput label="Dimorfismo" value={currentPage.config.dimorfismo} onChange={(val) => updateCurrentPageConfig('dimorfismo', val)} isTextArea />
                            <TextInput label="Descripción" value={currentPage.config.descripcion} onChange={(val) => updateCurrentPageConfig('descripcion', val)} isTextArea />
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'design' && sidebarOpen && currentPage && (
                <div>
                    <div className="px-4 mb-2 flex justify-between items-center bg-gray-800 p-3 mx-4 rounded">
                        <div><p className="text-[10px] text-gray-400 uppercase">Editando Estilos</p><p className="font-bold text-white capitalize">Pág. {currentPage._startPageNum}: {currentPage.tipo}</p></div>
                        <button onClick={handleDeletePage} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <ControlPanel title="Tipografía y Diseño de Página">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                            <input type="checkbox" checked={showPageNumbers} onChange={(e) => setShowPageNumbers(e.target.checked)} className="accent-emerald-500 w-4 h-4" /> 
                            Mostrar Números de Página
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                <span className="mb-1 text-gray-300 font-semibold">Fuente (Tipografía)</span>
                                <select value={currentPage.config.fontFamily || 'system-ui, sans-serif'} onChange={(e) => updateCurrentPageConfig('fontFamily', e.target.value)} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
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
                            
                            {/* NUEVO: Controles de Tamaño e Interlineado (Line Height) juntos */}
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                    <span className="mb-1 text-gray-300 font-semibold">Tamaño Letra</span>
                                    <select value={currentPage.config.fontSize || '11pt'} onChange={(e) => updateCurrentPageConfig('fontSize', e.target.value)} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
                                        <option value="9pt">9pt (Pequeño)</option>
                                        <option value="10pt">10pt (Estándar)</option>
                                        <option value="11pt">11pt (Cómodo)</option>
                                        <option value="12pt">12pt (Grande)</option>
                                    </select>
                                </label>
                                <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                    <span className="mb-1 text-gray-300 font-semibold">Interlineado</span>
                                    <select value={currentPage.config.lineHeight || '1.625'} onChange={(e) => updateCurrentPageConfig('lineHeight', e.target.value)} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
                                        <option value="1.2">Compacto (1.2)</option>
                                        <option value="1.5">Normal (1.5)</option>
                                        <option value="1.625">Relajado (1.6)</option>
                                        <option value="2">Doble (2.0)</option>
                                    </select>
                                </label>
                            </div>
                            <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                <span className="mb-1 text-gray-300 font-semibold">Márgenes</span>
                                <select value={currentPage.config.marginSize || '15mm'} onChange={(e) => updateCurrentPageConfig('marginSize', e.target.value)} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
                                    <option value="10mm">10mm (Estrecho)</option>
                                    <option value="15mm">15mm (Estándar)</option>
                                    <option value="20mm">20mm (Amplio)</option>
                                </select>
                            </label>
                        </div>
                    </ControlPanel>

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
                                         <label className="text-[11px] text-gray-400 block mb-2 font-bold uppercase">Transparencia</label>
                                         <div className="flex items-center gap-2">
                                             <Droplets className="w-4 h-4 text-gray-500" />
                                             <input type="range" min="0" max="1" step="0.05" value={currentPage.config.titleBgOpacity !== undefined ? currentPage.config.titleBgOpacity : 0.6} onChange={(e) => updateCurrentPageConfig('titleBgOpacity', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
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
                                 <input type="checkbox" checked={currentPage.config.showCornerCircle !== false} onChange={(e) => updateCurrentPageConfig('showCornerCircle', e.target.checked)} className="accent-emerald-500 w-4 h-4" /> Mostrar círculo en esquina
                             </label>
                         </ControlPanel>
                    )}

                    {currentPage.tipo === 'ave' && (
                      <ControlPanel title="Formato de Campos">
                          <div className="grid grid-cols-2 gap-2">
                              {[{ id: 'orden', label: 'Orden' }, { id: 'familia', label: 'Familia' }, { id: 'longitud', label: 'Longitud' }, { id: 'nom059', label: 'NOM 059' }, { id: 'iucn', label: 'IUCN' }, { id: 'habitat', label: 'Hábitat' }, { id: 'alimentacion', label: 'Alim.' }, { id: 'canto', label: 'Canto' }, { id: 'dimorfismo', label: 'Dimorf.' }, { id: 'descripcion', label: 'Desc.' }].map(f => (
                                  <label key={f.id} className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700">
                                      <span className="mb-1 text-gray-300 font-semibold truncate">{f.label}</span>
                                      <select value={currentPage.config[`block_${f.id}`] !== undefined ? (currentPage.config[`block_${f.id}`] ? 'block' : 'inline') : (f.id === 'descripcion' ? 'block' : 'inline')} onChange={(e) => updateCurrentPageConfig(`block_${f.id}`, e.target.value === 'block')} className="bg-gray-900 border border-gray-600 rounded text-[10px] p-1 text-white focus:outline-none">
                                          <option value="inline">Lado (Sangría)</option><option value="block">Abajo (Bloque)</option>
                                      </select>
                                  </label>
                              ))}
                          </div>
                      </ControlPanel>
                    )}

                    {(currentPage.tipo === 'ave' || currentPage.tipo === 'foto') && (
                      <ControlPanel title="Fotografía Original">
                          <label className={`flex items-center justify-center w-full gap-2 p-2 rounded text-sm text-white cursor-pointer transition ${isUploadingImage ? 'bg-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'} mb-3 shadow`}>
                              {isUploadingImage ? (
                                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</span>
                              ) : (
                                  <><Upload className="w-4 h-4" /> Subir desde mi PC</>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                          </label>

                          <div className="flex items-center gap-2 mb-3 bg-gray-800 p-2 rounded border border-gray-700">
                              <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <input type="text" placeholder="O pega el link aquí..." value={currentPage.config.imageSrc || ''} onChange={(e) => updateCurrentPageConfig('imageSrc', e.target.value)} className="bg-transparent text-sm text-gray-400 w-full focus:outline-none" />
                          </div>

                          <label className="text-[11px] text-gray-400 block mb-2 font-bold uppercase mt-4">Encuadre de Imagen</label>
                          <div className="grid grid-cols-1 gap-4 bg-gray-800 p-3 rounded border border-gray-700 mb-3">
                              <div>
                                  <label className="text-[10px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1">Modo de Ajuste</span></label>
                                  <div className="flex bg-gray-900 rounded p-1 gap-1">
                                      <button onClick={() => updateCurrentPageConfig('imageFit', 'cover')} className={`flex-1 text-[10px] py-1 rounded ${currentPage.config.imageFit !== 'contain' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Llenar</button>
                                      <button onClick={() => updateCurrentPageConfig('imageFit', 'contain')} className={`flex-1 text-[10px] py-1 rounded ${currentPage.config.imageFit === 'contain' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Ajustar Completa</button>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1"><Maximize className="w-3 h-3"/> Zoom (Escala)</span><span>{currentPage.config.imageScale || 1}x</span></label>
                                  <input type="range" min="0.5" max="3" step="0.05" value={currentPage.config.imageScale || 1} onChange={(e) => updateCurrentPageConfig('imageScale', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                              </div>
                              <div>
                                  <label className="text-[10px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1"><MoveHorizontal className="w-3 h-3"/> Eje X (Horizontal)</span><span>{currentPage.config.imageOffsetX || 0}%</span></label>
                                  <input type="range" min="-100" max="100" step="1" value={currentPage.config.imageOffsetX || 0} onChange={(e) => updateCurrentPageConfig('imageOffsetX', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                              </div>
                              <div>
                                  <label className="text-[10px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1"><MoveVertical className="w-3 h-3"/> Eje Y (Vertical)</span><span>{currentPage.config.imageOffsetY || 0}%</span></label>
                                  <input type="range" min="-100" max="100" step="1" value={currentPage.config.imageOffsetY || 0} onChange={(e) => updateCurrentPageConfig('imageOffsetY', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                              </div>
                              <div>
                                  <label className="text-[10px] text-gray-400 flex justify-between mb-1"><span className="flex items-center gap-1"><Droplets className="w-3 h-3"/> Opacidad</span><span>{currentPage.config.imageOpacity !== undefined ? currentPage.config.imageOpacity : 1}</span></label>
                                  <input type="range" min="0" max="1" step="0.05" value={currentPage.config.imageOpacity !== undefined ? currentPage.config.imageOpacity : 1} onChange={(e) => updateCurrentPageConfig('imageOpacity', parseFloat(e.target.value))} className="w-full h-1 accent-emerald-500 cursor-pointer" />
                              </div>
                          </div>
                      </ControlPanel>
                    )}

                    <ControlPanel title="Colores Generales">
                        <div className="flex items-center justify-between gap-2"><label className="text-sm text-gray-400">Fondo</label><input type="color" value={currentPage.config.backgroundColor || '#ffffff'} onChange={(e) => updateCurrentPageConfig('backgroundColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" /></div>
                        {(currentPage.tipo === 'ave' || currentPage.tipo === 'portada') && (
                            <>
                              <div className="flex items-center justify-between gap-2"><label className="text-sm text-gray-400">Texto Principal</label><input type="color" value={currentPage.config.textColor || '#1f2937'} onChange={(e) => updateCurrentPageConfig('textColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" /></div>
                              <div className="flex items-center justify-between gap-2"><label className="text-sm text-gray-400">Iconos / Acentos</label><input type="color" value={currentPage.config.themeColor || '#3b82f6'} onChange={(e) => updateCurrentPageConfig('themeColor', e.target.value)} className="w-10 h-8 border-0 cursor-pointer bg-transparent" /></div>
                            </>
                        )}
                    </ControlPanel>
                </div>
            )}

            {/* TAB 4: IMPRENTA */}
            {activeTab === 'print' && sidebarOpen && (
                <div className="px-4">
                    <div className="bg-emerald-900/40 border border-emerald-800 p-4 rounded-lg mb-4">
                        <div className="flex items-start gap-3 text-emerald-300 mb-2"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p className="text-xs font-bold uppercase tracking-wider">Exportación a PDF</p></div>
                        <p className="text-[11px] text-emerald-100/70 text-justify leading-relaxed">Para exportar el diseño exacto, selecciona "Preparar PDF" y guarda como archivo usando la opción nativa de tu navegador.</p>
                    </div>

                    <ControlPanel title="Formato de Encuadernación">
                        <label className="flex flex-col text-[11px] text-gray-400 bg-gray-800 p-1.5 rounded border border-gray-700 mb-2">
                            <span className="mb-1 text-gray-300 font-semibold">Diseño de Imprenta</span>
                            <select value={editorViewMode === 'imposed' ? 'imposed' : 'split'} onChange={(e) => {setEditorViewMode(e.target.value); updatePrintSettings('splitPages', e.target.value === 'split');}} className="bg-gray-900 border border-gray-600 rounded text-[11px] p-1.5 text-white focus:outline-none">
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

        {/* ÁREA DE TRABAJO CENTRAL (PANTALLA) */}
        <div className="flex-1 flex flex-col relative overflow-auto bg-gray-300 z-0 items-center">
            
            <div className="flex items-center gap-2 mt-6 print:hidden bg-white p-1 rounded-lg shadow-sm z-10">
                <button onClick={() => {setEditorViewMode('spread'); updatePrintSettings('splitPages', false);}} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'spread' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}><BookOpen className="w-4 h-4" /> Pliego Unido</button>
                <button onClick={() => {setEditorViewMode('split'); updatePrintSettings('splitPages', true);}} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'split' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}><FileDigit className="w-4 h-4" /> Páginas Separadas</button>
                <button onClick={() => {setEditorViewMode('imposed'); updatePrintSettings('splitPages', true);}} className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 ${editorViewMode === 'imposed' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}><Settings2 className="w-4 h-4" /> Bonches (Imposición)</button>
            </div>

            <div className="min-h-full p-8 flex flex-col items-center justify-center w-full">
                 <div className="transition-all duration-300 transform scale-100 origin-center w-full flex justify-center">
                    {editorViewMode === 'imposed' ? (
                        <div className="flex flex-col gap-16">
                            {getImposedSpreads().map((spread, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <p className="text-xs font-mono text-gray-500 mb-2 bg-white/50 px-3 py-1 rounded-full">Firma {spread.sigIndex} | Pliego de Impresión {idx + 1}</p>
                                    <div className="flex gap-0 shadow-2xl">
                                        <PageRenderer pageData={spread.left.parent} forceHalf={spread.left.forceHalf} pageNum={spread.left.pageNum} bookSize={bookSize} printSettings={{...printSettings, splitPages: true}} isPrintMode={false} showPageNumbers={showPageNumbers} />
                                        <PageRenderer pageData={spread.right.parent} forceHalf={spread.right.forceHalf} pageNum={spread.right.pageNum} bookSize={bookSize} printSettings={{...printSettings, splitPages: true}} isPrintMode={false} showPageNumbers={showPageNumbers} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <PageRenderer pageData={currentPage} bookSize={bookSize} printSettings={{ ...printSettings, splitPages: editorViewMode === 'split' }} isPrintMode={false} showPageNumbers={showPageNumbers} pageNum={currentPage?._startPageNum} />
                    )}
                 </div>
            </div>
        </div>

        {/* MENÚ LATERAL DERECHO (ÍNDICE Y GRUPOS CON DRAG & DROP) */}
        <div className="w-64 bg-white border-l border-gray-300 flex flex-col shadow-2xl z-10 shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2"><FileCheck className="w-4 h-4 text-emerald-600" />Índice</h3>
                <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{pagesWithNumbers.length > 0 ? pagesWithNumbers[pagesWithNumbers.length - 1]._startPageNum + (pagesWithNumbers[pagesWithNumbers.length - 1]._numPages - 1) : 0} Pág.</span>
                    <button onClick={handleAddGroup} className="text-gray-500 hover:text-emerald-600 p-1" title="Añadir Grupo"><FolderPlus className="w-5 h-5"/></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gray-100">
                {bookGroups.map(group => {
                    const groupPages = pagesWithNumbers.map((p, idx) => ({...p, originalIndex: idx})).filter(p => (p.config.groupId || 'default') === group.id);
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
                                    
                                    // Renderizado de la ficha con Drag & Drop y botones Arriba/Abajo
                                    return (
                                        <div 
                                            key={p.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, p.originalIndex)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, p.originalIndex)}
                                            onDragEnd={handleDragEnd}
                                            className={`flex items-center w-full bg-white rounded-lg transition border ${p.originalIndex === currentPageIndex && editorViewMode !== 'imposed' ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'border-transparent hover:border-emerald-300 hover:shadow'}`}
                                        >
                                            <div className="cursor-grab text-gray-400 hover:text-gray-600 pl-2 pr-1 py-3" title="Arrastrar para mover">
                                                <GripVertical className="w-4 h-4"/>
                                            </div>
                                            <button onClick={() => {setCurrentPageIndex(p.originalIndex); setEditorViewMode(editorViewMode === 'imposed' ? 'spread' : editorViewMode);}} className="flex-1 text-left flex flex-col py-2 overflow-hidden">
                                                <span className={`text-[9px] font-bold tracking-wider mb-0.5 ${p.originalIndex === currentPageIndex && editorViewMode !== 'imposed' ? 'text-emerald-600' : 'text-gray-400'}`}>Pág. {pageRange} • {p.tipo}</span>
                                                <span className="text-xs font-semibold text-gray-700 capitalize truncate w-full block">{pageName}</span>
                                            </button>
                                            <div className="flex flex-col gap-0 border-l border-gray-100 px-1 py-1">
                                                <button onClick={(e) => { e.stopPropagation(); movePageUp(p.originalIndex); }} disabled={p.originalIndex === 0} className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 p-0.5" title="Mover Arriba"><ChevronUp className="w-4 h-4"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); movePageDown(p.originalIndex); }} disabled={p.originalIndex === pages.length - 1} className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 p-0.5" title="Mover Abajo"><ChevronDown className="w-4 h-4"/></button>
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

      {/* MOTOR DE IMPRESIÓN */}
      {editorViewMode === 'imposed' ? (
          <div className="hidden print:block w-full bg-white m-0 p-0 z-[9999] absolute top-0 left-0">
             <style dangerouslySetInnerHTML={{__html: `@media print { @page { margin: 0 !important; size: auto; } body, html { margin: 0 !important; padding: 0 !important; background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}} />
             {getImposedSpreads().map((spread, idx) => (
                <div key={`print-spread-${idx}`} className="flex break-after-page">
                    <PageRenderer pageData={spread.left.parent} forceHalf={spread.left.forceHalf} pageNum={spread.left.pageNum} bookSize={bookSize} printSettings={{...printSettings, splitPages: true}} isPrintMode={true} showPageNumbers={showPageNumbers} bookTitle={bookTitle} />
                    <PageRenderer pageData={spread.right.parent} forceHalf={spread.right.forceHalf} pageNum={spread.right.pageNum} bookSize={bookSize} printSettings={{...printSettings, splitPages: true}} isPrintMode={true} showPageNumbers={showPageNumbers} bookTitle={bookTitle} />
                </div>
             ))}
          </div>
      ) : (
          <PrintEngine pages={pagesWithNumbers} bookSize={bookSize} printSettings={printSettings} bookTitle={bookTitle} showPageNumbers={showPageNumbers} />
      )}
    </>
  );
}