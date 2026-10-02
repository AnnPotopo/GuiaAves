import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { Mic, Library, Square, AlertCircle, Loader2, Award, X, Check, MapPin, Search, Volume2, Info, Calendar, Navigation, Edit3, Activity, Radar, Map, ClipboardList, Speaker, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Achievements from './Achievements';
import MapExplore from './MapExplore';
import BirdChecklist from './BirdChecklist';
import { diccionarioAves } from './diccionarioSabinas';
import BirdSoundBox from './BirdSoundBox';

const limpiarTexto = (texto) => {
    if (!texto) return "";
    return texto.trim().toLowerCase().replace(/\s+/g, ' ');
};

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

    useEffect(() => {
        const buscarAvesRadar = async () => {
            setLoadingRadar(true);
            try {
                const latMin = (latitud - 0.1).toFixed(4);
                const latMax = (latitud + 0.1).toFixed(4);
                const lonMin = (longitud - 0.1).toFixed(4);
                const lonMax = (longitud + 0.1).toFixed(4);
                const url = `https://api.gbif.org/v1/occurrence/search?taxonKey=212&hasCoordinate=true&decimalLatitude=${latMin},${latMax}&decimalLongitude=${lonMin},${lonMax}&limit=50`;
                const res = await fetch(url);
                const data = await res.json();
                const especiesUnicas = [];
                const nombresVistos = new Set();
                data.results.forEach(obs => {
                    if (obs.species && !nombresVistos.has(obs.species)) {
                        nombresVistos.add(obs.species);
                        const cientificoLimpio = limpiarTexto(obs.species);
                        const nombreTraducido = diccionarioAves[cientificoLimpio] || obs.vernacularName || 'Especie local';
                        especiesUnicas.push({
                            cientifico: obs.species,
                            comun: nombreTraducido
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
            alert("⚠️ Estás en Modo Supervivencia (Sin conexión).\n\nPuedes navegar por el catálogo y ver tu colección guardada, pero el identificador requiere internet.");
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

    const procesarInteligencia = (datosIA) => {
        let enLibro = [];
        let extras = [];
        const listaAves = datosIA.aves || [];
        listaAves.forEach(aveDetectada => {
            const cientifico = aveDetectada.scientificName || "";
            let confNum = parseFloat(aveDetectada.confidence) || 0;
            let confianzaFinal = confNum <= 1.0 ? (confNum * 100).toFixed(0) : confNum.toFixed(0);
            const cientificoLimpio = limpiarTexto(cientifico);
            let nombreTraducido = diccionarioAves[cientificoLimpio];
            if (!nombreTraducido) {
                if (cientificoLimpio === 'aves') {
                    nombreTraducido = "Ave (Especie no identificada)";
                } else {
                    nombreTraducido = aveDetectada.commonName || 'Ave Silvestre';
                }
            }
            const coincidenciaLibro = avesBook.find(aveLocal =>
                aveLocal.nombreCientifico && limpiarTexto(aveLocal.nombreCientifico) === cientificoLimpio
            );
            if (coincidenciaLibro) {
                if (!enLibro.find(a => a.id === coincidenciaLibro.id)) {
                    enLibro.push({
                        ...coincidenciaLibro,
                        confianzaIA: confianzaFinal
                    });
                }
            } else {
                if (!extras.find(e => limpiarTexto(e.cientifico) === cientificoLimpio)) {
                    extras.push({
                        cientifico: cientifico,
                        comun: nombreTraducido,
                        confianza: confianzaFinal
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
            <div className="h-full bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 flex flex-col font-sans text-gray-800 overflow-hidden relative">

            {/* HEADER ESTILO EDITORIAL */}
            <header className="bg-white p-5 flex justify-between items-center z-10 shrink-0 border-b border-gray-100 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-xl font-serif font-black text-slate-800 tracking-tight">Guía de Aves</h1>
                    <button
                        onClick={() => { setTempLocation(ubicacion); setShowLocationModal(true); }}
                        className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:text-emerald-700 transition mt-1"
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px] border-b border-emerald-200">{ubicacion}</span>
                    </button>
                </div>
                <button onClick={() => { if (isRecording) detenerGrabacion(); navigate('/'); }} className="text-gray-400 hover:text-slate-800 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-full transition">
                    <X className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto pb-24 relative flex flex-col custom-scrollbar">

                {/* PESTAÑA IDENTIFICADOR (Microfono e IA) */}
                {activeTab === 'identify' && (
                    <div className="flex flex-col items-center justify-start h-full p-6">
                        <div className="mt-8 mb-10 flex flex-col items-center justify-center w-full">
                            <div className="relative flex items-center justify-center mb-6">
                                {isRecording && <div className="absolute w-44 h-44 bg-red-100/50 rounded-full animate-ping"></div>}
                                <button
                                    onClick={isRecording ? detenerGrabacion : iniciarGrabacion}
                                    disabled={isProcessing}
                                    className={`relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 ${isRecording ? 'bg-red-600 text-white shadow-red-200' : isProcessing ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300 hover:scale-105'}`}
                                >
                                    {isProcessing ? <Loader2 className="w-10 h-10 animate-spin mb-2" /> :
                                        isRecording ? <Square className="w-10 h-10 mb-2 fill-current" /> :
                                            <Mic className="w-12 h-12 mb-2" />}
                                    <span className="font-bold text-[11px] uppercase tracking-widest">
                                        {isProcessing ? 'Analizando' : isRecording ? 'Detener' : 'Identificar'}
                                    </span>
                                </button>
                            </div>
                            <div className={`transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                                <canvas ref={canvasRef} width="240" height="50" className="rounded-xl bg-white border border-gray-100 shadow-sm"></canvas>
                                <p className="text-[10px] text-emerald-600 font-bold text-center mt-2 uppercase flex items-center justify-center gap-1.5 tracking-wider">
                                    <Activity className="w-3.5 h-3.5" /> Escuchando entorno
                                </p>
                            </div>
                        </div>

                        {sugerenciasIA ? (
                            <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
                                {sugerenciasIA.libro.length > 0 && (
                                    <>
                                        <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4 px-2 border-b border-gray-200 pb-2">Especies en la Guía</h3>
                                        {sugerenciasIA.libro.map(ave => (
                                            <div key={ave.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex items-center gap-5 transition-all hover:shadow-md group">
                                                <div className="relative w-20 h-20 rounded-xl bg-cover bg-center shrink-0 shadow-inner overflow-hidden" style={{ backgroundImage: `url(${ave.imagenUrl})` }}>
                                                    {ave.confianzaIA && (
                                                        <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-br-lg shadow-sm z-10">
                                                            {ave.confianzaIA}% Match
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-serif font-bold text-slate-900 text-lg truncate group-hover:text-emerald-700 transition-colors">{ave.nombreComun}</h4>
                                                    <p className="text-sm text-gray-500 italic font-light truncate">{ave.nombreCientifico}</p>
                                                </div>
                                                <button
                                                    onClick={() => confirmarAvistamiento(ave.id)}
                                                    className="bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 p-3 rounded-xl transition-all shrink-0 shadow-sm"
                                                    title="Confirmar Avistamiento"
                                                >
                                                    <Check className="w-6 h-6 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {sugerenciasIA.extras.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4 px-2">Posibles Coincidencias (Fuera de la guía)</h3>
                                        {sugerenciasIA.extras.map((extra, idx) => (
                                            <div key={idx} className="bg-slate-50 rounded-2xl p-4 mb-3 border border-slate-200 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-sm relative">
                                                    <Info className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{extra.comun}</h4>
                                                    <p className="text-xs text-gray-500 italic truncate">{extra.cientifico}</p>
                                                </div>
                                                <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md">{extra.confianza}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sugerenciasIA.libro.length === 0 && sugerenciasIA.extras.length === 0 && (
                                    <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-200 mt-4">
                                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-base font-medium">No logramos identificar ninguna especie con claridad. Intenta grabar más cerca.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-4xl mt-8">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                        <Radar className="w-5 h-5 text-emerald-600" /> Radar Regional
                                    </h3>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-md">Hoy</span>
                                </div>

                                {loadingRadar ? (
                                    <div className="flex items-center justify-center py-12 text-gray-400 gap-3 text-sm font-medium">
                                        <Loader2 className="animate-spin w-5 h-5" /> Analizando avistamientos locales...
                                    </div>
                                ) : avesRadar.length > 0 ? (
                                    <div className="flex overflow-x-auto gap-4 pb-6 custom-scrollbar snap-x px-2">
                                        {avesRadar.map((ave, i) => (
                                            <div key={i} className="snap-start bg-white border border-gray-100 rounded-2xl p-5 shrink-0 w-48 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
                                                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                    <MapPin className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <p className="text-sm font-serif font-bold text-slate-800 line-clamp-2 leading-snug">{ave.comun}</p>
                                                <p className="text-[10px] text-gray-500 italic mt-2 truncate w-full font-light">{ave.cientifico}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 text-center italic py-8 bg-white rounded-2xl border border-gray-100">No hay reportes de radar en esta zona en las últimas horas.</p>
                                )}
                            </div>
                        )}

                        {showConfirmationAnim && (
                            <div className="fixed inset-0 bg-white/95 z-[100] flex items-center justify-center animate-in fade-in zoom-in-95 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="bg-emerald-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200">
                                        <Check className="w-12 h-12 text-white stroke-[3]" />
                                    </div>
                                    <p className="text-3xl font-serif font-black text-slate-900 mb-2">¡Registrado!</p>
                                    <p className="text-gray-500 text-base font-medium">Especie añadida a tu libro de vida.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PESTAÑAS SECUNDARIAS */}
                {activeTab === 'explore' && <MapExplore db={db} user={user} />}
                {activeTab === 'lists' && <BirdChecklist db={db} user={user} ubicacion={ubicacion} avesRadar={avesRadar} />}
                {activeTab === 'soundbox' && <BirdSoundBox db={db} user={user} />}

                {/* PESTAÑA MI LIBRO (CATÁLOGO ESTILO AUDUBON) */}
                {activeTab === 'collection' && (
                    <div className="p-4 md:p-8 bg-gray-50 min-h-full flex flex-col max-w-7xl mx-auto w-full">
                        <div className="flex bg-white p-1.5 rounded-xl mb-8 shrink-0 shadow-sm border border-gray-100 max-w-md mx-auto w-full">
                            <button
                                onClick={() => setSubTab('catalog')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${subTab === 'catalog' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:text-slate-900 hover:bg-gray-50'}`}
                            >
                                Guía Visual
                            </button>
                            <button
                                onClick={() => setSubTab('achievements')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${subTab === 'achievements' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:text-slate-900 hover:bg-gray-50'}`}
                            >
                                Logros
                            </button>
                        </div>

                        {subTab === 'catalog' ? (
                            <div className="animate-in fade-in duration-500">
                                <div className="mb-8">
                                    <div className="flex overflow-x-auto gap-3 pb-3 custom-scrollbar">
                                        {['todas', 'hoy', 'descubiertas', 'faltantes'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFiltro(f)}
                                                className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filtro === f ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-slate-900'}`}
                                            >
                                                {f === 'todas' ? 'Catálogo Completo' : f === 'hoy' ? 'Vistas Hoy' : f === 'descubiertas' ? 'Mis Descubrimientos' : 'Por Descubrir'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {Object.keys(avesPorOrden).length === 0 ? (
                                    <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                        <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-lg font-serif">No hay especies en esta categoría.</p>
                                    </div>
                                ) : Object.entries(avesPorOrden).map(([orden, avesDelOrden]) => (
                                    <div key={orden} className="mb-12">
                                        <h3 className="text-2xl font-serif font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6 flex items-baseline gap-3">
                                            {orden}
                                            <span className="text-sm font-sans font-medium text-gray-400">{avesDelOrden.length} especies</span>
                                        </h3>

                                        {/* GRID ESTILO AUDUBON (Tarjetas Cuadradas/Verticales) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                            {avesDelOrden.map(ave => {
                                                const { vistas } = getDatosAvistamiento(ave.id);
                                                const desbloqueada = vistas > 0;

                                                return (
                                                    <div
                                                        key={ave.id}
                                                        onClick={() => { if (desbloqueada) setSelectedAve(ave); }}
                                                        className={`flex flex-col bg-white rounded-2xl overflow-hidden border transition-all duration-300 ${desbloqueada ? 'cursor-pointer border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 group' : 'border-gray-100 opacity-60 grayscale filter'}`}
                                                    >
                                                        <div className="w-full aspect-square bg-slate-100 relative overflow-hidden">
                                                            <img
                                                                src={ave.imagenUrl || 'https://via.placeholder.com/300'}
                                                                alt={ave.nombreComun}
                                                                className={`w-full h-full object-cover transition-transform duration-700 ${desbloqueada ? 'group-hover:scale-105' : ''}`}
                                                            />
                                                            {desbloqueada && vistas >= 20 && (
                                                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">
                                                                    Experto
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-4 flex flex-col flex-1 justify-between">
                                                            <div>
                                                                <h4 className={`font-serif font-bold text-base leading-tight mb-1 ${desbloqueada ? 'text-slate-900 group-hover:text-emerald-700' : 'text-gray-500'}`}>
                                                                    {desbloqueada ? ave.nombreComun : 'Especie Bloqueada'}
                                                                </h4>
                                                                <p className="text-[10px] font-light italic text-gray-500 line-clamp-1">
                                                                    {desbloqueada ? ave.nombreCientifico : '???? ?????'}
                                                                </p>
                                                            </div>
                                                            {desbloqueada && (
                                                                <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Avistamientos</span>
                                                                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {vistas}</span>
                                                                </div>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800">Actualizar Región</h3>
                            <button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-slate-900 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Lugar actual</label>
                            <input
                                type="text"
                                value={tempLocation}
                                onChange={(e) => setTempLocation(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 mb-4 transition-all"
                                placeholder="Ej. Parque La Turbina..."
                            />
                            <button
                                onClick={obtenerGPS}
                                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl transition-colors mb-2"
                            >
                                <Navigation className="w-4 h-4" /> Usar mi GPS
                            </button>
                            <button
                                onClick={() => { setUbicacion(tempLocation); setShowLocationModal(false); }}
                                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-colors mt-4 shadow-lg"
                            >
                                Confirmar Ubicación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FICHA DEL AVE (DISEÑO EDITORIAL TIPO AUDUBON A PANTALLA COMPLETA) --- */}
            {selectedAve && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in duration-300 custom-scrollbar">

                    {/* Botón Flotante para Cerrar */}
                    <button
                        onClick={() => setSelectedAve(null)}
                        className="fixed top-6 right-6 z-50 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white p-3 rounded-full transition-all shadow-lg group"
                    >
                        <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* HERO SECTION GIGANTE */}
                    <div className="relative w-full h-[60vh] md:h-[70vh] bg-slate-900">
                        <img
                            src={selectedAve.imagenUrl || 'https://via.placeholder.com/1200'}
                            alt={selectedAve.nombreComun}
                            className="w-full h-full object-cover opacity-90"
                        />
                        {/* Degradado para que el texto sea legible */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                        {/* Títulos sobre la imagen */}
                        <div className="absolute bottom-0 left-0 w-full px-6 md:px-16 pb-12 pt-32 text-white max-w-7xl mx-auto">
                            <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4" /> Guía Oficial de Aves
                            </p>
                            <h1 className="text-5xl md:text-7xl font-serif font-black text-white leading-none mb-2 drop-shadow-lg">
                                {selectedAve.nombreComun}
                            </h1>
                            <p className="text-xl md:text-3xl font-light italic text-gray-300 drop-shadow-md">
                                {selectedAve.nombreCientifico}
                            </p>
                        </div>
                    </div>

                    {/* CONTENIDO ESTILO ARTÍCULO */}
                    <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-16 relative">

                        {/* Columna Principal (Audio y Textos) */}
                        <div className="lg:col-span-2 space-y-12">

                            {/* REPRODUCTOR DE AUDIO ELEGANTE */}
                            <div className="bg-slate-50 rounded-3xl p-8 border-l-4 border-emerald-600 shadow-sm">
                                <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4 flex items-center gap-3">
                                    <Volume2 className="w-6 h-6 text-emerald-600" /> Canto y Llamados
                                </h3>
                                {buscandoAudio ? (
                                    <div className="flex items-center gap-3 text-slate-500 font-medium py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                        Sincronizando con base de datos global...
                                    </div>
                                ) : audioCanto ? (
                                    <div className="mt-4">
                                        <audio controls className="w-full h-12 outline-none rounded-lg custom-audio">
                                            <source src={audioCanto} type="audio/mpeg" />
                                        </audio>
                                        <p className="text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest text-right">Grabación oficial via Xeno-canto</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic py-2">No existen grabaciones públicas verificadas para esta especie.</p>
                                )}
                            </div>

                            {/* SECCIONES DE TEXTO (Descripción y Hábitat) */}
                            {selectedAve.descripcion && (
                                <section>
                                    <h3 className="text-3xl font-serif font-bold text-slate-900 mb-6 border-b border-gray-200 pb-4">Acerca del Ave</h3>
                                    <p className="text-lg text-gray-700 leading-relaxed font-light whitespace-pre-line first-letter:text-5xl first-letter:font-serif first-letter:font-black first-letter:text-emerald-700 first-letter:mr-2 first-letter:float-left">
                                        {selectedAve.descripcion}
                                    </p>
                                </section>
                            )}

                            {selectedAve.habitat && (
                                <section>
                                    <h3 className="text-2xl font-serif font-bold text-slate-900 mb-4">Hábitat y Comportamiento</h3>
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                        <p className="text-base text-gray-700 leading-relaxed flex items-start gap-4">
                                            <MapPin className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                                            <span>{selectedAve.habitat}</span>
                                        </p>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Columna Lateral (Sidebar de Datos Rápidos) */}
                        <div className="lg:col-span-1 space-y-8">

                            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                                <h3 className="text-lg font-black uppercase tracking-widest text-emerald-400 mb-6">Taxonomía</h3>

                                <div className="space-y-6">
                                    <div className="border-b border-slate-700 pb-4">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Orden</p>
                                        <p className="text-lg font-serif font-bold">{selectedAve.orden || 'No clasificado'}</p>
                                    </div>
                                    <div className="border-b border-slate-700 pb-4">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Familia</p>
                                        <p className="text-lg font-serif font-bold">{selectedAve.familia || 'No clasificado'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Especie</p>
                                        <p className="text-base italic font-light">{selectedAve.nombreCientifico}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Mis Estadísticas */}
                            <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100">
                                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5" /> Mis Estadísticas
                                </h3>

                                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm text-center">
                                    <p className="text-4xl font-black text-emerald-600 mb-1">{getDatosAvistamiento(selectedAve.id).vistas}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avistamientos Registrados</p>
                                </div>

                                {getDatosAvistamiento(selectedAve.id).vistas > 0 && (
                                    <div className="text-sm text-slate-700 font-medium space-y-2 mt-6">
                                        <p className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-emerald-500" />
                                            {new Date(getDatosAvistamiento(selectedAve.id).fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-emerald-500" />
                                            {getDatosAvistamiento(selectedAve.id).location || 'Sin ubicación'}
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* MENÚ INFERIOR ESTILO MINIMALISTA */}
            <nav className="bg-white border-t border-gray-100 flex justify-around items-center pb-safe fixed bottom-0 w-full h-[72px] shrink-0 z-40 px-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <button onClick={() => setActiveTab('identify')} className={`flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${activeTab === 'identify' ? 'text-emerald-600 -translate-y-1' : 'text-gray-400 hover:text-slate-800'}`}>
                    <Mic className={`w-6 h-6 ${activeTab === 'identify' ? 'stroke-[2.5]' : 'stroke-2'}`} /><span className="text-[9px] font-bold uppercase tracking-wider">Identificar</span>
                </button>
                <button onClick={() => setActiveTab('lists')} className={`flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${activeTab === 'lists' ? 'text-emerald-600 -translate-y-1' : 'text-gray-400 hover:text-slate-800'}`}>
                    <ClipboardList className={`w-6 h-6 ${activeTab === 'lists' ? 'stroke-[2.5]' : 'stroke-2'}`} /><span className="text-[9px] font-bold uppercase tracking-wider">Listas</span>
                </button>
                <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${activeTab === 'explore' ? 'text-emerald-600 -translate-y-1' : 'text-gray-400 hover:text-slate-800'}`}>
                    <Map className={`w-6 h-6 ${activeTab === 'explore' ? 'stroke-[2.5]' : 'stroke-2'}`} /><span className="text-[9px] font-bold uppercase tracking-wider">Explorar</span>
                </button>
                <button onClick={() => setActiveTab('collection')} className={`flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${activeTab === 'collection' ? 'text-emerald-600 -translate-y-1' : 'text-gray-400 hover:text-slate-800'}`}>
                    <Library className={`w-6 h-6 ${activeTab === 'collection' ? 'stroke-[2.5]' : 'stroke-2'}`} /><span className="text-[9px] font-bold uppercase tracking-wider">Mi Guía</span>
                </button>
                <button onClick={() => setActiveTab('soundbox')} className={`flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${activeTab === 'soundbox' ? 'text-emerald-600 -translate-y-1' : 'text-gray-400 hover:text-slate-800'}`}>
                    <Speaker className={`w-6 h-6 ${activeTab === 'soundbox' ? 'stroke-[2.5]' : 'stroke-2'}`} /><span className="text-[9px] font-bold uppercase tracking-wider">Sonidos</span>
                </button>
            </nav>
        </div>
    );
}