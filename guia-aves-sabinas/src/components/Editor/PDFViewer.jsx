import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getAuth } from 'firebase/auth';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Key, Download, LayoutGrid, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración obligatoria para react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const user = getAuth().currentUser;

    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    // Estados del PDF
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [showSidebar, setShowSidebar] = useState(true);

    // Estados para código de acceso
    const [accessCode, setAccessCode] = useState('');
    const [codeError, setCodeError] = useState('');

    useEffect(() => {
        cargarLibro();
    }, [bookId, user]);

    const cargarLibro = async () => {
        try {
            const docRef = doc(db, "libros_publicados", bookId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setBook(data);

                // Sumar 1 a las vistas
                updateDoc(docRef, { views: (data.views || 0) + 1 });

                // Lógica de Permisos
                if (data.visibilidad === 'publico') setHasAccess(true);
                else if (user && data.authorId === user.uid) setHasAccess(true);
                else if (user && data.allowedUsers?.includes(user.uid)) setHasAccess(true);
                else setHasAccess(false);
            } else {
                alert("Esta publicación no existe.");
                navigate('/libros');
            }
        } catch (error) {
            console.error("Error al cargar visor:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCanjearCodigo = async (e) => {
        e.preventDefault();
        if (!user) return alert("Debes iniciar sesión para canjear un código.");

        const codes = book.accessCodes || [];
        const validCodeIndex = codes.findIndex(c => c.code === accessCode.toUpperCase());

        if (validCodeIndex !== -1) {
            const codeData = codes[validCodeIndex];
            const now = new Date().toISOString();

            if (codeData.expiresAt && codeData.expiresAt < now) {
                return setCodeError("Este código ha expirado.");
            }
            if (codeData.maxUses && codeData.used >= codeData.maxUses) {
                return setCodeError("Este código ya alcanzó su límite de usos.");
            }

            // Código válido, dar acceso
            try {
                const docRef = doc(db, "libros_publicados", bookId);
                // Actualizamos el uso del código y agregamos al usuario
                codes[validCodeIndex].used += 1;
                await updateDoc(docRef, {
                    allowedUsers: arrayUnion(user.uid),
                    accessCodes: codes
                });

                setHasAccess(true);
                alert("¡Código canjeado! Tienes acceso a esta publicación.");
            } catch (error) {
                console.error("Error al canjear:", error);
            }
        } else {
            setCodeError("Código inválido.");
        }
    };

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => {
            const newPage = prevPageNumber + offset;
            if (newPage >= 1 && newPage <= numPages) return newPage;
            return prevPageNumber;
        });
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>;
    if (!book) return null;

    // PANTALLA DE ACCESO RESTRINGIDO
    if (!hasAccess) {
        return (
            <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-200">
                    <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Publicación Privada</h2>
                    <p className="text-gray-500 mb-8 text-sm">"{book.titulo}" de {book.authorName}</p>

                    <form onSubmit={handleCanjearCodigo} className="space-y-4 text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Ingresa tu código de invitación</label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={accessCode}
                                onChange={e => { setAccessCode(e.target.value); setCodeError(''); }}
                                placeholder="Ej. BIRD2026"
                                className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-xl py-3 pl-12 pr-4 uppercase focus:outline-none focus:border-amber-500 font-mono font-bold tracking-widest"
                            />
                        </div>
                        {codeError && <p className="text-red-500 text-xs font-bold">{codeError}</p>}

                        <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
                            Canjear Acceso
                        </button>
                    </form>

                    <button onClick={() => navigate('/libros')} className="mt-6 text-sm font-bold text-gray-400 hover:text-gray-600 transition">
                        Volver a la biblioteca
                    </button>
                </div>
            </div>
        );
    }

    // VISOR PRINCIPAL
    return (
        <div className="h-screen flex flex-col bg-[#1e1e1e] text-white font-sans overflow-hidden">

            {/* TOOLBAR SUPERIOR */}
            <div className="h-14 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center justify-between px-4 shrink-0 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/libros')} className="p-2 hover:bg-white/10 rounded-lg transition" title="Volver">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="border-l border-[#4d4d4d] h-6 mx-1"></div>
                    <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition ${showSidebar ? 'bg-emerald-600' : 'hover:bg-white/10'}`} title="Mostrar/Ocultar Miniaturas">
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-sm truncate max-w-[200px] md:max-w-md ml-2">{book.titulo}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center bg-[#1e1e1e] rounded-lg px-3 py-1 text-sm font-mono font-bold border border-[#3d3d3d]">
                        {pageNumber} / {numPages || '-'}
                    </div>
                    {book.pdfUrl && (
                        <a href={book.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow">
                            <Download className="w-4 h-4" /> Descargar PDF
                        </a>
                    )}
                </div>
            </div>

            {/* ÁREA DE TRABAJO */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* LECTOR CENTRAL */}
                <div className="flex-1 overflow-auto flex flex-col items-center p-4 md:p-8 bg-[#121212] relative custom-scrollbar">

                    {/* Botones de navegación flotantes */}
                    <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="fixed left-4 md:left-[20%] top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md transition-all disabled:opacity-0 disabled:pointer-events-none shadow-xl transform hover:scale-110">
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className={`fixed ${showSidebar ? 'right-64 md:right-[calc(16rem+5%)]' : 'right-4 md:right-[5%]'} top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md transition-all disabled:opacity-0 disabled:pointer-events-none shadow-xl transform hover:scale-110`}>
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* El Documento */}
                    <div className="shadow-2xl transition-transform duration-300 ease-in-out origin-top min-h-full flex items-center animate-in fade-in zoom-in-95">
                        <Document
                            file={book.pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="flex flex-col items-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /> Cargando documento...</div>}
                            className="bg-white"
                        >
                            <Page
                                pageNumber={pageNumber}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                width={window.innerWidth < 768 ? window.innerWidth - 40 : undefined}
                                height={window.innerWidth >= 768 ? window.innerHeight - 100 : undefined}
                                className="shadow-2xl"
                            />
                        </Document>
                    </div>
                </div>

                {/* BARRA LATERAL DERECHA (MINIATURAS) */}
                {showSidebar && (
                    <div className="w-48 md:w-64 bg-[#252526] border-l border-[#3d3d3d] flex flex-col shrink-0 z-10 shadow-2xl animate-in slide-in-from-right">
                        <div className="p-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#3d3d3d] bg-[#1e1e1e]">
                            Páginas
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {numPages && Array.from(new Array(numPages), (el, index) => (
                                <div
                                    key={`thumb_${index + 1}`}
                                    onClick={() => setPageNumber(index + 1)}
                                    className={`relative cursor-pointer transition-all border-2 rounded-md overflow-hidden ${pageNumber === index + 1 ? 'border-emerald-500 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-transparent hover:border-gray-500 opacity-60 hover:opacity-100'}`}
                                >
                                    <Document file={book.pdfUrl} className="pointer-events-none bg-white">
                                        <Page
                                            pageNumber={index + 1}
                                            width={150}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </Document>
                                    <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                        {index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}