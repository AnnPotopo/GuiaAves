import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { QrCode, Camera, Loader2, CheckCircle2, AlertCircle, BookOpen, User, KeyRound, MapPin, ExternalLink } from 'lucide-react';
import { QrReader } from 'react-qr-reader';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function RedeemCode() {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [inputCode, setInputCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [unlockedBook, setUnlockedBook] = useState(null);

    // 1. Detectar si es dispositivo móvil
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 2. En PC no forzamos ninguna cámara, dejamos que el navegador decida (evita pantalla negra)
    const cameraConstraints = isMobile ? { facingMode: 'environment' } : {};

    // 3. Función definitiva para matar el stream de la cámara
    const apagarCamara = () => {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            const stream = video.srcObject;
            if (stream && stream.getTracks) {
                // Detiene físicamente el hardware
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        });
    };

    // Limpieza de seguridad si el usuario cambia de módulo en el menú lateral
    useEffect(() => {
        return () => apagarCamara();
    }, []);

    // Función envolvente para apagar y cerrar
    const detenerEscaneo = () => {
        apagarCamara(); // Corta el hardware primero
        setIsScanning(false); // Cierra la UI después
    };

    const processCode = async (codeToProcess) => {
        if (!codeToProcess || !codeToProcess.trim()) return;

        setIsLoading(true);
        setErrorMsg('');
        setUnlockedBook(null);

        // Si viene del escáner, apagamos cámara inmediatamente
        if (isScanning) {
            apagarCamara();
            setIsScanning(false);
        }

        try {
            const finalCode = codeToProcess.trim().toUpperCase();

            // Buscar si alguna publicación tiene este código de acceso
            const q = query(collection(db, "libros_publicados"), where("accessCodes", "array-contains", finalCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setErrorMsg("Código inválido, expirado o inexistente.");
                setIsLoading(false);
                return;
            }

            // Encontramos el libro
            const bookDoc = querySnapshot.docs[0];
            const bookData = bookDoc.data();

            // Verificamos si el usuario ya tenía acceso antes
            if ((bookData.allowedUsers || []).includes(user.uid) || (bookData.allowedUsers || []).includes(user.email)) {
                setUnlockedBook({ id: bookDoc.id, ...bookData, alreadyHadAccess: true });
                setIsLoading(false);
                return;
            }

            // Actualizamos el libro añadiendo al usuario a la lista blanca (allowedUsers)
            await updateDoc(doc(db, "libros_publicados", bookDoc.id), {
                allowedUsers: arrayUnion(user.uid, user.email)
            });

            setUnlockedBook({ id: bookDoc.id, ...bookData, newlyUnlocked: true });

        } catch (error) {
            console.error("Error al canjear código:", error);
            setErrorMsg("Hubo un error al procesar tu solicitud.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        processCode(inputCode);
    };

    return (
        <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-800">

            <div className="max-w-xl w-full">

                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3 hover:rotate-6 transition-transform">
                        <KeyRound className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 mb-4 leading-tight">Canjear Acceso</h1>
                    <p className="text-slate-500 font-medium">
                        Ingresa el código proporcionado por el autor o escanea un código QR para desbloquear investigaciones exclusivas y documentos privados.
                    </p>
                </div>

                {!unlockedBook && (
                    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">

                        {/* DECORACIÓN DE FONDO */}
                        <QrCode className="absolute -top-10 -right-10 w-64 h-64 text-slate-50 opacity-50 pointer-events-none" />

                        <div className="relative z-10">
                            {isScanning ? (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="w-full h-72 md:h-80 bg-slate-900 rounded-3xl overflow-hidden relative shadow-inner flex items-center justify-center">
                                        <QrReader
                                            onResult={(result, error) => {
                                                if (!!result) {
                                                    processCode(result?.text);
                                                }
                                            }}
                                            constraints={cameraConstraints}
                                            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            className="w-full h-full"
                                        />
                                        {/* Overlay para apuntar */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="w-48 h-48 border-4 border-indigo-500/50 rounded-3xl animate-pulse"></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={detenerEscaneo}
                                        className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar Escaneo
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in">

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Código de Desbloqueo</label>
                                        <input
                                            type="text"
                                            value={inputCode}
                                            onChange={(e) => setInputCode(e.target.value)}
                                            placeholder="Ej. TALLER2026"
                                            className="w-full border-2 border-slate-200 rounded-2xl px-6 py-4 text-center text-xl md:text-2xl uppercase tracking-[0.2em] font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                        />
                                    </div>

                                    {errorMsg && (
                                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-in shake-in">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar Código'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsScanning(true)}
                                            disabled={isLoading}
                                            className="flex-1 sm:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black uppercase tracking-widest py-4 px-6 rounded-2xl border border-indigo-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Camera className="w-5 h-5" /> Escanear QR
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* MENSAJE DE ÉXITO Y VISTA PREVIA DEL DOCUMENTO */}
                {unlockedBook && (
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-emerald-100 overflow-hidden animate-in zoom-in-95 duration-500">

                        <div className="bg-emerald-50 p-8 text-center border-b border-emerald-100">
                            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-emerald-800 mb-2">
                                {unlockedBook.alreadyHadAccess ? 'Ya tenías acceso' : '¡Documento Desbloqueado!'}
                            </h2>
                            <p className="text-sm font-medium text-emerald-600/80">
                                El contenido ha sido agregado a tu sección "Compartidos" en la Biblioteca.
                            </p>
                        </div>

                        <div className="p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Contenido Descubierto</p>

                            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                                {/* Miniatura */}
                                <div className="w-32 h-44 shrink-0 rounded-xl overflow-hidden shadow-md bg-slate-100 border border-slate-200">
                                    {unlockedBook.coverUrl ? (
                                        <img src={unlockedBook.coverUrl} alt="Portada" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <BookOpen className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="font-serif text-2xl font-bold text-slate-900 leading-tight mb-2">{unlockedBook.titulo}</h3>

                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-slate-600 flex items-center justify-center sm:justify-start gap-2">
                                            <User className="w-4 h-4 text-slate-400" /> Autor: <span className="font-bold">{unlockedBook.authorName}</span>
                                        </p>
                                        {(unlockedBook.pais || unlockedBook.estado) && (
                                            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-2">
                                                <MapPin className="w-4 h-4 text-emerald-500" /> {unlockedBook.estado ? `${unlockedBook.estado}, ` : ''}{unlockedBook.pais}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                        {unlockedBook.categorias?.map(cat => (
                                            <span key={cat} className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => {
                                    setInputCode('');
                                    setUnlockedBook(null);
                                }}
                                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Canjear Otro
                            </button>
                            <button
                                onClick={() => navigate(`/visor/${unlockedBook.id}`)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-md transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" /> Leer Ahora
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}