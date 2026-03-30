import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Mic, Library, Square, AlertCircle, Loader2, Award, X, Check, MapPin, Search, Volume2, Info, Calendar, Navigation, Edit3, Activity, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Achievements from './Achievements';

const firebaseConfig = {
    apiKey: "AIzaSyC2UNjl2dW0v_JH7-ScMUTnLkl64_7rsvM",
    authDomain: "librostools.firebaseapp.com",
    projectId: "librostools",
    storageBucket: "librostools.firebasestorage.app",
    messagingSenderId: "442055444824",
    appId: "1:442055444824:web:1722e67e11497edd2afd2d",
    measurementId: "G-M7MQHHR58B"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const auth = getAuth(app);

export default function BirdApp() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [activeTab, setActiveTab] = useState('identify');
    const [subTab, setSubTab] = useState('catalog');

    const [avesBook, setAvesBook] = useState([]);
    const [progreso, setProgreso] = useState({});
    const [loadingDB, setLoadingDB] = useState(true);

    const [ubicacion, setUbicacion] = useState('Sabinas Hidalgo, N.L.');
    const [latitud, setLatitud] = useState(26.4953);
    const [longitud, setLongitud] = useState(-100.1755);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [tempLocation, setTempLocation] = useState('');

    // --- NUEVOS ESTADOS PARA EL RADAR (Aves Posibles Hoy) ---
    const [avesRadar, setAvesRadar] = useState([]);
    const [loadingRadar, setLoadingRadar] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sugerenciasIA, setSugerenciasIA] = useState(null);
    const [showConfirmationAnim, setShowConfirmationAnim] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [filtro, setFiltro] = useState('todas');
    const [selectedAve, setSelectedAve] = useState(null);
    const [audioCanto, setAudioCanto] = useState('');
    const [buscandoAudio, setBuscandoAudio] = useState(false);

    // 1. CARGA DE SEGURIDAD Y BASE DE DATOS
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                navigate('/');
                return;
            }
            setUser(currentUser);

            try {
                const querySnapshot = await getDocs(collection(db, "especies"));
                const data = [];
                querySnapshot.forEach((documento) => data.push({ id: documento.id, ...documento.data() }));
                setAvesBook(data);

                const progresoRef = doc(db, "colecciones_usuarios", currentUser.uid);
                const progresoSnap = await getDoc(progresoRef);

                if (progresoSnap.exists()) {
                    setProgreso(progresoSnap.data());
                } else {
                    setProgreso({});
                }
            } catch (e) {
                console.error("Error cargando DB:", e);
            } finally {
                setLoadingDB(false);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // 2. EL RADAR: Buscar aves posibles en la zona con GBIF
    useEffect(() => {
        const buscarAvesRadar = async () => {
            setLoadingRadar(true);
            try {
                // Creamos un cuadro imaginario de ~20km alrededor de tus coordenadas
                const latMin = (latitud - 0.1).toFixed(4);
                const latMax = (latitud + 0.1).toFixed(4);
                const lonMin = (longitud - 0.1).toFixed(4);
                const lonMax = (longitud + 0.1).toFixed(4);

                // taxonKey=212 significa "Clase: Aves" en la base de datos mundial
                const url = `https://api.gbif.org/v1/occurrence/search?taxonKey=212&hasCoordinate=true&decimalLatitude=${latMin},${latMax}&decimalLongitude=${lonMin},${lonMax}&limit=50`;

                const res = await fetch(url);
                const data = await res.json();

                const especiesUnicas = [];
                const nombresVistos = new Set();

                data.results.forEach(obs => {
                    // Evitar repetidas y descartar si no hay nombre de especie
                    if (obs.species && !nombresVistos.has(obs.species)) {
                        nombresVistos.add(obs.species);
                        especiesUnicas.push({
                            cientifico: obs.species,
                            // Si GBIF no tiene nombre común, lo dejamos en blanco
                            comun: obs.vernacularName || 'Especie local'
                        });
                    }
                });

                setAvesRadar(especiesUnicas);
            } catch (error) {
                console.error("Error en el radar:", error);
            } finally {
                setLoadingRadar(false);
            }
        };

        // Solo buscar si estamos en la pestaña de identificar
        if (activeTab === 'identify') {
            buscarAvesRadar();
        }
    }, [latitud, longitud, activeTab]);

    useEffect(() => {
        if (!selectedAve) return;
        const buscarCanto = async () => {
            setBuscandoAudio(true);
            setAudioCanto('');
            try {
                let termino = selectedAve.nombreCientifico || selectedAve.id.replace(/_/g, ' ');
                const res = await fetch(`https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(termino)}`);
                if (!res.ok) { setBuscandoAudio(false); return; }
                const datos = await res.json();
                if (datos.recordings && datos.recordings.length > 0) setAudioCanto(datos.recordings[0].file);
            } catch (e) { } finally {
                setBuscandoAudio(false);
            }
        };
        buscarCanto();
    }, [selectedAve]);

    const getDatosAvistamiento = (aveId) => {
        const data = progreso[aveId];
        if (!data) return { vistas: 0, fecha: null };
        if (typeof data === 'number') return { vistas: data, fecha: null };
        return { vistas: data.count || 0, fecha: data.lastSeen || null };
    };

    const avesFiltradas = avesBook.filter(ave => {
        const { vistas, fecha } = getDatosAvistamiento(ave.id);
        if (filtro === 'descubiertas') return vistas > 0;
        if (filtro === 'faltantes') return vistas === 0;
        if (filtro === 'hoy') {
            if (vistas === 0 || !fecha) return false;
            return new Date(fecha).toDateString() === new Date().toDateString();
        }
        return true;
    });

    const avesPorOrden = avesFiltradas.reduce((acc, ave) => {
        const orden = ave.orden || 'Otros';
        if (!acc[orden]) acc[orden] = [];
        acc[orden].push(ave);
        return acc;
    }, {});

    const obtenerGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setLatitud(lat);
                setLongitud(lon);
                setUbicacion(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
                setShowLocationModal(false);
            }, () => {
                alert("No se pudo obtener la ubicación exacta. Verifica tus permisos.");
            });
        }
    };

    const obtenerSemanaDelAno = () => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const dibujarOndas = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (mediaRecorderRef.current?.state !== "recording") {
                ctx.clearRect(0, 0, width, height);
                return;
            }
            animationFrameRef.current = requestAnimationFrame(draw);
            analyserRef.current.getByteTimeDomainData(dataArray);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, width, height);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#10b981';
            ctx.beginPath();
            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(width, height / 2);
            ctx.stroke();
        };
        draw();
    };

    const getSupportedMimeType = () => {
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    };

    const iniciarGrabacion = async () => {
        if (!navigator.onLine) {
            alert("🌲 Estás en Modo Supervivencia (Sin conexión).\n\nPuedes navegar por el catálogo y ver tu colección guardada, pero el identificador requiere internet.");
            return;
        }
        if (avesBook.length === 0) return alert("Espera a que cargue la base de datos.");

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: getSupportedMimeType() };
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);

            audioChunksRef.current = [];
            setSugerenciasIA(null);

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);

            mediaRecorderRef.current.onstop = async () => {
                setIsRecording(false);
                setIsProcessing(true);

                if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

                const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                const formData = new FormData();
                formData.append("audio", audioBlob, `grabacion.${extension}`);
                formData.append("lat", latitud);
                formData.append("lon", longitud);
                formData.append("week", obtenerSemanaDelAno());

                try {
                    const res = await fetch("https://annpotopo-api-aves-backend.hf.space/identificar", { method: "POST", body: formData });
                    const datosIA = await res.json();
                    procesarInteligencia(datosIA);
                } catch (error) {
                    alert("Error conectando con la IA de BirdNET. Intenta de nuevo.");
                } finally {
                    setIsProcessing(false);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            dibujarOndas();

        } catch (e) {
            alert("Permiso de micrófono denegado.");
        }
    };

    const detenerGrabacion = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };

    // 3. PARSEO ELEGANTE DE AVES PROBABLES / EXTRAS
    const procesarInteligencia = (datosIA) => {
        let enLibro = [];
        let extras = [];

        // Extraemos la lista real de aves que nos mandó tu servidor FastAPI
        const listaAves = datosIA.aves || [];

        listaAves.forEach(aveDetectada => {
            const cientifico = aveDetectada.scientificName;
            const comun = aveDetectada.commonName;
            const confianza = aveDetectada.confidence;

            // Verificamos si esta ave coincide con alguna de tu libro usando el nombre científico
            const coincidenciaLibro = avesBook.find(aveLocal =>
                aveLocal.nombreCientifico && aveLocal.nombreCientifico.toLowerCase() === cientifico.toLowerCase()
            );

            if (coincidenciaLibro) {
                // Si está en el libro, la añadimos a la lista verde (evitando duplicados)
                if (!enLibro.find(a => a.id === coincidenciaLibro.id)) {
                    enLibro.push(coincidenciaLibro);
                }
            } else {
                // Si NO está en el libro, extraemos la info real de BirdNET
                if (!extras.find(e => e.cientifico === cientifico)) {
                    extras.push({
                        cientifico: cientifico,
                        comun: comun, // BirdNET usualmente devuelve el nombre en inglés por defecto
                        confianza: confianza // % de seguridad de la IA
                    });
                }
            }
        });

        setSugerenciasIA({ libro: enLibro, extras: extras });
    };

    const confirmarAvistamiento = async (aveId) => {
        if (!user) return;

        const nuevoProgreso = { ...progreso };
        const actual = getDatosAvistamiento(aveId);

        nuevoProgreso[aveId] = {
            count: actual.vistas + 1,
            lastSeen: new Date().toISOString(),
            location: ubicacion
        };

        setProgreso(nuevoProgreso);

        try {
            const progresoRef = doc(db, "colecciones_usuarios", user.uid);
            await setDoc(progresoRef, nuevoProgreso);
        } catch (error) {
            console.error("Error guardando progreso en Firebase:", error);
        }

        setShowConfirmationAnim(aveId);
        setTimeout(() => setShowConfirmationAnim(false), 1500);

        const libroActualizado = sugerenciasIA.libro.filter(ave => ave.id !== aveId);
        setSugerenciasIA({ ...sugerenciasIA, libro: libroActualizado });
    };

    if (loadingDB) {
        return (
            <div className="h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-800 overflow-hidden relative">

            {/* HEADER */}
            <header className="bg-white p-4 flex justify-between items-center z-10 shrink-0 border-b border-gray-200 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-lg font-extrabold text-emerald-700 tracking-tight">BirdSound ID</h1>
                    <button
                        onClick={() => { setTempLocation(ubicacion); setShowLocationModal(true); }}
                        className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-emerald-600 transition"
                    >
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{ubicacion}</span>
                        <Edit3 className="w-3 h-3 opacity-50" />
                    </button>
                </div>
                <button onClick={() => { if (isRecording) detenerGrabacion(); navigate('/'); }} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition">
                    <X className="w-5 h-5" />
                </button>
            </header>

            {/* ÁREA PRINCIPAL */}
            <div className="flex-1 overflow-y-auto pb-24 relative flex flex-col">

                {/* --- PESTAÑA IDENTIFICAR --- */}
                {activeTab === 'identify' && (
                    <div className="flex flex-col items-center justify-start h-full p-6">

                        <div className="mt-4 mb-8 flex flex-col items-center justify-center w-full">
                            <div className="relative flex items-center justify-center mb-4">
                                {isRecording && <div className="absolute w-40 h-40 bg-red-100 rounded-full animate-ping"></div>}
                                <button
                                    onClick={isRecording ? detenerGrabacion : iniciarGrabacion}
                                    disabled={isProcessing}
                                    className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-50 text-red-600 border border-red-200' : isProcessing ? 'bg-orange-50 text-orange-500 border border-orange-200' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100'}`}
                                >
                                    {isProcessing ? <Loader2 className="w-10 h-10 animate-spin mb-1" /> :
                                        isRecording ? <Square className="w-8 h-8 mb-1 fill-current" /> :
                                            <Mic className="w-10 h-10 mb-1" />}
                                    <span className="font-bold text-[10px] uppercase tracking-wider">
                                        {isProcessing ? 'Analizando' : isRecording ? 'Detener' : 'Escuchar'}
                                    </span>
                                </button>
                            </div>

                            <div className={`transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                                <canvas ref={canvasRef} width="200" height="40" className="rounded-lg"></canvas>
                                <p className="text-[10px] text-gray-400 font-bold text-center mt-1 uppercase flex items-center justify-center gap-1">
                                    <Activity className="w-3 h-3 text-emerald-500" /> Escuchando entorno
                                </p>
                            </div>
                        </div>

                        {/* LISTA DE RESULTADOS DE AUDIO */}
                        {sugerenciasIA ? (
                            <div className="w-full max-w-lg animate-in slide-in-from-bottom-4 duration-300">
                                {sugerenciasIA.libro.length > 0 && (
                                    <>
                                        <h3 className="text-emerald-600 font-bold text-[11px] uppercase tracking-widest mb-3 px-1">Registradas en tu libro</h3>
                                        {sugerenciasIA.libro.map(ave => (
                                            <div key={ave.id} className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-emerald-200 flex items-center gap-4 transition-all hover:shadow-md">
                                                <div className="w-16 h-16 rounded-lg bg-cover bg-center border border-gray-100 shrink-0" style={{ backgroundImage: `url(${ave.imagenUrl})` }}></div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{ave.nombreComun}</h4>
                                                    <p className="text-xs text-gray-500 italic truncate">{ave.nombreCientifico}</p>
                                                </div>
                                                <button
                                                    onClick={() => confirmarAvistamiento(ave.id)}
                                                    className="bg-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-700 p-2.5 rounded-lg transition-colors shrink-0 shadow-sm"
                                                >
                                                    <Check className="w-5 h-5 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* ✨ AVES DETECTADAS QUE NO ESTÁN EN EL LIBRO ✨ */}
                                {sugerenciasIA.extras.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-gray-400 font-bold text-[11px] uppercase tracking-widest mb-3 px-1">Detecciones Probables (Fuera del libro)</h3>
                                        {sugerenciasIA.extras.map((extra, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-3 mb-3 shadow-sm border border-gray-200 flex items-center gap-4 opacity-90 border-l-4 border-l-blue-400">
                                                <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 relative">
                                                    <Info className="w-6 h-6 text-blue-400" />
                                                    {/* Insignia de porcentaje */}
                                                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                        {extra.confianza}%
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{extra.comun}</h4>
                                                    <p className="text-xs text-gray-500 italic truncate">{extra.cientifico}</p>
                                                    <p className="text-[9px] text-blue-500 font-semibold mt-1">Especie no incluida en la enciclopedia local.</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {sugerenciasIA.libro.length === 0 && sugerenciasIA.extras.length === 0 && (
                                    <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200 border-dashed mt-4">
                                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600 text-sm font-semibold">No detectamos aves claramente. Intenta acercarte un poco más.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ✨ RADAR DE AVES POSIBLES (Solo se ve antes de grabar) ✨ */
                            <div className="w-full max-w-lg mt-4 border-t border-gray-200 pt-6">
                                <h3 className="text-gray-600 font-bold text-[11px] uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                    <Radar className="w-4 h-4 text-emerald-500" /> Radar de Aves en tu zona hoy
                                </h3>

                                {loadingRadar ? (
                                    <div className="flex items-center justify-center py-6 text-gray-400 gap-2 text-sm">
                                        <Loader2 className="animate-spin w-4 h-4" /> Escaneando área...
                                    </div>
                                ) : avesRadar.length > 0 ? (
                                    <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar snap-x">
                                        {avesRadar.map((ave, i) => (
                                            <div key={i} className="snap-start bg-white border border-gray-200 rounded-xl p-3 shrink-0 w-40 shadow-sm flex flex-col items-center text-center">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                                    <MapPin className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{ave.comun}</p>
                                                <p className="text-[9px] text-gray-500 italic mt-1 truncate w-full">{ave.cientifico}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center italic">No se encontraron reportes recientes cerca de ti.</p>
                                )}
                            </div>
                        )}

                        {showConfirmationAnim && (
                            <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center animate-in fade-in backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                        <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-800">¡Confirmado!</p>
                                    <p className="text-gray-500 text-sm">Añadido a tu colección personal.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PESTAÑA COLECCIÓN UNIFICADA (Catálogo / Logros) --- */}
                {activeTab === 'collection' && (
                    <div className="p-4 md:p-6 bg-white min-h-full flex flex-col">
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 shrink-0">
                            <button
                                onClick={() => setSubTab('catalog')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${subTab === 'catalog' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Catálogo
                            </button>
                            <button
                                onClick={() => setSubTab('achievements')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${subTab === 'achievements' ? 'bg-white text-amber-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Mis Logros
                            </button>
                        </div>

                        {subTab === 'catalog' ? (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-6">
                                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                                        {['todas', 'hoy', 'descubiertas', 'faltantes'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFiltro(f)}
                                                className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors border shadow-sm ${filtro === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {f === 'todas' ? 'Todas' : f === 'hoy' ? 'Vistas Hoy' : f === 'descubiertas' ? 'Descubiertas' : 'Faltantes'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {Object.keys(avesPorOrden).length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No hay aves que coincidan con este filtro.</p>
                                    </div>
                                ) : Object.entries(avesPorOrden).map(([orden, avesDelOrden]) => (
                                    <div key={orden} className="mb-8">
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                                            {orden} <span className="text-gray-300 normal-case font-normal ml-1">({avesDelOrden.length})</span>
                                        </h3>

                                        <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                                            {avesDelOrden.map(ave => {
                                                const { vistas } = getDatosAvistamiento(ave.id);
                                                const desbloqueada = vistas > 0;

                                                let borde = '';
                                                if (!desbloqueada) {
                                                    borde = 'border-gray-500 opacity-80 filter grayscale brightness-[0.4] bg-gray-300 cursor-default';
                                                } else if (vistas < 20) {
                                                    borde = 'border-[#cd7f32] border-4 cursor-pointer hover:scale-105 transition-transform shadow-md';
                                                } else if (vistas < 50) {
                                                    borde = 'border-[#a0a0a0] border-4 cursor-pointer hover:scale-105 transition-transform shadow-md';
                                                } else if (vistas < 100) {
                                                    borde = 'border-[#f1c40f] border-4 cursor-pointer hover:scale-105 transition-transform shadow-md';
                                                } else {
                                                    borde = 'border-[#95a5a6] border-4 cursor-pointer hover:scale-105 transition-transform shadow-md';
                                                }

                                                return (
                                                    <div key={ave.id} className="snap-start flex flex-col items-center w-24 shrink-0">
                                                        <div
                                                            className={`w-20 h-20 rounded-full bg-cover bg-center relative ${borde}`}
                                                            style={{ backgroundImage: `url('${ave.imagenUrl || ''}')` }}
                                                            onClick={() => { if (desbloqueada) setSelectedAve(ave); }}
                                                        />
                                                        <div className='flex flex-col items-center mt-2 px-1 text-center'>
                                                            <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${desbloqueada ? 'text-gray-800' : 'text-gray-400'}`}>
                                                                {desbloqueada ? ave.nombreComun : 'Desconocida'}
                                                            </p>
                                                            {desbloqueada && (
                                                                <p className="text-[9px] mt-0.5 flex items-center justify-center gap-1 font-semibold text-emerald-600">
                                                                    <Award className='w-3 h-3' /> {vistas}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Achievements progreso={progreso} />
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL DE UBICACIÓN --- */}
            {showLocationModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Actualizar Ubicación</h3>
                            <button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Lugar actual</label>
                            <input
                                type="text"
                                value={tempLocation}
                                onChange={(e) => setTempLocation(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-emerald-500 mb-4"
                                placeholder="Ej. Parque La Turbina..."
                            />
                            <button
                                onClick={obtenerGPS}
                                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-3 rounded-lg transition border border-blue-200 mb-2"
                            >
                                <Navigation className="w-4 h-4" /> Usar mi GPS
                            </button>
                            <button
                                onClick={() => { setUbicacion(tempLocation); setShowLocationModal(false); }}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-md shadow-emerald-200 mt-4"
                            >
                                Guardar Ubicación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FICHA DEL AVE --- */}
            {selectedAve && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm p-0 sm:p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
                        <button onClick={() => setSelectedAve(null)} className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition">
                            <X className="w-5 h-5" />
                        </button>

                        <div
                            className="w-full h-64 sm:h-72 bg-cover bg-center shrink-0 relative"
                            style={{ backgroundImage: `url('${selectedAve.imagenUrl || ''}')` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6">
                                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mb-1">{selectedAve.nombreComun}</h2>
                                <p className="text-emerald-600 font-medium italic text-lg">{selectedAve.nombreCientifico}</p>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <div className="bg-emerald-50 rounded-xl p-3 flex-1 border border-emerald-100">
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Orden</p>
                                    <p className="text-sm text-gray-800 font-semibold">{selectedAve.orden || 'N/A'}</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 flex-1 border border-blue-100">
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Familia</p>
                                    <p className="text-sm text-gray-800 font-semibold">{selectedAve.familia || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-6 mb-6">
                                {selectedAve.habitat && (
                                    <div>
                                        <h4 className="flex items-center gap-1.5 text-gray-800 font-bold mb-1.5"><MapPin className="w-4 h-4 text-red-500" /> Hábitat</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">{selectedAve.habitat}</p>
                                    </div>
                                )}
                                {selectedAve.descripcion && (
                                    <div>
                                        <h4 className="flex items-center gap-1.5 text-gray-800 font-bold mb-1.5"><Info className="w-4 h-4 text-blue-500" /> Descripción</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">{selectedAve.descripcion}</p>
                                    </div>
                                )}
                                {getDatosAvistamiento(selectedAve.id).vistas > 0 && (
                                    <div>
                                        <h4 className="flex items-center gap-1.5 text-gray-800 font-bold mb-1.5"><Calendar className="w-4 h-4 text-orange-500" /> Último Avistamiento</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {getDatosAvistamiento(selectedAve.id).fecha ? new Date(getDatosAvistamiento(selectedAve.id).fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha no registrada'}
                                            <span className="block text-xs mt-1 text-gray-400">📍 {getDatosAvistamiento(selectedAve.id).location || 'Sin ubicación'}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h4 className="flex items-center gap-1.5 text-gray-800 font-bold mb-3"><Volume2 className="w-4 h-4 text-indigo-500" /> Canto de la especie</h4>
                                {buscandoAudio ? (
                                    <p className="text-xs text-indigo-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando en la base mundial...</p>
                                ) : audioCanto ? (
                                    <audio controls className="w-full h-10 outline-none rounded">
                                        <source src={audioCanto} type="audio/mpeg" />
                                    </audio>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">Audio no disponible en modo prueba.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MENÚ INFERIOR */}
            <nav className="bg-white border-t border-gray-200 flex justify-around items-center pb-safe fixed bottom-0 w-full h-16 shrink-0 z-40">
                <button
                    onClick={() => { if (isRecording) detenerGrabacion(); setActiveTab('identify'); }}
                    className={`flex flex-col items-center justify-center w-1/2 h-full space-y-1 transition duration-200 ${activeTab === 'identify' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Mic className={`w-6 h-6 ${activeTab === 'identify' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    <span className="text-[10px] font-bold">Identificar</span>
                </button>

                <button
                    onClick={() => { if (isRecording) detenerGrabacion(); setActiveTab('collection'); }}
                    className={`flex flex-col items-center justify-center w-1/2 h-full space-y-1 transition duration-200 ${activeTab === 'collection' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Library className={`w-6 h-6 ${activeTab === 'collection' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    <span className="text-[10px] font-bold">Colección</span>
                </button>
            </nav>

        </div>
    );
}