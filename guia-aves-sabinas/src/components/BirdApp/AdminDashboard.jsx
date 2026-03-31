import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { BarChart3, ClipboardList, MapPin, Download, ArrowLeft, Loader2, Users } from 'lucide-react';
import { diccionarioAves } from './diccionarioSabinas'; // <-- DICCIONARIO IMPORTADO

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
const auth = getAuth(app);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('listas');

    const [listas, setListas] = useState([]);
    const [hotspots, setHotspots] = useState([]);

    useEffect(() => {
        const checkAdminAndLoadData = async () => {
            onAuthStateChanged(auth, async (user) => {
                if (!user || user.email !== "potopo.ann@gmail.com") {
                    alert("Acceso denegado. Área exclusiva para administradores.");
                    navigate('/');
                    return;
                }

                try {
                    // 1. Cargar Listas de Observación
                    const listasSnap = await getDocs(collection(db, "listas_observacion"));
                    const dataListas = [];
                    listasSnap.forEach(doc => dataListas.push({ id: doc.id, ...doc.data() }));
                    // Ordenar por fecha más reciente
                    dataListas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                    setListas(dataListas);

                    // 2. Cargar Hotspots
                    const hotspotsSnap = await getDocs(collection(db, "hotspots"));
                    const dataHotspots = [];
                    hotspotsSnap.forEach(doc => dataHotspots.push({ id: doc.id, ...doc.data() }));
                    setHotspots(dataHotspots);

                } catch (error) {
                    console.error("Error cargando datos del Dashboard:", error);
                } finally {
                    setLoading(false);
                }
            });
        };
        checkAdminAndLoadData();
    }, [navigate]);

    // ✨ FUNCIÓN PARA EXPORTAR A EXCEL (CSV) ✨
    const exportarAExcel = () => {
        if (listas.length === 0) return alert("No hay datos para exportar.");

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID_Lista,Usuario,Email,Fecha,Duracion_Min,Tipo,Ubicacion,Total_Individuos\n";

        listas.forEach(lista => {
            const fecha = new Date(lista.fecha).toLocaleString('es-MX');
            const totalAves = Object.values(lista.aves || {}).reduce((a, b) => a + b, 0);

            // Limpiamos comas en textos para no romper el CSV
            const ubicacionLimpia = (lista.ubicacion || 'Sin ubicación').replace(/,/g, '');
            const nombreLimpio = (lista.userName || 'Usuario').replace(/,/g, '');

            const row = `${lista.id},${nombreLimpio},${lista.userEmail},"${fecha}",${lista.duracion},${lista.tipo},${ubicacionLimpia},${totalAves}`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Reporte_SabinasID_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* HEADER ADMIN */}
            <header className="bg-purple-900 text-white p-6 shadow-md flex justify-between items-center">
                <div>
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-200 hover:text-white transition text-sm font-bold mb-2">
                        <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                    </button>
                    <h1 className="text-2xl font-black flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-400" /> Centro de Comando
                    </h1>
                </div>
                <button
                    onClick={exportarAExcel}
                    className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-sm text-sm border border-purple-500"
                >
                    <Download className="w-4 h-4" /> Exportar Reporte CSV
                </button>
            </header>

            {/* CONTENIDO PRINCIPAL */}
            <div className="max-w-6xl mx-auto p-6">

                {/* TARJETAS DE ESTADÍSTICAS GLOBALES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 border-l-4 border-l-blue-500">
                        <div className="bg-blue-50 p-3 rounded-xl"><ClipboardList className="w-8 h-8 text-blue-500" /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Listas Recibidas</p>
                            <p className="text-3xl font-black text-gray-800">{listas.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="bg-emerald-50 p-3 rounded-xl"><MapPin className="w-8 h-8 text-emerald-500" /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Hotspots Activos</p>
                            <p className="text-3xl font-black text-gray-800">{hotspots.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 border-l-4 border-l-purple-500">
                        <div className="bg-purple-50 p-3 rounded-xl"><Users className="w-8 h-8 text-purple-500" /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Usuarios Participantes</p>
                            <p className="text-3xl font-black text-gray-800">
                                {new Set(listas.map(l => l.userEmail)).size}
                            </p>
                        </div>
                    </div>
                </div>

                {/* TABS DE CONTROL */}
                <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('listas')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'listas' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Reportes de Observación
                    </button>
                    <button
                        onClick={() => setActiveTab('hotspots')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'hotspots' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Gestión de Hotspots
                    </button>
                    {/* 👇 NUEVA PESTAÑA PARA EL DICCIONARIO */}
                    <button
                        onClick={() => setActiveTab('diccionario')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'diccionario' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Diccionario de Especies
                    </button>
                </div>

                {/* TABLA DE LISTAS */}
                {activeTab === 'listas' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                        <th className="p-4 font-bold">Fecha</th>
                                        <th className="p-4 font-bold">Usuario</th>
                                        <th className="p-4 font-bold">Ubicación</th>
                                        <th className="p-4 font-bold">Tipo</th>
                                        <th className="p-4 font-bold">Duración</th>
                                        <th className="p-4 font-bold">Aves Registradas</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {listas.map(lista => (
                                        <tr key={lista.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-800 font-medium">
                                                {new Date(lista.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {lista.userName?.split(' ')[0] || 'Anónimo'} <br />
                                                <span className="text-[10px] text-gray-400">{lista.userEmail}</span>
                                            </td>
                                            <td className="p-4 text-gray-600 max-w-[200px] truncate" title={lista.ubicacion}>
                                                {lista.ubicacion || 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs capitalize">{lista.tipo}</span>
                                            </td>
                                            <td className="p-4 text-gray-600">{lista.duracion} min</td>
                                            <td className="p-4">
                                                <span className="font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                                    {Object.keys(lista.aves || {}).length} spp.
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {listas.length === 0 && (
                                        <tr><td colSpan="6" className="p-8 text-center text-gray-400">Aún no hay listas de observación registradas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* LISTA DE HOTSPOTS */}
                {activeTab === 'hotspots' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hotspots.map(punto => (
                            <div key={punto.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-gray-800 mb-1">{punto.nombre}</h3>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{punto.descripcion}</p>
                                <p className="text-[10px] text-gray-400 font-mono">Lat: {punto.lat?.toFixed(4)}, Lng: {punto.lng?.toFixed(4)}</p>
                            </div>
                        ))}
                        {hotspots.length === 0 && (
                            <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 border-dashed">
                                No has creado ningún Punto de Interés. Ve a la pestaña Explorar en la app principal para crear uno.
                            </div>
                        )}
                    </div>
                )}

                {/* 👇 NUEVO: DICCIONARIO DE AVES */}
                {activeTab === 'diccionario' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
                            <p className="text-sm text-purple-800 font-medium">
                                Este es el diccionario activo para traducir los resultados de BirdNET al español local de Nuevo León.
                                (Total: {Object.keys(diccionarioAves).length} especies).
                            </p>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                                        <th className="p-4 font-bold bg-gray-50">Nombre Científico (BirdNET)</th>
                                        <th className="p-4 font-bold bg-gray-50">Traducción Común (Sabinas)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {Object.entries(diccionarioAves).map(([cientifico, comun]) => (
                                        <tr key={cientifico} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500 italic">{cientifico}</td>
                                            <td className="p-4 text-gray-800 font-bold">{comun}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}