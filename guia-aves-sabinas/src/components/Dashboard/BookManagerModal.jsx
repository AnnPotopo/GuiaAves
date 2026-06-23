import React, { useState } from 'react';
import { X, Save, Shield, FileText, QrCode, Mail, Trash2, Loader2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { QRCodeSVG } from 'qrcode.react';

export default function BookManagerModal({ book, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('detalles');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estados de Detalles
    const [titulo, setTitulo] = useState(book.titulo || '');
    const [descripcion, setDescripcion] = useState(book.descripcion || '');
    const [coleccionId, setColeccionId] = useState(book.coleccionId || 'generales');
    const [categorias, setCategorias] = useState(book.categorias || []);

    // Estados de Accesos
    const [visibilidad, setVisibilidad] = useState(book.visibilidad || 'publico');
    const [nuevoCodigo, setNuevoCodigo] = useState('');
    const [nuevoEmail, setNuevoEmail] = useState('');

    const listaCategorias = ['Conservación', 'Aves', 'Árboles', 'Mamíferos', 'Océano', 'Tecnología', 'General'];

    const handleCategoryToggle = (cat) => {
        if (categorias.includes(cat)) {
            setCategorias(categorias.filter(c => c !== cat));
        } else {
            if (categorias.length >= 4) return alert("Máximo 4 categorías permitidas.");
            setCategorias([...categorias, cat]);
        }
    };

    const handleGenerarCodigo = async () => {
        if (!nuevoCodigo.trim()) return alert("Escribe un código primero.");
        const currentCodes = book.accessCodes || [];
        if (currentCodes.includes(nuevoCodigo.trim().toUpperCase())) return alert("Este código ya existe.");

        try {
            setIsSaving(true);
            const updatedCodes = [...currentCodes, nuevoCodigo.trim().toUpperCase()];
            await updateDoc(doc(db, "libros_publicados", book.id), {
                accessCodes: updatedCodes
            });
            book.accessCodes = updatedCodes;
            setNuevoCodigo('');
            alert("Código generado con éxito.");
        } catch (error) {
            console.error(error);
            alert("Error al generar el código.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAgregarUsuario = async () => {
        if (!nuevoEmail.trim()) return alert("Escribe un correo de usuario.");
        try {
            setIsSaving(true);
            const currentUsers = book.allowedUsers || [];
            const updatedUsers = [...currentUsers, nuevoEmail.trim().toLowerCase()];
            await updateDoc(doc(db, "libros_publicados", book.id), {
                allowedUsers: updatedUsers
            });
            book.allowedUsers = updatedUsers;
            setNuevoEmail('');
            alert("Usuario invitado con éxito.");
        } catch (error) {
            console.error(error);
            alert("Error al invitar usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveChanges = async () => {
        if (categorias.length === 0) return alert("Debes seleccionar al menos 1 categoría.");
        if (!titulo.trim()) return alert("El título no puede estar vacío.");

        try {
            setIsSaving(true);
            await updateDoc(doc(db, "libros_publicados", book.id), {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                coleccionId: coleccionId,
                categorias: categorias,
                visibilidad: visibilidad
            });
            alert("Cambios guardados correctamente.");
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBook = async () => {
        if (window.confirm(`🚨 ¿Estás seguro de que deseas eliminar permanentemente "${book.titulo}"?\n\nEsta acción NO se puede deshacer y todos los usuarios perderán el acceso.`)) {
            try {
                setIsDeleting(true);
                await deleteDoc(doc(db, "libros_publicados", book.id));
                alert("Publicación eliminada correctamente.");
                if (onUpdate) onUpdate();
                onClose();
            } catch (error) {
                console.error("Error al eliminar:", error);
                alert("No se pudo eliminar la publicación. Verifica tus permisos.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-gray-800">Gestionar Publicación</h2>
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{book.titulo}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* PESTAÑAS */}
                <div className="flex px-6 pt-4 border-b border-gray-200 shrink-0 gap-4">
                    <button
                        onClick={() => setActiveTab('detalles')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'detalles' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Detalles del Documento</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('accesos')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'accesos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Privacidad y Accesos</div>
                    </button>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {activeTab === 'detalles' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título de la Publicación</label>
                                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción o Sinopsis</label>
                                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="3" className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none resize-none focus:border-emerald-500" placeholder="Escribe un breve resumen de este documento..." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colección / Carpeta</label>
                                <select value={coleccionId} onChange={(e) => setColeccionId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 bg-white">
                                    <option value="generales">📄 PDFs Generales</option>
                                    {/* Aquí podrías mapear las colecciones del usuario si las pasas como prop, por ahora permite escribir el ID si quieres, o dejarlo en generales */}
                                    <option value={coleccionId}>{coleccionId !== 'generales' ? 'Carpeta Actual' : 'Selecciona...'}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categorías (Mín. 1, Máx. 4)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {listaCategorias.map(cat => {
                                        const isActive = categorias.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => handleCategoryToggle(cat)}
                                                className={`p-2 rounded-lg border text-xs font-bold transition-colors ${isActive ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accesos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Nivel de Visibilidad</label>
                                <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm font-bold text-blue-900 outline-none bg-white focus:border-blue-500 shadow-sm">
                                    <option value="publico">🌍 Público (Cualquiera puede buscarlo y leerlo)</option>
                                    <option value="privado">🔒 Privado (Solo con invitación o Código QR)</option>
                                    <option value="oculto">👻 Oculto (Solo tú lo puedes ver)</option>
                                </select>
                                <p className="text-[10px] text-blue-600 mt-2 font-medium">Si lo pones en Privado, puedes generar códigos a continuación para que la gente acceda.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* CÓDIGOS QR */}
                                <div className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-3"><QrCode className="w-4 h-4 text-emerald-600" /> Generar Código QR</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)} placeholder="Ej. TALLER2026" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase font-mono outline-none focus:border-emerald-500" />
                                        <button onClick={handleGenerarCodigo} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition">Añadir</button>
                                    </div>

                                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                        {(book.accessCodes || []).length === 0 ? (
                                            <p className="text-xs text-gray-400 italic text-center py-2">No hay códigos activos.</p>
                                        ) : (
                                            (book.accessCodes || []).map((code, idx) => (
                                                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between group">
                                                    <div>
                                                        <p className="text-xs font-black font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded inline-block">{code}</p>
                                                    </div>
                                                    <div className="hidden group-hover:block bg-white p-1 rounded-lg border border-gray-200 shadow-lg absolute z-10 translate-x-[-120%]">
                                                        {/* QR REAL GENERADO AL VUELO */}
                                                        <QRCodeSVG value={code} size={80} />
                                                        <p className="text-[8px] text-center mt-1 font-bold text-gray-500">Escanea para acceder</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* INVITAR USUARIOS */}
                                <div className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-3"><Mail className="w-4 h-4 text-blue-600" /> Invitar por Email</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="correo@ejemplo.com" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                        <button onClick={handleAgregarUsuario} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition">Invitar</button>
                                    </div>

                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                        {(book.allowedUsers || []).length === 0 ? (
                                            <p className="text-xs text-gray-400 italic text-center py-2">No hay usuarios invitados.</p>
                                        ) : (
                                            (book.allowedUsers || []).map((email, idx) => (
                                                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 truncate">
                                                    👤 {email}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACCIONES */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <button
                        onClick={handleDeleteBook}
                        disabled={isDeleting || isSaving}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                        title="Eliminar esta publicación"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span className="hidden sm:inline">Eliminar</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving || isDeleting}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-200 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}