import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ClipboardList, Play, Square, Plus, Minus, Send, MapPin, Clock, Map as MapIcon, Route, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
// 👇 AQUÍ ESTÁ EL IMPORT QUE FALTABA
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

// Se agregó avesRadar = [] por si acaso la variable llega vacía no marque error
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
                            if (dist > 0.005) {
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
        if (Object.keys(listaAves).length === 0) return alert("La lista está vacía.");

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
                ubicacion: ubicacion,
                tipo: tipoObservacion,
                fecha: startTime.toISOString(),
                duracion: duracionMinutos,
                distanciaKm: parseFloat(distanciaKm.toFixed(2)),
                rutaGPS: track,
                aves: listaAves,
                estado: 'completada'
            });

            alert("¡Lista enviada con éxito!");
            setIsActive(false);
            setListaAves({});
            setTrack([]);
        } catch (e) {
            console.error(e);
            alert("Error al enviar la lista.");
        }
    };

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    if (!isActive) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full animate-in fade-in pb-20">
                <div className="bg-emerald-50 p-6 rounded-full mb-6 relative">
                    <ClipboardList className="w-12 h-12 text-emerald-600" />
                    <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1 border-2 border-white">
                        <Route className="w-4 h-4 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Nueva Lista con Track</h2>
                <p className="text-gray-500 text-center mb-8 max-w-xs text-sm">
                    Comienza una sesión. Tu celular registrará tu recorrido en el mapa automáticamente mientras cuentas aves.
                </p>
                <button
                    onClick={iniciarLista}
                    className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <Play className="w-5 h-5 fill-current" /> Iniciar Recorrido
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom-4 pb-16">
            {/* Header de Sesión */}
            <div className="p-4 bg-gray-900 text-white shadow-xl shrink-0 z-20">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">En recorrido</span>
                    </div>
                    <button
                        onClick={finalizarYEnviar}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg transition-colors"
                    >
                        <Send className="w-3 h-3" /> Finalizar
                    </button>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto pb-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3 text-blue-400" /> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="flex items-center gap-1 shrink-0"><Route className="w-3 h-3 text-amber-400" /> {distanciaKm.toFixed(2)} km</div>
                    <div className="flex items-center gap-1 shrink-0"><MapIcon className="w-3 h-3 text-emerald-400" /> Puntos GPS: {track.length}</div>
                </div>
            </div>

            {/* MINI MAPA EN VIVO */}
            <div className="h-40 w-full bg-gray-200 shrink-0 relative border-b-2 border-gray-300">
                {track.length > 0 ? (
                    <MapContainer
                        center={track[track.length - 1]}
                        zoom={16}
                        className="w-full h-full z-0"
                        zoomControl={false}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Polyline positions={track} color="#3b82f6" weight={4} dashArray="5, 10" />
                        <Marker position={track[track.length - 1]}>
                            <Popup>Estás aquí</Popup>
                        </Marker>
                    </MapContainer>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs font-bold">Obteniendo señal GPS...</span>
                    </div>
                )}
            </div>

            {/* Selector de Tipo */}
            <div className="flex p-2 bg-gray-100 gap-2 shrink-0 border-b border-gray-200">
                {['desplazamiento', 'estacionario', 'incidental'].map(tipo => (
                    <button
                        key={tipo}
                        onClick={() => setTipoObservacion(tipo)}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg capitalize transition-all ${tipoObservacion === tipo ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        {tipo}
                    </button>
                ))}
            </div>

            {/* Lista de Conteo Ordenada (Estilo eBird) */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Aves Posibles (Probables al inicio)</h3>

                {Object.entries(diccionarioAves)
                    .sort(([cientificoA, comunA], [cientificoB, comunB]) => {
                        // El radar de GBIF nos dice qué aves son comunes hoy. Las ponemos arriba.
                        const radarNombres = avesRadar.map(a => a.cientifico.toLowerCase());
                        const aEsProbable = radarNombres.includes(cientificoA);
                        const bEsProbable = radarNombres.includes(cientificoB);

                        if (aEsProbable && !bEsProbable) return -1;
                        if (!aEsProbable && bEsProbable) return 1;
                        return comunA.localeCompare(comunB); // Luego alfabéticamente
                    })
                    .map(([cientifico, comun]) => {
                        const radarNombres = avesRadar.map(a => a.cientifico.toLowerCase());
                        const esProbable = radarNombres.includes(cientifico);

                        return (
                            <div key={cientifico} className={`flex items-center justify-between py-3 border-b border-gray-200 px-3 rounded-xl mb-2 shadow-sm ${esProbable ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-sm leading-tight flex items-center gap-1">
                                            {comun} {esProbable && <span className="w-2 h-2 bg-emerald-500 rounded-full" title="Probable hoy"></span>}
                                        </span>
                                        <span className="text-[10px] italic text-gray-500">{cientifico}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                                    <button onClick={() => ajustarConteo(cientifico, -1)} className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-red-500 transition-colors shadow-sm">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-6 text-center font-black text-emerald-700 text-sm">
                                        {listaAves[cientifico] || 0}
                                    </span>
                                    <button onClick={() => ajustarConteo(cientifico, 1)} className="p-1.5 bg-white rounded-lg text-gray-500 hover:text-emerald-600 transition-colors shadow-sm">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}