import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload, Lock, EyeOff, Search, Filter, Compass, User, Image as ImageIcon, Loader2, Bookmark, Settings, ChevronLeft, ChevronRight, TrendingUp, Clock, Star, Library, FolderPlus, Folder, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { getAuth } from 'firebase/auth';
import BookManagerModal from './BookManagerModal';

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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('explorar');
    const [selectedColeccion, setSelectedColeccion] = useState('Todos');

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [currentSlide, setCurrentSlide] = useState(0);

    const [profileData, setProfileData] = useState({ coverUrl: '', avatarUrl: user?.photoURL || '' });

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    const [uploadData, setUploadData] = useState({
        titulo: '', descripcion: '', categorias: [], visibilidad: 'publico', coleccionId: '', file: null, cover: null
    });
    const [editingBook, setEditingBook] = useState(null);

    const listaCategorias = ['Conservación', 'Aves', 'Árboles', 'Mamíferos', 'Océano', 'Tecnología', 'General'];

    useEffect(() => {
        if (user) {
            cargarPerfil();
            cargarLibros();
            cargarColecciones();
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

    const cargarLibros = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "libros_publicados"));
            let booksData = [];
            querySnapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                if (data.visibilidad === 'publico') booksData.push(data);
                else if (data.authorId === user.uid) booksData.push(data);
                else if (data.allowedUsers?.includes(user.uid)) booksData.push(data);
                else if (isAdmin) booksData.push(data);
            });
            booksData.sort((a, b) => b.createdAt - a.createdAt);
            setBooks(booksData);
        } catch (error) { console.error(error); } finally { setLoading(false); }
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
                coleccionId: uploadData.coleccionId || null,
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
            setUploadData({ titulo: '', descripcion: '', categorias: [], visibilidad: 'publico', coleccionId: '', file: null, cover: null });
            cargarLibros();
        } catch (error) { alert("Error al subir archivo."); } finally { setIsUploading(false); }
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

    const librosFiltrados = books.filter(b => {
        if (activeTab === 'mi_perfil' && b.authorId !== user.uid) return false;
        if (selectedColeccion !== 'Todos' && b.coleccionId !== selectedColeccion) return false;
        if (categoryFilter !== 'Todas' && !b.categorias?.includes(categoryFilter)) return false;
        if (searchQuery && !b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) && !b.authorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const librosBusqueda = books.filter(b => {
        if (categoryFilter !== 'Todas' && !b.categorias?.includes(categoryFilter)) return false;
        if (searchQuery && !b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) && !b.authorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const librosRecientes = [...books].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const librosPopulares = [...books].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

    const authorsMap = {};
    books.forEach(b => {
        if (!authorsMap[b.authorId]) authorsMap[b.authorId] = { id: b.authorId, name: b.authorName, count: 0 };
        authorsMap[b.authorId].count += 1;
    });
    const editoresDestacados = Object.values(authorsMap).sort((a, b) => b.count - a.count).slice(0, 5);

    const BookCard = ({ book }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative w-full aspect-[3/4]">
            {(book.authorId === user.uid || isAdmin) && (
                <button
                    onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                    className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-md text-gray-700 hover:text-emerald-600 p-2 rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Gestionar Accesos"
                >
                    <Settings className="w-4 h-4" />
                </button>
            )}
            <div onClick={() => navigate(`/visor/${book.id}`)} className="flex-1 bg-gray-100 relative overflow-hidden cursor-pointer">
                {book.coverUrl ? (
                    <img src={book.coverUrl} alt="Portada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-200"><BookOpen className="w-12 h-12" /></div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                    {book.visibilidad === 'privado' && <div className="bg-amber-500 text-white p-1 rounded shadow-sm"><Lock className="w-3 h-3" /></div>}
                    {book.visibilidad === 'oculto' && <div className="bg-gray-800 text-white p-1 rounded shadow-sm"><EyeOff className="w-3 h-3" /></div>}
                </div>
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[90%] z-10">
                    {book.categorias?.map(cat => (
                        <span key={cat} className="bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                            {cat}
                        </span>
                    ))}
                </div>
            </div>
            <div onClick={() => navigate(`/visor/${book.id}`)} className="p-3 bg-white border-t border-gray-100 shrink-0 cursor-pointer text-left">
                <h3 className="font-bold text-gray-800 text-xs leading-tight mb-0.5 truncate group-hover:text-emerald-600 transition-colors">{book.titulo}</h3>
                <p
                    onClick={(e) => { e.stopPropagation(); navigate(`/perfil/${book.authorId}`); }}
                    className="text-[10px] text-gray-400 truncate mb-1 hover:text-emerald-500 hover:underline cursor-pointer"
                >
                    Por {book.authorName}
                </p>
                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
                    <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                    <span>👁️ {book.views || 0}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-gray-50 flex flex-col font-sans overflow-hidden">
            <nav className="bg-white px-6 py-4 border-b border-gray-200 shrink-0 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                        <Library className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-gray-800 leading-none">Biblioteca Digital</h1>
                        <p className="text-gray-500 text-xs mt-1">Gestión & Documentos Colectivos</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => { setActiveTab('explorar'); setSelectedColeccion('Todos'); setSearchQuery(''); }} className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'explorar' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Compass className="w-4 h-4" /> Explorar
                    </button>
                    <button onClick={() => { setActiveTab('mi_perfil'); setSelectedColeccion('Todos'); setSearchQuery(''); }} className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'mi_perfil' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <User className="w-4 h-4" /> Mi Espacio
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                {activeTab === 'explorar' ? (
                    !searchQuery && categoryFilter === 'Todas' && (
                        <div className="relative bg-black h-64 shrink-0">
                            {CAROUSEL_IMAGES.map((img, idx) => (
                                <img key={idx} src={img} alt="Banner" className={`absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-50' : 'opacity-0'}`} />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                                <h1 className="text-3xl font-black text-white drop-shadow-md">Catálogo Colectivo</h1>
                                <p className="text-gray-200 text-xs max-w-xl mt-1 drop-shadow-sm font-medium">Busca y lee informes de campo o investigaciones regionales.</p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="w-full shrink-0 bg-white border-b border-gray-200 pb-6">
                        <div className="relative w-full h-40 md:h-56 bg-slate-800 group">
                            {profileData.coverUrl ? <img src={profileData.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-70" /> : <div className="w-full h-full bg-gradient-to-r from-emerald-900 to-slate-900" />}
                            <label className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 backdrop-blur-sm">
                                <ImageIcon className="w-3.5 h-3.5" /> Cambiar Portada
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpdateCover} />
                            </label>
                        </div>
                        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center gap-4 -mt-10 relative z-10">
                            <img src={profileData.avatarUrl || "https://via.placeholder.com/150"} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white shrink-0" />
                            <div className="mt-8 md:mt-12">
                                <h2 className="text-2xl font-black text-gray-800 leading-tight">{user?.displayName}</h2>
                                <p className="text-xs font-semibold text-gray-500">{isAdmin ? '⭐ Administrador del Sistema' : 'Investigador de Campo'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`px-4 max-w-4xl mx-auto w-full transition-all duration-300 ${activeTab === 'explorar' && !searchQuery && categoryFilter === 'Todas' ? '-mt-8 relative z-10' : 'mt-8'}`}>
                    <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-2">
                        <div className="flex-1 flex items-center px-4 w-full">
                            <Search className="w-5 h-5 text-gray-400 shrink-0" />
                            <input type="text" placeholder="Buscar publicaciones globales..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-2 bg-transparent text-sm text-gray-700 focus:outline-none py-1.5 font-medium" />
                        </div>
                        <div className="hidden md:block w-px h-6 bg-gray-200" />
                        <div className="flex items-center w-full md:w-auto px-2 shrink-0">
                            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1" />
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 cursor-pointer outline-none w-full md:w-auto py-1">
                                <option value="Todas">Todas las categorías</option>
                                {listaCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {activeTab === 'mi_perfil' && (
                    <div className="max-w-7xl mx-auto w-full px-6 mt-4 flex gap-3 shrink-0">
                        <button onClick={() => setShowUploadModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                            <Upload className="w-4 h-4" /> Subir PDF
                        </button>
                        <button onClick={() => setShowCollectionModal(true)} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                            <FolderPlus className="w-4 h-4 text-emerald-600" /> Crear Colección
                        </button>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
                    ) : (
                        <>
                            {activeTab === 'explorar' ? (
                                (searchQuery || categoryFilter !== 'Todas') ? (
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 mb-6">Resultados de Búsqueda ({librosBusqueda.length})</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                            {librosBusqueda.map(book => <BookCard key={book.id} book={book} />)}
                                        </div>
                                        {librosBusqueda.length === 0 && (
                                            <div className="text-center py-20 text-gray-400">
                                                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>No se encontraron publicaciones con estos criterios.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-16">
                                        <section>
                                            <div className="flex items-center gap-2 mb-6">
                                                <Clock className="w-6 h-6 text-emerald-600" />
                                                <h2 className="text-2xl font-black text-gray-800">Agregados Recientemente</h2>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                {librosRecientes.map(book => <BookCard key={book.id} book={book} />)}
                                            </div>
                                        </section>

                                        {librosPopulares.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                                    <h2 className="text-2xl font-black text-gray-800">Los Más Populares</h2>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                    {librosPopulares.map(book => <BookCard key={`pop_${book.id}`} book={book} />)}
                                                </div>
                                            </section>
                                        )}

                                        {editoresDestacados.length > 0 && (
                                            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-8">
                                                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                                                    <h2 className="text-2xl font-black text-gray-800">Autores Destacados</h2>
                                                </div>
                                                <div className="flex flex-wrap gap-8 justify-center md:justify-start">
                                                    {editoresDestacados.map(author => (
                                                        <div key={author.id} onClick={() => { navigate(`/perfil/${author.id}`); }} className="flex flex-col items-center cursor-pointer group">
                                                            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-blue-500 rounded-full p-1 mb-3 group-hover:scale-110 transition-transform shadow-md">
                                                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white">
                                                                    <User className="w-8 h-8 text-gray-300" />
                                                                </div>
                                                            </div>
                                                            <p className="font-bold text-gray-800 text-sm group-hover:text-emerald-600 transition-colors">{author.name.split(' ')[0]}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{author.count} Pubs.</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                                    <aside className="w-full md:w-56 bg-white border border-gray-200 rounded-2xl p-4 shrink-0 shadow-sm space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-2 flex items-center gap-1">
                                            <Folder className="w-3 h-3" /> Filtrar por Colección
                                        </p>
                                        <button onClick={() => setSelectedColeccion('Todos')} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${selectedColeccion === 'Todos' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                            📁 Ver Todos
                                        </button>
                                        {colecciones.map(col => (
                                            <button key={col.id} onClick={() => setSelectedColeccion(col.id)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition truncate ${selectedColeccion === col.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                📂 {col.nombre}
                                            </button>
                                        ))}
                                    </aside>

                                    <div className="flex-1 w-full">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {librosFiltrados.map(book => <BookCard key={book.id} book={book} />)}
                                        </div>
                                        {librosFiltrados.length === 0 && (
                                            <div className="py-20 text-center text-gray-400 bg-white border border-gray-200 rounded-2xl p-6">
                                                <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-medium">No hay publicaciones cronológicas aquí.</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-base font-black text-gray-800 flex items-center gap-1.5"><Upload className="w-4 h-4 text-emerald-600" /> Publicar Archivo Técnico</h2>
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-400 bg-gray-200 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleUploadPDF} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                <input type="text" required value={uploadData.titulo} onChange={e => setUploadData({ ...uploadData, titulo: e.target.value })} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categorías asociadas (1 a 4 máximo)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    {listaCategorias.map(cat => {
                                        const checked = uploadData.categorias.includes(cat);
                                        return (
                                            <label key={cat} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${checked ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                                <input type="checkbox" checked={checked} onChange={() => handleCategoryCheckbox(cat)} className="hidden" />
                                                {cat}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar a Colección</label>
                                    <select value={uploadData.coleccionId} onChange={e => setUploadData({ ...uploadData, coleccionId: e.target.value })} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white outline-none">
                                        <option value="">Ninguna (Raíz)</option>
                                        {colecciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visibilidad</label>
                                    <select value={uploadData.visibilidad} onChange={e => setUploadData({ ...uploadData, visibilidad: e.target.value })} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white outline-none">
                                        <option value="publico">🌍 Público</option>
                                        <option value="privado">🔒 Privado</option>
                                        <option value="oculto">👻 Oculto</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documento PDF</label>
                                <input type="file" accept=".pdf" required onChange={e => setUploadData({ ...uploadData, file: e.target.files[0] })} className="w-full border border-gray-300 rounded-xl p-2 text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Miniatura de Portada (Opcional)</label>
                                <input type="file" accept="image/*" onChange={e => setUploadData({ ...uploadData, cover: e.target.files[0] })} className="w-full border border-gray-300 rounded-xl p-2 text-xs" />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow flex items-center gap-1.5">
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Publicar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREAR COLECCIÓN */}
            {showCollectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-gray-800 flex items-center gap-1.5"><FolderPlus className="w-4 h-4 text-emerald-600" /> Nueva Colección</h2>
                            <button onClick={() => setShowCollectionModal(false)} className="text-gray-400 bg-gray-200 p-1 rounded-full"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <form onSubmit={handleCreateCollection} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre (Ej. Aves Nuevo León)</label>
                                <input type="text" required value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="Escribe el nombre del grupo..." className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowCollectionModal(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">Crear Grupo</button>
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