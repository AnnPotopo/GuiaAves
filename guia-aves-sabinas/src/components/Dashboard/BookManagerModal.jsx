import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { X, Key, Calendar, Users, QrCode, UserPlus, Save, Trash2, FileText, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAuth } from 'firebase/auth';

const listaCategorias = ['Conservación', 'Aves', 'Árboles', 'Mamíferos', 'Océano', 'Tecnología', 'General'];

export default function BookManagerModal({ book, onClose, onUpdate }) {
    const auth = getAuth();
    const user = auth.currentUser;

    const [activeTab, setActiveTab] = useState('detalles');

    const [titulo, setTitulo] = useState(book.titulo || '');
    const [descripcion, setDescripcion] = useState(book.descripcion || '');
    const [categorias, setCategorias] = useState(book.categorias || []);
    const [coleccionId, setColeccionId] = useState(book.coleccionId || '');
    const [visibilidad, setVisibilidad] = useState(book.visibilidad || 'publico');
    const [colecciones, setColecciones] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const [codes, setCodes] = useState(book.accessCodes || []);
    const [allowedUsers, setAllowedUsers] = useState(book.allowedUsers || []);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newCode, setNewCode] = useState('');
    const [maxUses, setMaxUses] = useState(1);
    const [expiration, setExpiration] = useState('');

    useEffect(() => {
        const cargarColecciones = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, "colecciones_libros"), where("authorId", "==", book.authorId));
                const snap = await getDocs(q);
                let list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                setColecciones(list);
            } catch (e) {
                console.error(e);
            }
        };
        cargarColecciones();
    }, [user, book.authorId]);

    const handleCategoryCheckbox = (cat) => {
        let current = [...categorias];
        if (current.includes(cat)) {
            current = current.filter(c => c !== cat);
        } else {
            if (current.length >= 4) return alert("Máximo 4 categorías permitidas.");
            current.push(cat);
        }
        setCategorias(current);
    };

    const handleSaveMetadata = async (e) => {
        e.preventDefault();
        if (categorias.length === 0) return alert("Debes seleccionar al menos 1 categoría.");

        setIsSaving(true);
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), {
                titulo, descripcion, categorias, coleccionId, visibilidad
            });
            alert("¡Cambios guardados correctamente!");
            onUpdate();
        } catch (error) {
            alert("Error al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateCode = async (e) => {
        e.preventDefault();
        if (!newCode.trim()) return;

        const codeObj = {
            code: newCode.toUpperCase(),
            maxUses: parseInt(maxUses),
            used: 0,
            expiresAt: expiration ? new Date(expiration).toISOString() : null,
            createdAt: new Date().toISOString()
        };

        const updatedCodes = [...codes, codeObj];
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { accessCodes: updatedCodes });
            setCodes(updatedCodes);
            setNewCode('');
            setMaxUses(1);
            setExpiration('');
            onUpdate();
        } catch (error) { console.error(error); }
    };

    const handleDeleteCode = async (codeStr) => {
        const updatedCodes = codes.filter(c => c.code !== codeStr);
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { accessCodes: updatedCodes });
            setCodes(updatedCodes);
            onUpdate();
        } catch (error) { console.error(error); }
    };

    const handleAddUserManually = async (e) => {
        e.preventDefault();
        if (!newUserEmail.trim()) return;

        const updatedUsers = [...allowedUsers, newUserEmail.toLowerCase()];
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { allowedUsers: updatedUsers });
            setAllowedUsers(updatedUsers);
            setNewUserEmail('');
            onUpdate();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">Gestión de Publicación</h2>
                        <p className="text-sm text-gray-500 truncate max-w-md">"{book.titulo}"</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-200 p-2 rounded-full transition"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex bg-white border-b border-gray-200 px-6 pt-4 gap-4 shrink-0">
                    <button onClick={() => setActiveTab('detalles')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'detalles' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        <FileText className="w-4 h-4" /> Detalles del Documento
                    </button>
                    <button onClick={() => setActiveTab('accesos')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'accesos' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        <ShieldCheck className="w-4 h-4" /> Privacidad y Accesos
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                    {activeTab === 'detalles' && (
                        <form onSubmit={handleSaveMetadata} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título de la Publicación</label>
                                <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 bg-gray-50 focus:bg-white transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción corta (Opcional)</label>
                                <textarea rows="3" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 bg-gray-50 focus:bg-white transition-colors resize-none" placeholder="¿De qué trata este documento?" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colección / Carpeta</label>
                                    <select value={coleccionId} onChange={e => setColeccionId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                                        <option value="">Ninguna (Libre)</option>
                                        {colecciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visibilidad General</label>
                                    <select value={visibilidad} onChange={e => setVisibilidad(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                                        <option value="publico">🌍 Público</option>
                                        <option value="privado">🔒 Privado (Con código)</option>
                                        <option value="oculto">👻 Oculto (Sólo yo)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categorías (Mínimo 1, Máximo 4)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    {listaCategorias.map(cat => {
                                        const checked = categorias.includes(cat);
                                        return (
                                            <label key={cat} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition ${checked ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={checked} onChange={() => handleCategoryCheckbox(cat)} className="hidden" />
                                                {checked && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                                {cat}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2">
                                    <Save className="w-5 h-5" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'accesos' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className={`p-4 rounded-2xl border ${visibilidad === 'publico' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : visibilidad === 'privado' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`}>
                                    <h3 className="font-bold mb-1 text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Estado Actual: {visibilidad.toUpperCase()}</h3>
                                    <p className="text-xs opacity-90">{visibilidad === 'publico' ? 'Cualquier persona puede ver e interactuar con esta publicación.' : visibilidad === 'privado' ? 'Sólo personas con enlace de invitación directa o código QR pueden acceder.' : 'Nadie en la plataforma puede ver esta publicación, excepto tú.'}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                                    <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invitación Directa</h3>
                                    <p className="text-xs text-blue-700 mb-3">Otorga acceso directo escribiendo el correo de otro usuario.</p>
                                    <form onSubmit={handleAddUserManually} className="flex gap-2 mb-4">
                                        <input type="email" placeholder="correo@ejemplo.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="flex-1 border border-blue-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Añadir</button>
                                    </form>
                                    {allowedUsers.length > 0 && (
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                            {allowedUsers.map(email => (
                                                <div key={email} className="bg-blue-50 p-2 text-xs font-medium text-blue-900 rounded border border-blue-100 flex justify-between items-center">{email}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col h-full">
                                <h3 className="font-bold text-amber-900 mb-2 text-sm uppercase tracking-wider flex items-center gap-2"><Key className="w-4 h-4" /> Generador de Pases (QR)</h3>
                                <p className="text-xs text-amber-700 mb-4">Crea códigos canjeables. Quien escanee el QR obtendrá acceso a la lectura.</p>
                                <form onSubmit={handleGenerateCode} className="space-y-3 bg-amber-50 p-4 rounded-xl mb-6 border border-amber-100">
                                    <div>
                                        <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Código Promocional</label>
                                        <input type="text" required value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="w-full border border-amber-200 rounded-lg p-2.5 text-sm font-mono uppercase focus:border-amber-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Límite Usos</label>
                                            <input type="number" min="1" required value={maxUses} onChange={e => setMaxUses(e.target.value)} className="w-full border border-amber-200 rounded-lg p-2.5 text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expiración</label>
                                            <input type="date" value={expiration} onChange={e => setExpiration(e.target.value)} className="w-full border border-amber-200 rounded-lg p-2.5 text-sm outline-none" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-lg text-sm mt-2 transition-colors">Crear Pase QR</button>
                                </form>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 min-h-[150px]">
                                    {codes.map(c => (
                                        <div key={c.code} className="bg-white p-3 rounded-xl border border-gray-200 flex gap-4 shadow-sm hover:border-amber-300 transition-colors">
                                            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                                                <QRCodeSVG value={c.code} size={60} />
                                                <span className="text-[9px] mt-1 text-gray-500 font-bold uppercase tracking-wider"><QrCode className="w-3 h-3 inline" /> Escanear</span>
                                            </div>
                                            <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-mono font-black text-amber-600 text-lg truncate pr-2">{c.code}</h4>
                                                    <button onClick={() => handleDeleteCode(c.code)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                                    <div className="flex justify-between bg-gray-50 p-1.5 rounded"><span>Usos:</span><strong className={c.used >= c.maxUses ? 'text-red-500' : 'text-emerald-600'}>{c.used} / {c.maxUses}</strong></div>
                                                    <div className="flex justify-between bg-gray-50 p-1.5 rounded"><span>Caduca:</span><strong>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Ilimitado'}</strong></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {codes.length === 0 && <p className="text-xs text-center text-gray-400 italic py-8">No hay códigos activos.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}