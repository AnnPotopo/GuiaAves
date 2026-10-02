import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload, Lock, EyeOff, Search, Filter, Compass, User, Image as ImageIcon, Loader2, Bookmark, Settings, ChevronLeft, ChevronRight, TrendingUp, Clock, Star, Library, FolderPlus, Folder, X, Flag, AlertTriangle, MapPin, Globe, BookmarkPlus, BookmarkCheck, ChevronDown } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { getAuth } from 'firebase/auth';
import BookManagerModal from './BookManagerModal';

import { Country, State, City } from 'country-state-city';

const CAROUSEL_IMAGES = [
    "https://images.unsplash.com/photo-1444464666168-49b626f49cb6?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=2041&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550159930-40066082a4fc?q=80&w=2140&auto=format&fit=crop"
];

export default function BookList() {
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;
    const isAdmin = user?.email === "potopo.ann@gmail.com";

    const [books, setBooks] = useState([]);
    const [colecciones, setColecciones] = useState([]);
    const [favoritos, setFavoritos] = useState([]); // Arreglo de IDs de libros guardados
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('explorar');

    // ESTADOS DEL MENÚ LATERAL (MI ESPACIO)
    const [openSidebarSection, setOpenSidebarSection] = useState('mis_documentos'); // 'mis_documentos' o 'compartidos'
    const [selectedCollectionId, setSelectedCollectionId] = useState('Todos'); // 'Todos', 'generales', 'guardados', 'compartidos_conmigo', o colId

    // FILTROS DE BÚSQUEDA GENERAL
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');

    // FILTROS GEOGRÁFICOS
    const [filterPaisCode, setFilterPaisCode] = useState('');
    const [filterPaisNombre, setFilterPaisNombre] = useState('');
    const [filterEstadoCode, setFilterEstadoCode] = useState('');
    const [filterEstadoNombre, setFilterEstadoNombre] = useState('');
    const [filterMunicipio, setFilterMunicipio] = useState('');

    // NUEVOS FILTROS (FECHA Y AUTOR) PARA MI ESPACIO
    const [filterMes, setFilterMes] = useState('');
    const [filterAno, setFilterAno] = useState('');
    const [filterAutor, setFilterAutor] = useState('');

    const [currentSlide, setCurrentSlide] = useState(0);
    const [profileData, setProfileData] = useState({ coverUrl: '', avatarUrl: user?.photoURL || '' });

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    const [uploadData, setUploadData] = useState({
        titulo: '', descripcion: '', categorias: [], visibilidad: 'publico', coleccionId: 'generales', file: null, cover: null,
        paisCode: '', paisNombre: '', estadoCode: '', estadoNombre: '', municipio: ''
    });

    const [editingBook, setEditingBook] = useState(null);
    const [reportingBook, setReportingBook] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const listaCategorias = ['Conservación', 'Aves', 'Árboles', 'Mamíferos', 'Océano', 'Tecnología', 'General'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    useEffect(() => {
        if (user) {
            cargarPerfil();
            cargarLibros();
            cargarColecciones();
            cargarFavoritos();
        }
    }, [user]);

    useEffect(() => {
        if (activeTab !== 'explorar' || searchQuery) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeTab, searchQuery]);

    const cargarPerfil = async () => {
        try {
            const userDoc = await getDocs(query(collection(db, "usuarios"), where("uid", "==", user.uid)));
            if (!userDoc.empty) setProfileData(userDoc.docs[0].data());
        } catch (e) { console.error(e); }
    };

    const cargarColecciones = async () => {
        try {
            const q = query(collection(db, "colecciones_libros"), where("authorId", "==", user.uid));
            const snap = await getDocs(q);
            let list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setColecciones(list);
        } catch (e) { console.error(e); }
    };

    const cargarFavoritos = async () => {
        try {
            const q = query(collection(db, "favoritos"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            setFavoritos(snap.docs.map(d => d.data().bookId));
        } catch (e) { console.error(e); }
    };

    const cargarLibros = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "libros_publicados"));
            let booksData = [];
            querySnapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                if (data.visibilidad !== 'oculto') {
                    booksData.push(data);
                } else if (data.authorId === user.uid || isAdmin) {
                    booksData.push(data);
                }
            });
            booksData.sort((a, b) => b.createdAt - a.createdAt);
            setBooks(booksData);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const toggleFavorito = async (e, book) => {
        e.stopPropagation();
        const isFav = favoritos.includes(book.id);
        const favId = `${user.uid}_${book.id}`; // ID Compuesto para encontrarlo fácil

        try {
            if (isFav) {
                await deleteDoc(doc(db, "favoritos", favId));
                setFavoritos(prev => prev.filter(id => id !== book.id));
            } else {
                await setDoc(doc(db, "favoritos", favId), {
                    userId: user.uid,
                    bookId: book.id,
                    addedAt: Date.now()
                });
                setFavoritos(prev => [...prev, book.id]);
            }
        } catch (error) {
            console.error("Error al guardar favorito", error);
        }
    };

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;
        try {
            await addDoc(collection(db, "colecciones_libros"), {
                nombre: newCollectionName.trim(),
                authorId: user.uid,
                createdAt: Date.now()
            });
            setNewCollectionName('');
            setShowCollectionModal(false);
            cargarColecciones();
        } catch (e) { console.error(e); }
    };

    const handleCategoryCheckbox = (cat) => {
        let current = [...uploadData.categorias];
        if (current.includes(cat)) {
            current = current.filter(c => c !== cat);
        } else {
            if (current.length >= 4) return alert("Puedes seleccionar un máximo de 4 categorías.");
            current.push(cat);
        }
        setUploadData({ ...uploadData, categorias: current });
    };

    const handleUploadPaisChange = (e) => {
        const codigo = e.target.value;
        const nombre = codigo ? Country.getCountryByCode(codigo).name : '';
        setUploadData({ ...uploadData, paisCode: codigo, paisNombre: nombre, estadoCode: '', estadoNombre: '', municipio: '' });
    };

    const handleUploadEstadoChange = (e) => {
        const codigo = e.target.value;
        const nombre = codigo ? State.getStateByCodeAndCountry(codigo, uploadData.paisCode).name : '';
        setUploadData({ ...uploadData, estadoCode: codigo, estadoNombre: nombre, municipio: '' });
    };

    const handleFilterPaisChange = (e) => {
        const codigo = e.target.value;
        const nombre = codigo ? Country.getCountryByCode(codigo).name : '';
        setFilterPaisCode(codigo);
        setFilterPaisNombre(nombre);
        setFilterEstadoCode('');
        setFilterEstadoNombre('');
        setFilterMunicipio('');
    };

    const handleFilterEstadoChange = (e) => {
        const codigo = e.target.value;
        const nombre = codigo ? State.getStateByCodeAndCountry(codigo, filterPaisCode).name : '';
        setFilterEstadoCode(codigo);
        setFilterEstadoNombre(nombre);
        setFilterMunicipio('');
    };

    const handleClearLocationFilters = () => {
        setFilterPaisCode('');
        setFilterPaisNombre('');
        setFilterEstadoCode('');
        setFilterEstadoNombre('');
        setFilterMunicipio('');
    };

    const handleClearAdditionalFilters = () => {
        setFilterAno('');
        setFilterMes('');
        setFilterAutor('');
    };

    const handleUploadPDF = async (e) => {
        e.preventDefault();
        if (!uploadData.file) return alert("Debes seleccionar un PDF.");
        if (uploadData.categorias.length < 1) return alert("Debes seleccionar al menos 1 categoría.");

        setIsUploading(true);
        try {
            const pdfRef = ref(storage, `pdfs/${Date.now()}_${uploadData.file.name}`);
            await uploadBytes(pdfRef, uploadData.file);
            const pdfUrl = await getDownloadURL(pdfRef);

            let coverUrl = '';
            if (uploadData.cover) {
                const coverRef = ref(storage, `covers/${Date.now()}_${uploadData.cover.name}`);
                await uploadBytes(coverRef, uploadData.cover);
                coverUrl = await getDownloadURL(coverRef);
            }

            const newBook = {
                titulo: uploadData.titulo,
                descripcion: uploadData.descripcion,
                categorias: uploadData.categorias,
                visibilidad: uploadData.visibilidad,
                coleccionId: uploadData.coleccionId || 'generales',
                pais: uploadData.paisNombre,
                estado: uploadData.estadoNombre,
                municipio: uploadData.municipio,
                pdfUrl: pdfUrl,
                coverUrl: coverUrl,
                authorId: user.uid,
                authorName: user.displayName,
                createdAt: Date.now(),
                allowedUsers: [],
                accessCodes: [],
                views: 0
            };

            await addDoc(collection(db, "libros_publicados"), newBook);
            alert("¡Publicación subida con éxito!");
            setShowUploadModal(false);
            setUploadData({
                titulo: '', descripcion: '', categorias: [], visibilidad: 'publico', coleccionId: 'generales', file: null, cover: null,
                paisCode: '', paisNombre: '', estadoCode: '', estadoNombre: '', municipio: ''
            });
            cargarLibros();
        } catch (error) {
            console.error("DETALLE DEL ERROR:", error);
            alert("Error de Firebase: " + error.message);
        } finally { setIsUploading(false); }
    };

    const handleUpdateCover = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const storageRef = ref(storage, `perfiles/${user.uid}_cover`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await setDoc(doc(db, "usuarios", user.uid), { coverUrl: url, uid: user.uid }, { merge: true });
        setProfileData(prev => ({ ...prev, coverUrl: url }));
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!reportReason) return alert("Selecciona un motivo de denuncia.");

        setIsSubmittingReport(true);
        try {
            await addDoc(collection(db, "denuncias"), {
                bookId: reportingBook.id,
                bookTitle: reportingBook.titulo,
                reportedAuthorId: reportingBook.authorId,
                reporterId: user.uid,
                reporterName: user.displayName || user.email,
                reason: reportReason,
                details: reportDetails,
                status: 'pendiente',
                createdAt: Date.now()
            });
            alert("Denuncia enviada exitosamente. Un administrador revisará el caso.");
            setReportingBook(null);
            setReportReason('');
            setReportDetails('');
        } catch (error) {
            console.error(error);
            alert("Hubo un error al enviar tu reporte.");
        } finally {
            setIsSubmittingReport(false);
        }
    };

    // FILTROS AVANZADOS PARA "MI ESPACIO"
    const librosMiEspacio = books.filter(b => {
        // 1. Filtrar por Sección Lateral (Acordeón)
        if (selectedCollectionId === 'guardados') {
            if (!favoritos.includes(b.id)) return false;
        } else if (selectedCollectionId === 'compartidos_conmigo') {
            // Solo los que NO son míos, pero tengo acceso explícito
            const isInvited = (b.allowedUsers || []).includes(user.uid) || (b.allowedUsers || []).includes(user.email);
            if (b.authorId === user.uid || !isInvited) return false;
        } else {
            // "Mis Documentos"
            if (b.authorId !== user.uid) return false;
            if (selectedCollectionId !== 'Todos' && b.coleccionId !== selectedCollectionId) return false;
        }

        // 2. Filtros UI Superiores
        if (categoryFilter !== 'Todas' && !b.categorias?.includes(categoryFilter)) return false;
        if (searchQuery && !b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) && !b.authorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterPaisNombre && b.pais !== filterPaisNombre) return false;
        if (filterEstadoNombre && b.estado !== filterEstadoNombre) return false;
        if (filterMunicipio && b.municipio !== filterMunicipio) return false;
        if (filterAutor && b.authorName.toLowerCase() !== filterAutor.toLowerCase()) return false;

        if (filterAno || filterMes) {
            const d = new Date(b.createdAt);
            if (filterAno && d.getFullYear().toString() !== filterAno) return false;
            if (filterMes && d.getMonth().toString() !== filterMes) return false; // filterMes usa index 0-11
        }

        return true;
    });

    const explorerBooks = books.filter(b => b.visibilidad !== 'oculto');

    const librosBusqueda = explorerBooks.filter(b => {
        if (categoryFilter !== 'Todas' && !b.categorias?.includes(categoryFilter)) return false;
        if (searchQuery && !b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) && !b.authorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterPaisNombre && b.pais !== filterPaisNombre) return false;
        if (filterEstadoNombre && b.estado !== filterEstadoNombre) return false;
        if (filterMunicipio && b.municipio !== filterMunicipio) return false;
        return true;
    });

    const librosRecientes = [...explorerBooks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const librosPopulares = [...explorerBooks].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

    const authorsMap = {};
    explorerBooks.forEach(b => {
        if (!authorsMap[b.authorId]) authorsMap[b.authorId] = { id: b.authorId, name: b.authorName, count: 0 };
        authorsMap[b.authorId].count += 1;
    });
    const editoresDestacados = Object.values(authorsMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // COMPONENTE TARJETA REDISEÑADA
    const BookCard = ({ book }) => {
        const canPreview = book.visibilidad === 'publico' || book.authorId === user?.uid || isAdmin || (book.allowedUsers || []).includes(user?.email) || (book.allowedUsers || []).includes(user?.uid);
        const isFav = favoritos.includes(book.id);

        const handleCardClick = (e) => {
            e.stopPropagation();
            if (canPreview) navigate(`/visor/${book.id}`);
        };

        return (
            <div className={`bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-all duration-500 flex flex-col relative w-full aspect-[3/4] ${canPreview ? 'hover:shadow-2xl group' : 'opacity-95'}`}>

                {/* BOTONES SUPERIORES (AJUSTES O GUARDAR) */}
                {activeTab === 'mi_perfil' && (book.authorId === user?.uid || isAdmin) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                        className="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur-md text-slate-700 hover:text-emerald-600 p-2.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        title="Gestionar Accesos"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                )}

                {user && book.authorId !== user?.uid && canPreview && (
                    <button
                        onClick={(e) => toggleFavorito(e, book)}
                        className={`absolute top-3 left-3 z-30 backdrop-blur-md p-2.5 rounded-xl shadow-lg transition-all hover:scale-110 ${isFav ? 'bg-emerald-600/90 text-white opacity-100' : 'bg-white/90 text-slate-500 hover:text-emerald-600 opacity-0 group-hover:opacity-100'}`}
                        title={isFav ? "Quitar de Guardados" : "Guardar Documento"}
                    >
                        {isFav ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                    </button>
                )}

                <div onClick={handleCardClick} className={`flex-1 bg-slate-50 relative overflow-hidden ${canPreview ? 'cursor-pointer' : 'cursor-not-allowed'}`}>

                    {/* PORTADA BASE (SIEMPRE SE MUESTRA, PERO CENSURADA SI NO HAY ACCESO) */}
                    {book.coverUrl ? (
                        <img src={book.coverUrl} alt="Portada" className={`w-full h-full object-cover transition-transform duration-700 ${canPreview ? 'group-hover:scale-110' : ''}`} />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300">
                            <BookOpen className="w-16 h-16 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Documento</span>
                        </div>
                    )}

                    {/* OVERLAY PARA CONTENIDO PRIVADO BLOQUEADO (Efecto Velo Translúcido) */}
                    {!canPreview && (
                        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-all">
                            <Lock className="w-14 h-14 mb-3 text-slate-200/80" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 bg-black/40 px-3 py-1 rounded-md">Contenido Privado</span>
                        </div>
                    )}

                    {canPreview && <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>}

                    {/* INDICADORES VISUALES DE PRIVACIDAD */}
                    <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                        {book.visibilidad === 'privado' && canPreview && <div className="bg-slate-900/80 backdrop-blur-md text-white p-1.5 rounded-lg shadow-sm"><Lock className="w-3.5 h-3.5" /></div>}
                        {book.visibilidad === 'oculto' && <div className="bg-red-600/80 backdrop-blur-md text-white p-1.5 rounded-lg shadow-sm"><EyeOff className="w-3.5 h-3.5" /></div>}
                    </div>

                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[90%] z-20">
                        {book.categorias?.map(cat => (
                            <span key={cat} className="bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>

                <div onClick={handleCardClick} className={`p-4 bg-white shrink-0 text-left flex flex-col justify-between z-10 ${canPreview ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div>
                        <h3 className={`font-serif font-bold text-slate-900 text-sm md:text-base leading-tight mb-1 truncate transition-colors ${canPreview ? 'group-hover:text-emerald-700' : ''}`}>
                            {book.titulo}
                        </h3>
                        <p
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canPreview) navigate(`/perfil/${book.authorId}`);
                            }}
                            className={`text-xs text-slate-500 truncate font-medium ${canPreview ? 'hover:text-emerald-600 transition-colors cursor-pointer' : ''}`}
                        >
                            Por {book.authorName}
                        </p>
                        {(book.pais || book.estado) && (
                            <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1 uppercase tracking-wider font-bold">
                                <MapPin className="w-3 h-3 text-emerald-500" /> {book.estado ? `${book.estado}, ` : ''}{book.pais}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-3 pt-3 border-t border-slate-50 uppercase tracking-widest">
                        <div className="flex items-center gap-3">
                            <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                            {canPreview && <span className="flex items-center gap-1 text-emerald-600"><EyeOff className="w-3 h-3 hidden" /> 👁️ {book.views || 0}</span>}
                        </div>

                        {user && book.authorId !== user.uid && canPreview && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setReportingBook(book); }}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-md"
                                title="Reportar esta publicación"
                            >
                                <Flag className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-800">

            <nav className="bg-white px-6 md:px-8 py-5 border-b border-slate-200 shrink-0 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="bg-slate-900 p-2.5 rounded-xl shadow-md">
                        <Library className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-serif font-black text-slate-900 leading-none">Biblioteca Central</h1>
                        <p className="text-gray-500 text-xs mt-1 font-medium tracking-wide">Repositorio de Investigaciones</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => { setActiveTab('explorar'); setSelectedCollectionId('Todos'); setSearchQuery(''); }} className={`px-4 md:px-6 py-2 md:py-2.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${activeTab === 'explorar' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        <Compass className="w-4 h-4" /> <span className="hidden sm:inline">Explorar</span>
                    </button>
                    <button onClick={() => { setActiveTab('mi_perfil'); setSelectedCollectionId('Todos'); setSearchQuery(''); setOpenSidebarSection('mis_documentos'); }} className={`px-4 md:px-6 py-2 md:py-2.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${activeTab === 'mi_perfil' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        <User className="w-4 h-4" /> <span className="hidden sm:inline">Mi Espacio</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">

                {activeTab === 'explorar' ? (
                    !searchQuery && categoryFilter === 'Todas' && !filterPaisCode && (
                        <div className="relative bg-slate-900 h-72 md:h-96 shrink-0 overflow-hidden">
                            {CAROUSEL_IMAGES.map((img, idx) => (
                                <img key={idx} src={img} alt="Banner" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-60 scale-105' : 'opacity-0 scale-100'}`} />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-3">Archivo de Conocimiento</p>
                                <h1 className="text-4xl md:text-6xl font-serif font-black text-white drop-shadow-xl mb-4 leading-tight">
                                    Catálogo Colectivo
                                </h1>
                                <p className="text-gray-300 text-sm md:text-base max-w-2xl drop-shadow-md font-light">
                                    Explora documentos, investigaciones regionales y guías de campo publicadas por nuestra comunidad de expertos.
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="w-full shrink-0 bg-white border-b border-slate-200 pb-8 shadow-sm">
                        <div className="relative w-full h-48 md:h-64 bg-slate-900 group overflow-hidden">
                            {profileData.coverUrl ? (
                                <img src={profileData.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>

                            <label className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-lg">
                                <ImageIcon className="w-4 h-4" /> Cambiar Portada
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpdateCover} />
                            </label>
                        </div>

                        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 relative z-10">
                            <img src={profileData.avatarUrl || "https://via.placeholder.com/150"} alt="Avatar" className="w-32 h-32 md:w-40 h-40 rounded-full border-4 border-white shadow-2xl object-cover bg-white shrink-0" />
                            <div className="mb-2">
                                <h2 className="text-3xl md:text-4xl font-serif font-black text-slate-900 leading-tight">{user?.displayName}</h2>
                                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-1">
                                    {isAdmin ? '⭐ Administrador Principal' : 'Investigador Registrado'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* BARRAS DE FILTROS Y BÚSQUEDA */}
                <div className={`px-6 max-w-5xl mx-auto w-full transition-all duration-500 ${activeTab === 'explorar' && !searchQuery && categoryFilter === 'Todas' && !filterPaisCode ? '-mt-16 relative z-10' : 'mt-8'}`}>

                    {/* BARRA 1: Búsqueda y Categorías */}
                    <div className="bg-white p-2.5 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-3 mb-4">
                        <div className="flex-1 flex items-center px-4 w-full">
                            <Search className="w-5 h-5 text-emerald-600 shrink-0" />
                            <input type="text" placeholder="Buscar por título, autor o tema..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-3 bg-transparent text-sm md:text-base text-slate-800 focus:outline-none py-2 font-medium" />
                        </div>
                        <div className="hidden md:block w-px h-8 bg-slate-200" />
                        <div className="flex items-center w-full md:w-auto px-4 shrink-0 bg-slate-50 rounded-2xl py-2 md:py-0 border md:border-none border-slate-100">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none w-full md:w-auto py-1">
                                <option value="Todas">Todas las categorías</option>
                                {listaCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* BARRA 2: Filtros Geográficos y Temporales */}
                    <div className="bg-slate-900 p-2.5 md:p-3 rounded-2xl shadow-lg flex flex-col lg:flex-row items-center gap-3">
                        <div className="flex items-center px-3 shrink-0 text-emerald-400">
                            <Globe className="w-5 h-5 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-wider hidden md:block">Filtros:</span>
                        </div>

                        {/* Filtros Geográficos */}
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                            <select value={filterPaisCode} onChange={handleFilterPaisChange} className="w-full bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="">País...</option>
                                {Country.getAllCountries().map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                            </select>
                            <select value={filterEstadoCode} onChange={handleFilterEstadoChange} disabled={!filterPaisCode} className="w-full bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50">
                                <option value="">Estado...</option>
                                {filterPaisCode && State.getStatesOfCountry(filterPaisCode).map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                            </select>
                            <select value={filterMunicipio} onChange={(e) => setFilterMunicipio(e.target.value)} disabled={!filterEstadoCode} className="w-full bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50">
                                <option value="">Municipio...</option>
                                {filterEstadoCode && City.getCitiesOfState(filterPaisCode, filterEstadoCode).map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
                            </select>
                        </div>

                        {/* Filtros de Mi Espacio (Fecha y Autor) */}
                        {activeTab === 'mi_perfil' && (
                            <>
                                <div className="hidden lg:block w-px h-6 bg-slate-700 mx-1"></div>
                                <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                                    <select value={filterAno} onChange={(e) => setFilterAno(e.target.value)} className="w-full sm:w-24 bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white outline-none">
                                        <option value="">Año...</option>
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </select>
                                    <select value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-full sm:w-28 bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white outline-none">
                                        <option value="">Mes...</option>
                                        {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                    {selectedCollectionId !== 'Todos' && selectedCollectionId !== 'generales' && (
                                        <input type="text" placeholder="Autor..." value={filterAutor} onChange={(e) => setFilterAutor(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-slate-500" />
                                    )}
                                </div>
                            </>
                        )}

                        {(filterPaisCode || filterEstadoCode || filterMunicipio || filterAno || filterMes || filterAutor) && (
                            <button onClick={() => { handleClearLocationFilters(); handleClearAdditionalFilters(); }} className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap">
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'mi_perfil' && (
                    <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-8 flex flex-wrap gap-4 shrink-0">
                        <button onClick={() => setShowUploadModal(true)} className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5">
                            <Upload className="w-4 h-4" /> Subir Documento
                        </button>
                        <button onClick={() => setShowCollectionModal(true)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5">
                            <FolderPlus className="w-4 h-4 text-emerald-600" /> Crear Carpeta
                        </button>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 w-full flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                            <p className="font-bold uppercase tracking-widest text-xs">Cargando Biblioteca...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'explorar' ? (
                                (searchQuery || categoryFilter !== 'Todas' || filterPaisCode) ? (
                                    <div className="animate-in fade-in">
                                        <h2 className="text-2xl font-serif font-black text-slate-900 mb-8 border-b border-slate-200 pb-4">
                                            Resultados de Búsqueda <span className="text-slate-400 font-sans text-sm ml-2">({librosBusqueda.length} documentos)</span>
                                        </h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
                                            {librosBusqueda.map(book => <BookCard key={book.id} book={book} />)}
                                        </div>
                                        {librosBusqueda.length === 0 && (
                                            <div className="text-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                                <p className="text-lg font-serif text-slate-500">No se encontraron documentos con estos criterios.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-24 animate-in fade-in">

                                        <section>
                                            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
                                                <Clock className="w-6 h-6 text-emerald-600" />
                                                <h2 className="text-3xl font-serif font-black text-slate-900">Agregados Recientemente</h2>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
                                                {librosRecientes.map(book => <BookCard key={book.id} book={book} />)}
                                            </div>
                                        </section>

                                        {librosPopulares.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
                                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                                    <h2 className="text-3xl font-serif font-black text-slate-900">Los Más Leídos</h2>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
                                                    {librosPopulares.map(book => <BookCard key={`pop_${book.id}`} book={book} />)}
                                                </div>
                                            </section>
                                        )}

                                        {editoresDestacados.length > 0 && (
                                            <section className="bg-slate-900 p-10 md:p-14 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                                <Star className="absolute -top-10 -right-10 w-64 h-64 text-slate-800 opacity-50" />

                                                <div className="flex items-center gap-3 mb-10 relative z-10">
                                                    <h2 className="text-3xl font-serif font-black text-white">Autores Destacados</h2>
                                                </div>

                                                <div className="flex flex-wrap gap-10 justify-center md:justify-start relative z-10">
                                                    {editoresDestacados.map(author => (
                                                        <div key={author.id} onClick={() => { navigate(`/perfil/${author.id}`); }} className="flex flex-col items-center cursor-pointer group">
                                                            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-blue-500 rounded-full p-1 mb-4 group-hover:scale-110 transition-transform shadow-xl">
                                                                <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-900">
                                                                    <User className="w-10 h-10 text-slate-400" />
                                                                </div>
                                                            </div>
                                                            <p className="font-serif font-bold text-white text-base group-hover:text-emerald-400 transition-colors">{author.name.split(' ')[0]}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{author.count} Publicaciones</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col lg:flex-row gap-8 items-start w-full animate-in fade-in">

                                    {/* MENU LATERAL ACORDEÓN: DOCUMENTOS */}
                                    <aside className="w-full lg:w-72 shrink-0 space-y-4 sticky top-6">

                                        {/* SECCIÓN 1: MIS DOCUMENTOS */}
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                            <button onClick={() => setOpenSidebarSection(openSidebarSection === 'mis_documentos' ? '' : 'mis_documentos')} className="w-full p-5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Folder className="w-5 h-5 text-emerald-600" />
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Mis Documentos</span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSidebarSection === 'mis_documentos' ? 'rotate-180' : ''}`} />
                                            </button>

                                            <div className={`transition-all duration-300 ${openSidebarSection === 'mis_documentos' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                                <div className="p-3 space-y-1">
                                                    <button onClick={() => setSelectedCollectionId('Todos')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCollectionId === 'Todos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                        📁 Todos mis documentos
                                                    </button>
                                                    <button onClick={() => setSelectedCollectionId('generales')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCollectionId === 'generales' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                        📄 Documentos Sueltos
                                                    </button>

                                                    {colecciones.length > 0 && <div className="h-px bg-slate-100 my-3 mx-2"></div>}

                                                    {colecciones.map(col => (
                                                        <button key={col.id} onClick={() => setSelectedCollectionId(col.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all truncate ${selectedCollectionId === col.id ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                            📂 {col.nombre}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECCIÓN 2: COMPARTIDOS */}
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                            <button onClick={() => setOpenSidebarSection(openSidebarSection === 'compartidos' ? '' : 'compartidos')} className="w-full p-5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <User className="w-5 h-5 text-blue-600" />
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Compartidos</span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSidebarSection === 'compartidos' ? 'rotate-180' : ''}`} />
                                            </button>

                                            <div className={`transition-all duration-300 ${openSidebarSection === 'compartidos' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                                <div className="p-3 space-y-1">
                                                    <button onClick={() => setSelectedCollectionId('guardados')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedCollectionId === 'guardados' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                        <Bookmark className="w-4 h-4 text-amber-500" /> Guardados
                                                    </button>
                                                    <button onClick={() => setSelectedCollectionId('compartidos_conmigo')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedCollectionId === 'compartidos_conmigo' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                        <Lock className="w-4 h-4 text-indigo-500" /> Desbloqueados por mí
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </aside>

                                    <div className="flex-1 w-full">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                            {librosMiEspacio.map(book => <BookCard key={book.id} book={book} />)}
                                        </div>
                                        {librosMiEspacio.length === 0 && (
                                            <div className="py-32 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                                <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p className="text-lg font-serif">No se encontraron documentos en esta sección.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* MODAL: SUBIR PUBLICACIÓN */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Upload className="w-5 h-5 text-emerald-600" /> Publicar Documento</h2>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 bg-white border border-slate-200 p-2 rounded-full hover:bg-slate-100 transition"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleUploadPDF} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título de la Obra</label>
                                <input type="text" required value={uploadData.titulo} onChange={e => setUploadData({ ...uploadData, titulo: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" />
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Ubicación Geográfica del Estudio (Opcional)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <select value={uploadData.paisCode} onChange={handleUploadPaisChange} className="w-full border border-blue-200 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-blue-500 transition-all text-slate-700">
                                            <option value="">Selecciona País...</option>
                                            {Country.getAllCountries().map(country => (
                                                <option key={country.isoCode} value={country.isoCode}>{country.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select value={uploadData.estadoCode} onChange={handleUploadEstadoChange} disabled={!uploadData.paisCode} className="w-full border border-blue-200 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-blue-500 transition-all text-slate-700 disabled:opacity-50 disabled:bg-slate-50">
                                            <option value="">Selecciona Estado...</option>
                                            {uploadData.paisCode && State.getStatesOfCountry(uploadData.paisCode).map(state => (
                                                <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select value={uploadData.municipio} onChange={e => setUploadData({ ...uploadData, municipio: e.target.value })} disabled={!uploadData.estadoCode} className="w-full border border-blue-200 rounded-xl p-2.5 text-xs bg-white outline-none focus:border-blue-500 transition-all text-slate-700 disabled:opacity-50 disabled:bg-slate-50">
                                            <option value="">Selecciona Municipio/Ciudad...</option>
                                            {uploadData.estadoCode && City.getCitiesOfState(uploadData.paisCode, uploadData.estadoCode).map(city => (
                                                <option key={city.name} value={city.name}>{city.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Temáticas (Máximo 4)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {listaCategorias.map(cat => {
                                        const checked = uploadData.categorias.includes(cat);
                                        return (
                                            <label key={cat} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${checked ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                <input type="checkbox" checked={checked} onChange={() => handleCategoryCheckbox(cat)} className="hidden" />
                                                {cat}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Carpeta Destino</label>
                                    <select value={uploadData.coleccionId} onChange={e => setUploadData({ ...uploadData, coleccionId: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white outline-none focus:border-emerald-500 transition-all">
                                        <option value="generales">📄 PDFs Generales</option>
                                        {colecciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Privacidad</label>
                                    <select value={uploadData.visibilidad} onChange={e => setUploadData({ ...uploadData, visibilidad: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white outline-none focus:border-emerald-500 transition-all">
                                        <option value="publico">🌍 Público</option>
                                        <option value="privado">🔒 Privado</option>
                                        <option value="oculto">👻 Oculto</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Archivo PDF (Obligatorio)</label>
                                    <input type="file" accept=".pdf" required onChange={e => setUploadData({ ...uploadData, file: e.target.files[0] })} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Portada / Miniatura (Opcional)</label>
                                    <input type="file" accept="image/*" onChange={e => setUploadData({ ...uploadData, cover: e.target.files[0] })} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black transition-transform shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {isUploading ? 'Subiendo...' : 'Publicar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREAR COLECCIÓN */}
            {showCollectionModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h2 className="text-base font-black text-slate-800 flex items-center gap-2"><FolderPlus className="w-5 h-5 text-emerald-600" /> Nueva Carpeta</h2>
                            <button onClick={() => setShowCollectionModal(false)} className="text-slate-400 bg-white border border-slate-200 p-1.5 rounded-full hover:bg-slate-100 transition"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleCreateCollection} className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de la carpeta</label>
                                <input type="text" required value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="Ej. Aves Nuevo León..." className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCollectionModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                                <button type="submit" className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DENUNCIAR PUBLICACIÓN */}
            {reportingBook && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
                            <h2 className="text-base font-black text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> Reportar Documento</h2>
                            <button onClick={() => setReportingBook(null)} className="text-red-500 bg-white border border-red-200 p-1.5 rounded-full hover:bg-red-100 transition"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmitReport} className="p-6 space-y-5">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Documento Implicado</p>
                                <p className="text-sm font-serif font-bold text-slate-900 truncate">"{reportingBook.titulo}"</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo de la denuncia</label>
                                <select required value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all">
                                    <option value="">Selecciona un motivo...</option>
                                    <option value="plagio">Copia o Plagio de contenido</option>
                                    <option value="desinformacion">Desinformación / Datos falsos</option>
                                    <option value="sexual">Contenido sexual explícito</option>
                                    <option value="odio">Discurso de odio / Acoso</option>
                                    <option value="spam">Spam / Publicidad engañosa</option>
                                    <option value="otro">Otro motivo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detalles (Opcional)</label>
                                <textarea
                                    value={reportDetails}
                                    onChange={e => setReportDetails(e.target.value)}
                                    rows="3"
                                    placeholder="Explica brevemente la situación..."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setReportingBook(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                                <button type="submit" disabled={isSubmittingReport} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2">
                                    {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                                    Enviar Reporte
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL AJUSTES DEL AUTOR */}
            {editingBook && (
                <BookManagerModal book={editingBook} onClose={() => setEditingBook(null)} onUpdate={cargarLibros} />
            )}
        </div>
    );
}