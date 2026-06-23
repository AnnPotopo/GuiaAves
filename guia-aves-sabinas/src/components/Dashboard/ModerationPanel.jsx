import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ShieldAlert, AlertTriangle, Search, Filter, Ban, Clock, Trash2, CheckCircle, XCircle, UserX, Loader2 } from 'lucide-react';

export default function ModerationPanel() {
    const [denuncias, setDenuncias] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para los filtros del menú derecho
    const [filtroEstado, setFiltroEstado] = useState('pendiente'); // pendiente, resuelto, todos
    const [filtroMotivo, setFiltroMotivo] = useState('Todos');
    const [filtroUsuario, setFiltroUsuario] = useState('');

    // Estado para procesar acciones
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        cargarDenuncias();
    }, []);

    const cargarDenuncias = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "denuncias"));
            let reportes = [];
            querySnapshot.forEach((doc) => {
                reportes.push({ id: doc.id, ...doc.data() });
            });
            // Ordenar de más reciente a más antiguo
            reportes.sort((a, b) => b.createdAt - a.createdAt);
            setDenuncias(reportes);
        } catch (error) {
            console.error("Error al cargar denuncias:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES SOBRE LA DENUNCIA ---
    const cambiarEstadoDenuncia = async (denunciaId, nuevoEstado) => {
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "denuncias", denunciaId), {
                status: nuevoEstado
            });
            setDenuncias(prev => prev.map(d => d.id === denunciaId ? { ...d, status: nuevoEstado } : d));
        } catch (error) {
            alert("Error al actualizar la denuncia.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- ACCIONES SOBRE EL USUARIO INFRACTOR ---
    const suspenderUsuario = async (userId, dias) => {
        if (!window.confirm(`¿Estás seguro de suspender a este usuario por ${dias} días? No podrá subir archivos.`)) return;
        setIsProcessing(true);
        try {
            const fechaFin = new Date();
            fechaFin.setDate(fechaFin.getDate() + dias);

            await updateDoc(doc(db, "usuarios", userId), {
                estadoBaneo: 'suspendido',
                baneoHasta: fechaFin.toISOString()
            });
            alert(`Usuario suspendido por ${dias} días.`);
        } catch (error) {
            console.error(error);
            alert("El usuario aún no tiene un perfil creado en la colección 'usuarios' o hubo un error.");
        } finally {
            setIsProcessing(false);
        }
    };

    const banearUsuario = async (userId) => {
        if (!window.confirm("¿Estás seguro de BANEAR PERMANENTEMENTE a este usuario? Nunca más podrá subir archivos.")) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "usuarios", userId), {
                estadoBaneo: 'baneado',
                baneoHasta: 'permanente'
            });
            alert("Usuario baneado permanentemente.");
        } catch (error) {
            alert("Error al banear al usuario.");
        } finally {
            setIsProcessing(false);
        }
    };

    const borrarArchivosUsuario = async (userId) => {
        if (!window.confirm("🚨 ¡ADVERTENCIA CRÍTICA! ¿Estás seguro de BORRAR TODOS LOS ARCHIVOS publicados por este usuario? Esta acción no se puede deshacer.")) return;
        setIsProcessing(true);
        try {
            const q = query(collection(db, "libros_publicados"), where("authorId", "==", userId));
            const snap = await getDocs(q);

            const batch = writeBatch(db);
            snap.forEach((documento) => {
                batch.delete(doc(db, "libros_publicados", documento.id));
            });

            await batch.commit();
            alert(`Se han borrado ${snap.size} publicaciones de este usuario.`);
        } catch (error) {
            console.error(error);
            alert("Error al borrar los archivos.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- LÓGICA DE FILTRADO ---
    const denunciasFiltradas = denuncias.filter(d => {
        if (filtroEstado !== 'todos' && d.status !== filtroEstado) return false;
        if (filtroMotivo !== 'Todos' && d.reason !== filtroMotivo) return false;
        if (filtroUsuario && !d.reportedAuthorId.includes(filtroUsuario) && !d.bookTitle.toLowerCase().includes(filtroUsuario.toLowerCase())) return false;
        return true;
    });

    // --- LÓGICA DE USUARIOS CRÍTICOS ---
    // Contamos cuántas denuncias tiene cada usuario reportado
    const conteoUsuarios = {};
    denuncias.forEach(d => {
        if (!conteoUsuarios[d.reportedAuthorId]) {
            conteoUsuarios[d.reportedAuthorId] = 0;
        }
        // Solo contamos las pendientes o las que resultaron reales
        if (d.status !== 'ignorado') {
            conteoUsuarios[d.reportedAuthorId] += 1;
        }
    });

    const usuariosCriticos = Object.keys(conteoUsuarios).map(userId => ({
        userId,
        count: conteoUsuarios[userId]
    })).filter(u => u.count >= 2).sort((a, b) => b.count - a.count);

    return (
        <div className="h-full bg-gray-50 flex flex-col font-sans overflow-hidden">

            {/* CABECERA */}
            <nav className="bg-red-900 px-6 py-4 shrink-0 flex items-center justify-between z-20 shadow-md text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-red-800 p-2 rounded-xl border border-red-700">
                        <ShieldAlert className="w-6 h-6 text-red-200" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold leading-none">Panel de Moderación</h1>
                        <p className="text-red-300 text-xs mt-1">Centro de seguridad y denuncias</p>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">

                {/* ÁREA CENTRAL: LISTA DE DENUNCIAS */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-6">
                                Casos Reportados ({denunciasFiltradas.length})
                            </h2>

                            {denunciasFiltradas.map(denuncia => (
                                <div key={denuncia.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">

                                    {/* Info de la Denuncia */}
                                    <div className="p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-1 rounded">
                                                Motivo: {denuncia.reason}
                                            </span>
                                            <span className="text-xs text-gray-400 font-bold">
                                                {new Date(denuncia.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h3 className="font-black text-gray-800 text-lg mb-1">
                                            Documento: "{denuncia.bookTitle}"
                                        </h3>

                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                                            <p className="text-sm text-gray-600 italic">
                                                "{denuncia.details || 'Sin detalles adicionales.'}"
                                            </p>
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            Reportado por: <strong className="text-gray-700">{denuncia.reporterName}</strong>
                                        </p>
                                    </div>

                                    {/* Panel de Acciones */}
                                    <div className="p-5 bg-gray-50 w-full md:w-64 shrink-0 flex flex-col gap-2 justify-center">

                                        <div className="mb-2 text-center">
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${denuncia.status === 'pendiente' ? 'bg-amber-100 text-amber-700' : denuncia.status === 'resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                Estado: {denuncia.status.toUpperCase()}
                                            </span>
                                        </div>

                                        {denuncia.status === 'pendiente' && (
                                            <>
                                                <button
                                                    onClick={() => cambiarEstadoDenuncia(denuncia.id, 'resuelto')}
                                                    disabled={isProcessing}
                                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Marcar Resuelto
                                                </button>
                                                <button
                                                    onClick={() => cambiarEstadoDenuncia(denuncia.id, 'ignorado')}
                                                    disabled={isProcessing}
                                                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                                                >
                                                    <XCircle className="w-4 h-4" /> Ignorar / Falso
                                                </button>
                                            </>
                                        )}

                                        <div className="border-t border-gray-200 my-1"></div>

                                        <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-wider mb-1">
                                            Acciones contra Autor
                                        </p>

                                        <button
                                            onClick={() => suspenderUsuario(denuncia.reportedAuthorId, 7)}
                                            disabled={isProcessing}
                                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm"
                                        >
                                            <Clock className="w-4 h-4" /> Suspender 7 días
                                        </button>

                                        <button
                                            onClick={() => banearUsuario(denuncia.reportedAuthorId)}
                                            disabled={isProcessing}
                                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm"
                                        >
                                            <Ban className="w-4 h-4" /> Banear
                                        </button>

                                        <button
                                            onClick={() => borrarArchivosUsuario(denuncia.reportedAuthorId)}
                                            disabled={isProcessing}
                                            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm mt-1"
                                        >
                                            <Trash2 className="w-4 h-4" /> Borrar sus PDFs
                                        </button>

                                    </div>
                                </div>
                            ))}

                            {denunciasFiltradas.length === 0 && (
                                <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
                                    <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">No hay denuncias con estos filtros.</p>
                                    <p className="text-sm">Tu comunidad está a salvo por ahora.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MENÚ LATERAL DERECHO (JERÁRQUICO Y FILTROS) */}
                <aside className="w-64 lg:w-80 bg-white border-l border-gray-200 shrink-0 shadow-lg flex flex-col z-10 overflow-y-auto custom-scrollbar">

                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-black text-gray-800 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" /> Filtros Jerárquicos
                        </h3>
                    </div>

                    <div className="p-5 space-y-6">

                        {/* Filtro por Estado */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                1. Estado del Reporte
                            </label>
                            <div className="space-y-2">
                                {['pendiente', 'resuelto', 'ignorado', 'todos'].map(estado => (
                                    <label key={estado} className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-bold cursor-pointer transition ${filtroEstado === estado ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="estado"
                                            value={estado}
                                            checked={filtroEstado === estado}
                                            onChange={(e) => setFiltroEstado(e.target.value)}
                                            className="hidden"
                                        />
                                        {estado === 'pendiente' ? '⏳ Pendientes' : estado === 'resuelto' ? '✅ Resueltos' : estado === 'ignorado' ? '❌ Ignorados' : '📁 Ver Todos'}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Filtro por Temática */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                2. Temática de Infracción
                            </label>
                            <select
                                value={filtroMotivo}
                                onChange={(e) => setFiltroMotivo(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-red-400"
                            >
                                <option value="Todos">Todas las temáticas</option>
                                <option value="plagio">Plagio de contenido</option>
                                <option value="desinformacion">Desinformación</option>
                                <option value="sexual">Contenido sexual</option>
                                <option value="odio">Discurso de odio</option>
                                <option value="spam">Spam</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        {/* Filtro por Usuario */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                3. Buscar Autor o Libro
                            </label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ID de usuario o título..."
                                    value={filtroUsuario}
                                    onChange={(e) => setFiltroUsuario(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN DE USUARIOS CRÍTICOS */}
                    <div className="mt-auto border-t border-gray-200 bg-red-50 p-5">
                        <h3 className="font-black text-red-800 flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Usuarios en Crítico
                        </h3>
                        <p className="text-xs text-red-600 mb-4 font-medium">
                            Usuarios con 2 o más reportes activos (no ignorados). Requieren atención inmediata.
                        </p>

                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {usuariosCriticos.length === 0 ? (
                                <p className="text-sm text-gray-500 italic text-center py-2">Ningún usuario en riesgo.</p>
                            ) : (
                                usuariosCriticos.map(u => (
                                    <div key={u.userId} className="bg-white border border-red-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-mono text-gray-600 truncate pr-2 w-full" title={u.userId}>ID: {u.userId}</p>
                                            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                                                {u.count} Rep.
                                            </span>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                onClick={() => banearUsuario(u.userId)}
                                                disabled={isProcessing}
                                                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-1.5 rounded transition"
                                            >
                                                Banear
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setFiltroUsuario(u.userId);
                                                }}
                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded transition"
                                            >
                                                Ver Casos
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    );
}