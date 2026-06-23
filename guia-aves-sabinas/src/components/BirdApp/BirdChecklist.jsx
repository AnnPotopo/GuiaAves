import React, { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ClipboardList, Play, Square, Plus, Minus, Send, MapPin, Clock, Map as MapIcon, Route } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { diccionarioAves } from './diccionarioSabinas';

// Función matemática para calcular distancia entre dos coordenadas (Fórmula de Haversine)
const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function BirdChecklist({ db, user, ubicacion, avesRadar = [] }) {
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [listaAves, setListaAves] = useState({}); // { aveId: cantidad }
    const [tipoObservacion, setTipoObservacion] = useState('desplazamiento');

    // ESTADOS PARA EL TRACK GPS
    const [track, setTrack] = useState([]);
    const [distanciaKm, setDistanciaKm] = useState(0);
    const watchIdRef = useRef(null);

    const iniciarLista = () => {
        setIsActive(true);
        setStartTime(new Date());
        setListaAves({});
        setTrack([]);
        setDistanciaKm(0);

        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const nuevaPos = [pos.coords.latitude, pos.coords.longitude];
                    setTrack(prevTrack => {
                        if (prevTrack.length > 0) {
                            const ultimoPunto = prevTrack[prevTrack.length - 1];
                            const dist = calcularDistanciaKm(ultimoPunto[0], ultimoPunto[1], nuevaPos[0], nuevaPos[1]);
                            if (dist > 0.005) { // Solo guarda si se movió más de 5 metros
                                setDistanciaKm(d => d + dist);
                                return [...prevTrack, nuevaPos];
                            }
                            return prevTrack;
                        }
                        return [nuevaPos];
                    });
                },
                (err) => {
                    console.warn("Error de GPS (Track):", err);
                    setTrack(prev => prev.length === 0 ? [[26.4953, -100.1755]] : prev);
                },
                { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 }
            );
        } else {
            setTrack([[26.4953, -100.1755]]);
        }
    };

    const ajustarConteo = (aveId, delta) => {
        setListaAves(prev => ({
            ...prev,
            [aveId]: Math.max(0, (prev[aveId] || 0) + delta)
        }));
    };

    const finalizarYEnviar = async () => {
        if (Object.keys(listaAves).length === 0) return alert("La lista está vacía. Añade al menos un ave antes de guardar.");

        const confirmacion = window.confirm("¿Deseas finalizar y enviar esta lista a la base de datos?");
        if (!confirmacion) return;

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        const endTime = new Date();
        const duracionMinutos = Math.max(1, Math.round((endTime - startTime) / 60000));

        try {
            await addDoc(collection(db, "listas_observacion"), {
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                fecha: new Date().toISOString(),
                duracion: duracionMinutos,
                tipo: tipoObservacion,
                ubicacion: ubicacion,
                distanciaKm: distanciaKm,
                rutaGps: track,
                aves: listaAves
            });
            alert("¡Lista enviada y guardada correctamente!");
            setIsActive(false);
            setListaAves({});
            setTrack([]);
        } catch (error) {
            console.error("Error al enviar lista: ", error);
            alert("Hubo un error al guardar la lista en la nube.");
        }
    };

    if (!isActive) {
        return (
            <div className="flex flex-col items-center justify-center p-6 h-full text-center">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <ClipboardList className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Nueva Lista de Observación</h2>
                <p className="text-gray-500 mb-8 text-sm max-w-xs leading-relaxed">
                    Registra todas las aves que veas o escuches en esta expedición para aportar datos a la comunidad científica.
                </p>
                <div className="w-full max-w-xs mb-8 text-left bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Protocolo de Observación</label>
                    <select
                        value={tipoObservacion}
                        onChange={(e) => setTipoObservacion(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 text-sm outline-none focus:border-emerald-500 font-medium"
                    >
                        <option value="desplazamiento">Con desplazamiento (Caminando)</option>
                        <option value="estacionario">Estacionario (Punto Fijo)</option>
                        <option value="incidental">Incidental (Casual)</option>
                    </select>
                </div>
                <button
                    onClick={iniciarLista}
                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-8 rounded-full shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                    <Play className="w-5 h-5 fill-current" /> Iniciar Observación
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            {/* Panel Superior Fijo */}
            <div className="bg-emerald-700 text-white p-4 shadow-md shrink-0 z-10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="font-bold text-sm">Grabando Ruta...</span>
                    </div>
                    <div className="text-xs font-mono bg-black/20 px-2 py-1 rounded-md flex gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.max(1, Math.round((new Date() - startTime) / 60000))} min</span>
                        {tipoObservacion === 'desplazamiento' && (
                            <span className="flex items-center gap-1"><Route className="w-3 h-3" /> {distanciaKm.toFixed(2)} km</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 pl-1 flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-emerald-500" /> Aves Comunes en la zona
                </h3>

                {avesRadar.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                        <p className="text-sm text-gray-400 font-medium">No se detectaron aves frecuentes en esta zona.</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-24">
                        {avesRadar.map((ave, idx) => {
                            const cantidad = listaAves[ave.cientifico] || 0;
                            return (
                                <div key={idx} className={`bg-white rounded-xl p-3 shadow-sm border transition-colors flex items-center justify-between ${cantidad > 0 ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="font-bold text-gray-800 text-sm truncate">{ave.comun}</p>
                                        <p className="text-[10px] text-gray-500 italic truncate">{ave.cientifico}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {cantidad > 0 && (
                                            <button
                                                onClick={() => ajustarConteo(ave.cientifico, -1)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span className={`font-mono text-lg w-6 text-center ${cantidad > 0 ? 'font-black text-emerald-700' : 'text-gray-300 font-medium'}`}>
                                            {cantidad}
                                        </span>
                                        <button
                                            onClick={() => ajustarConteo(ave.cientifico, 1)}
                                            className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Botón Flotante para Terminar */}
            <div className="absolute bottom-6 left-0 w-full px-6 z-20">
                <button
                    onClick={finalizarYEnviar}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-2xl transition-transform active:scale-95"
                >
                    <Square className="w-4 h-4 fill-current text-red-500" /> Finalizar Recorrido
                </button>
            </div>
        </div>
    );
}