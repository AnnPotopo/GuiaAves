import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { X, Key, Calendar, Users, QrCode, UserPlus, Save, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function BookManagerModal({ book, onClose, onUpdate }) {
    const [visibilidad, setVisibilidad] = useState(book.visibilidad);
    const [codes, setCodes] = useState(book.accessCodes || []);
    const [allowedUsers, setAllowedUsers] = useState(book.allowedUsers || []);
    const [newUserEmail, setNewUserEmail] = useState('');

    // Formulario para nuevo código
    const [newCode, setNewCode] = useState('');
    const [maxUses, setMaxUses] = useState(1);
    const [expiration, setExpiration] = useState('');

    const handleSaveVisibility = async () => {
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { visibilidad });
            onUpdate();
            alert("Visibilidad actualizada.");
        } catch (error) {
            console.error(error);
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
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteCode = async (codeStr) => {
        const updatedCodes = codes.filter(c => c.code !== codeStr);
        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { accessCodes: updatedCodes });
            setCodes(updatedCodes);
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddUserManually = async (e) => {
        e.preventDefault();
        if (!newUserEmail.trim()) return;

        // Aquí idealmente buscaríamos el UID del usuario por su email.
        // Por simplicidad, lo agregamos a la lista de emails permitidos.
        const updatedUsers = [...allowedUsers, newUserEmail.toLowerCase()];

        try {
            await updateDoc(doc(db, "libros_publicados", book.id), { allowedUsers: updatedUsers });
            setAllowedUsers(updatedUsers);
            setNewUserEmail('');
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

                {/* HEADER */}
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">Gestión de Publicación</h2>
                        <p className="text-sm text-gray-500 truncate max-w-md">"{book.titulo}"</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-200 p-2 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">

                    {/* COLUMNA IZQUIERDA: Configuración Básica y Usuarios */}
                    <div className="space-y-8">
                        {/* Visibilidad */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Visibilidad General</h3>
                            <div className="flex gap-2 mb-3">
                                <select value={visibilidad} onChange={e => setVisibilidad(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500">
                                    <option value="publico">🌍 Público (Cualquiera puede verlo)</option>
                                    <option value="privado">🔒 Privado (Con código o invitación)</option>
                                    <option value="oculto">👻 Oculto (Sólo yo)</option>
                                </select>
                                <button onClick={handleSaveVisibility} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
                            </div>
                        </div>

                        {/* Agregar Usuarios Manualmente */}
                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wider flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invitación Directa</h3>
                            <p className="text-xs text-blue-700 mb-3">Agrega el correo electrónico de los usuarios que tendrán acceso directo sin necesitar código.</p>
                            <form onSubmit={handleAddUserManually} className="flex gap-2 mb-4">
                                <input type="email" placeholder="correo@ejemplo.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="flex-1 border border-blue-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500" />
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Añadir</button>
                            </form>

                            {allowedUsers.length > 0 && (
                                <div className="space-y-2">
                                    {allowedUsers.map(email => (
                                        <div key={email} className="bg-white p-2 text-xs text-gray-600 rounded border border-blue-100 flex justify-between items-center">
                                            {email}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Códigos de Acceso */}
                    <div className="space-y-6">
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 h-full flex flex-col">
                            <h3 className="font-bold text-amber-900 mb-2 text-sm uppercase tracking-wider flex items-center gap-2"><Key className="w-4 h-4" /> Generador de Códigos</h3>
                            <p className="text-xs text-amber-700 mb-4">Crea códigos para que otros puedan desbloquear esta publicación.</p>

                            <form onSubmit={handleGenerateCode} className="space-y-3 bg-white p-4 rounded-xl shadow-sm mb-6 border border-amber-200">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código (Ej. MAYTO26)</label>
                                    <input type="text" required value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2 text-sm font-mono uppercase focus:border-amber-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Usos Máximos</label>
                                        <input type="number" min="1" required value={maxUses} onChange={e => setMaxUses(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-amber-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Caducidad (Opcional)</label>
                                        <input type="date" value={expiration} onChange={e => setExpiration(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-amber-500 outline-none" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-2 rounded-lg text-sm mt-2 transition-colors">Generar Código</button>
                            </form>

                            {/* LISTA DE CÓDIGOS ACTIVOS */}
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {codes.map(c => (
                                    <div key={c.code} className="bg-white p-3 rounded-xl border border-amber-200 flex gap-3 shadow-sm">
                                        <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            <QRCodeSVG value={c.code} size={50} />
                                            <span className="text-[8px] mt-1 text-gray-500 font-bold uppercase"><QrCode className="w-3 h-3 inline" /> Escanear</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-mono font-black text-amber-600 text-lg">{c.code}</h4>
                                                <button onClick={() => handleDeleteCode(c.code)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                <p>Usos: <strong className={c.used >= c.maxUses ? 'text-red-500' : 'text-gray-800'}>{c.used} / {c.maxUses}</strong></p>
                                                <p>Caduca: <strong>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Nunca'}</strong></p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {codes.length === 0 && <p className="text-xs text-center text-amber-600/50 italic py-4">No hay códigos activos para esta publicación.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}