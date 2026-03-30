import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Mic, Library, Square, AlertCircle, Loader2, Award, X, Check, MapPin, Search, Volume2, Info, Calendar, Navigation, Edit3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
const db = getFirestore(app);

export default function BirdApp() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('identify');
    const [avesBook, setAvesBook] = useState([]);
    const [progreso, setProgreso] = useState(() => JSON.parse(localStorage.getItem('progresoAves')) || {});
    const [loadingDB, setLoadingDB] = useState(true);

    // Ubicación
    const [ubicacion, setUbicacion] = useState('Sabinas Hidalgo, N.L.');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [tempLocation, setTempLocation] = useState('');

    // Estados Grabación / IA
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sugerenciasIA, setSugerenciasIA] = useState(null);
    const [showConfirmationAnim, setShowConfirmationAnim] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    // Visualizador de Audio (Oscilograma)
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Filtros y Ficha
    const [filtro, setFiltro] = useState('todas');
    const [selectedAve, setSelectedAve] = useState(null);
    const [audioCanto, setAudioCanto] = useState('');
    const [buscandoAudio, setBuscandoAudio] = useState(false);

    useEffect(() => {
        const fetchAves = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "especies"));
                const data = [];
                querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
                setAvesBook(data);
            } catch (e) {
                console.error("Error cargando DB:", e);
            } finally {
                setLoadingDB(false);
            }
        };
        fetchAves();
    }, []);

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
                const lat = pos.coords.latitude.toFixed(4);
                const lon = pos.coords.longitude.toFixed(4);
                setUbicacion(`Lat: ${lat}, Lon: ${lon}`);
                setShowLocationModal(false);
            }, () => {
                alert("No se pudo obtener la ubicación.");
            });
        }
    };

    // --- DIBUJAR OSCILOGRAMA ---
    const dibujarOndas = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            // Si no está grabando, limpiamos
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

    // --- GRABACIÓN CONTROLADA (Lógica Estable) ---
    const iniciarGrabacion = async () => {
        if (avesBook.length === 0) return alert("Espera a que cargue la base de datos.");

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(streamRef.current);
            audioChunksRef.current = [];
            setSugerenciasIA(null);

            // Configurar Analizador visual
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);

            mediaRecorderRef.current.onstop = async () => {
                setIsRecording(false);
                setIsProcessing(true);

                // Detener micrófonos visuales
                if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append("audio", audioBlob, "grabacion.wav");

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

    // PROCESAR RESULTADOS SEPARADOS
    const procesarInteligencia = (datosIA) => {
        let enLibro = [];
        let extras = [];

        let nombresCrudos = [];
        if (Array.isArray(datosIA)) {
            nombresCrudos = datosIA.map(item => typeof item === 'string' ? item : (item.species || item.name || Object.keys(item)[0] || ""));
        } else if (typeof datosIA === 'object' && datosIA !== null) {
            nombresCrudos = Object.keys(datosIA);
        } else {
            nombresCrudos = [String(datosIA)];
        }

        const textoGlobal = JSON.stringify(datosIA).toLowerCase();

        nombresCrudos.forEach(rawName => {
            if (!rawName) return;
            const nombreLimpio = rawName.split('_')[0].trim().toLowerCase();

            const coincidenciaLibro = avesBook.find(ave =>
                (ave.nombreCientifico && ave.nombreCientifico.toLowerCase() === nombreLimpio) ||
                (ave.nombreCientifico && rawName.toLowerCase().includes(ave.nombreCientifico.toLowerCase())) ||
                rawName.toLowerCase().includes(ave.id.replace(/_/g, ' '))
            );

            if (coincidenciaLibro) {
                if (!enLibro.find(a => a.id === coincidenciaLibro.id)) enLibro.push(coincidenciaLibro);
            } else {
                extras.push(rawName.replace(/_/g, ' - '));
            }
        });

        avesBook.forEach(ave => {
            if (!enLibro.find(a => a.id === ave.id)) {
                if ((ave.nombreCientifico && textoGlobal.includes(ave.nombreCientifico.toLowerCase())) || textoGlobal.includes(ave.id.replace(/_/g, ' '))) {
                    enLibro.push(ave);
                }
            }
        });

        setSugerenciasIA({ libro: enLibro, extras: extras });
    };

    const confirmarAvistamiento = (aveId) => {
        const nuevoProgreso = { ...progreso };
        const actual = getDatosAvistamiento(aveId);

        nuevoProgreso[aveId] = {
            count: actual.vistas + 1,
            lastSeen: new Date().toISOString(),
            location: ubicacion
        };

        setProgreso(nuevoProgreso);
        localStorage.setItem('progresoAves', JSON.stringify(nuevoProgreso));

        setShowConfirmationAnim(aveId);
        setTimeout(() => setShowConfirmationAnim(false), 1500);

        const libroActualizado = sugerenciasIA.libro.filter(ave => ave.id !== aveId);
        setSugerenciasIA({ ...sugerenciasIA, libro: libroActualizado });
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-800 overflow-hidden relative">

            {/* HEADER CON UBICACIÓN */}
            <header className="bg-white p-4 flex justify-between items-center z-10 shrink-0 border-b border-gray-200">
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
            <div className="flex-1 overflow-y-auto pb-24 relative">

                {/* --- PESTAÑA IDENTIFICAR --- */}
                {activeTab === 'identify' && (
                    <div className="flex flex-col items-center justify-start h-full p-6">

                        {/* BOTÓN Y OSCILOGRAMA */}
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

                            {/* CANVAS DEL OSCILOGRAMA */}
                            <div className={`transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                                <canvas ref={canvasRef} width="200" height="40" className="rounded-lg"></canvas>
                                <p className="text-[10px] text-gray-400 font-bold text-center mt-1 uppercase flex items-center justify-center gap-1">
                                    <Activity className="w-3 h-3 text-emerald-500" /> Escuchando entorno
                                </p>
                            </div>
                        </div>

                        {/* LISTA DE RESULTADOS */}
                        {sugerenciasIA && (
                            <div className="w-full max-w-lg animate-in slide-in-from-bottom-4 duration-300">

                                {sugerenciasIA.libro.length > 0 && (
                                    <>
                                        <h3 className="text-emerald-600 font-bold text-[11px] uppercase tracking-widest mb-3 px-1">Registradas en tu libro</h3>
                                        {sugerenciasIA.libro.map(ave => (
                                            <div key={ave.id} className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-emerald-200 flex items-center gap-4 transition-all">
                                                <div className="w-16 h-16 rounded-lg bg-cover bg-center border border-gray-100 shrink-0" style={{ backgroundImage: `url(${ave.imagenUrl})` }}></div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{ave.nombreComun}</h4>
                                                    <p className="text-xs text-gray-500 italic truncate">{ave.nombreCientifico}</p>
                                                </div>
                                                <button
                                                    onClick={() => confirmarAvistamiento(ave.id)}
                                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2.5 rounded-lg transition shrink-0"
                                                >
                                                    <Check className="w-5 h-5 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {sugerenciasIA.extras.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-gray-400 font-bold text-[11px] uppercase tracking-widest mb-3 px-1">Otras detecciones</h3>
                                        {sugerenciasIA.extras.map((extra, idx) => (
                                            <div key={idx} className="bg-gray-50 rounded-xl p-3 mb-2 border border-gray-200 flex items-center gap-3 opacity-80">
                                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                                    <Info className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-700 truncate">{extra}</p>
                                                    <p className="text-[9px] text-gray-500 mt-0.5">Especie no incluida en el libro.</p>
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
                        )}

                        {showConfirmationAnim && (
                            <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center animate-in fade-in backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-800">¡Confirmado!</p>
                                    <p className="text-gray-500 text-sm">Añadido a tu colección.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PESTAÑA COLECCIÓN --- */}
                {activeTab === 'collection' && (
                    <div className="p-4 md:p-6 bg-white min-h-full">
                        <div className="mb-6">
                            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight mb-4">Tu Catálogo</h2>
                            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                                {['todas', 'hoy', 'descubiertas', 'faltantes'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFiltro(f)}
                                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors border ${filtro === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {f === 'todas' ? 'Todas' : f === 'hoy' ? 'Vistas Hoy' : f === 'descubiertas' ? 'Descubiertas' : 'Faltantes'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingDB ? (
                            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
                                <Loader2 className="animate-spin w-5 h-5" /> Cargando...
                            </div>
                        ) : Object.keys(avesPorOrden).length === 0 ? (
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