import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { MapPin, Plus, Loader2, Navigation } from 'lucide-react';

// Componente para detectar clics en el mapa (Solo funciona si eres Admin)
function MapClickHandler({ isAdmin, onMapClick }) {
    useMapEvents({
        click(e) {
            if (isAdmin) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

export default function MapExplore({ db, user }) {
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para crear un nuevo punto
    const [showModal, setShowModal] = useState(false);
    const [newCoords, setNewCoords] = useState(null);
    const [hotspotName, setHotspotName] = useState('');
    const [hotspotDesc, setHotspotDesc] = useState('');

    const isAdmin = user?.email === "potopo.ann@gmail.com";

    // Cargar los puntos desde Firebase
    const cargarHotspots = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "hotspots"));
            const data = [];
            querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setHotspots(data);
        } catch (e) {
            console.error("Error cargando hotspots:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarHotspots();
    }, []);

    const handleMapClick = (latlng) => {
        setNewCoords(latlng);
        setHotspotName('');
        setHotspotDesc('');
        setShowModal(true);
    };

    const guardarHotspot = async () => {
        if (!hotspotName.trim()) return alert("Ponle un nombre al punto.");

        try {
            await addDoc(collection(db, "hotspots"), {
                nombre: hotspotName,
                descripcion: hotspotDesc,
                lat: newCoords.lat,
                lng: newCoords.lng,
                creadoPor: user.email,
                fecha: new Date().toISOString()
            });
            setShowModal(false);
            cargarHotspots(); // Recargar mapa
        } catch (error) {
            console.error("Error guardando hotspot:", error);
            alert("Error al guardar el punto.");
        }
    };

    return (
        <div className="relative w-full h-full animate-in fade-in duration-300 flex flex-col">

            {/* Cabecera del Mapa */}
            <div className="bg-white p-4 shadow-sm z-10 shrink-0 border-b border-gray-200">
                <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" /> Explorar Sabinas
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    {isAdmin
                        ? "👑 Modo Admin: Haz clic en cualquier lugar del mapa para crear un Punto de Interés."
                        : "Descubre los mejores lugares para pajarear en la zona."}
                </p>
            </div>

            {/* Contenedor del Mapa */}
            <div className="flex-1 w-full bg-gray-100 relative z-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : (
                    <MapContainer
                        center={[26.4953, -100.1755]} // Coordenadas de Sabinas Hidalgo
                        zoom={13}
                        className="w-full h-full"
                        zoomControl={false}
                    >
                        {/* Capa base de OpenStreetMap (Gratis y libre) */}
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapClickHandler isAdmin={isAdmin} onMapClick={handleMapClick} />

                        {/* Dibujar los puntos guardados */}
                        {hotspots.map(punto => (
                            <Marker key={punto.id} position={[punto.lat, punto.lng]}>
                                <Popup className="rounded-xl">
                                    <div className="p-1">
                                        <h3 className="font-bold text-gray-800 text-sm mb-1">{punto.nombre}</h3>
                                        <p className="text-xs text-gray-600 leading-tight mb-2">{punto.descripcion}</p>
                                        <button className="text-[10px] w-full bg-emerald-50 text-emerald-700 font-bold py-1.5 rounded border border-emerald-200 flex items-center justify-center gap-1">
                                            <Navigation className="w-3 h-3" /> Iniciar Recorrido
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}
            </div>

            {/* Modal para crear Hotspot (Solo Admin) */}
            {showModal && isAdmin && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 p-5">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-600" /> Nuevo Punto de Interés
                        </h3>

                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Nombre del lugar</label>
                        <input
                            type="text"
                            value={hotspotName}
                            onChange={(e) => setHotspotName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-4"
                            placeholder="Ej. Parque La Turbina..."
                        />

                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Descripción / Aves comunes</label>
                        <textarea
                            value={hotspotDesc}
                            onChange={(e) => setHotspotDesc(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-4 resize-none h-20"
                            placeholder="Ej. Excelente zona para observar Martín Pescador..."
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={guardarHotspot}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition shadow-md"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}