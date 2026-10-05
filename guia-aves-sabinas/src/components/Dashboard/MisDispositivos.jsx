import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Smartphone, Key, Loader2, CheckCircle2, Clock, Bird } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function MisDispositivos() {
    const { user } = useOutletContext();
    const [pin, setPin] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [detecciones, setDetecciones] = useState([]);

    // Detecciones que el ESP32 envía al backend, en vivo
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, "detecciones_esp32"), where("uid", "==", user.uid));
        return onSnapshot(q, (snap) => {
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 20);
            setDetecciones(lista);
        }, (err) => console.error("Error leyendo detecciones:", err));
    }, [user?.uid]);

    // Función para generar un PIN aleatorio de 6 caracteres alfanuméricos
    const generatePin = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleGeneratePin = async () => {
        setLoading(true);
        try {
            // 1. Limpiar PINs anteriores del usuario para no llenar la base de datos
            const q = query(collection(db, "pines_vinculacion"), where("uid", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            querySnapshot.forEach((docSnap) => {
                deletePromises.push(deleteDoc(docSnap.ref));
            });
            await Promise.all(deletePromises);

            // 2. Generar y guardar nuevo PIN
            const newPin = generatePin();
            const expirationTime = new Date();
            expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Expira en 10 minutos

            await addDoc(collection(db, "pines_vinculacion"), {
                pin: newPin,
                uid: user.uid,
                nombre: user.displayName,
                createdAt: serverTimestamp(),
                expiresAt: expirationTime.getTime(),
                status: 'pending' // pending, linked
            });

            setPin(newPin);
            setTimeLeft(600); // 10 minutos en segundos (600s)
        } catch (error) {
            console.error("Error al generar PIN:", error);
            alert("Error al generar el código. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    // Temporizador para la expiración del PIN
    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        } else if (timeLeft === 0 && pin) {
            setPin(null); // Borrar el PIN de la UI cuando expira
        }
    }, [timeLeft, pin]);

    // Formatear segundos a MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-800">
            <div className="max-w-xl w-full">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Smartphone className="w-10 h-10 text-teal-600" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 mb-4 leading-tight">Mis Dispositivos</h1>
                    <p className="text-slate-500 font-medium">
                        Vincula un identificador de aves (ESP32) a tu cuenta para guardar automáticamente tus descubrimientos en tu perfil.
                    </p>
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-center relative overflow-hidden">
                    {!pin ? (
                        <div className="space-y-6 animate-in fade-in">
                            <Key className="w-16 h-16 mx-auto text-slate-300" />
                            <h2 className="text-2xl font-bold text-slate-800">Generar Código de Vinculación</h2>
                            <p className="text-sm text-slate-500">
                                Obtén un código temporal para ingresarlo en tu dispositivo ESP32.
                            </p>
                            <button
                                onClick={handleGeneratePin}
                                disabled={loading}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar Código'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95">
                            <CheckCircle2 className="w-16 h-16 mx-auto text-teal-500" />
                            <h2 className="text-xl font-bold text-slate-800">Tu código temporal es:</h2>
                            <div className="bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-teal-300">
                                <span className="text-5xl tracking-[0.3em] font-mono font-black text-teal-800">{pin}</span>
                            </div>
                            <p className="text-sm text-slate-600">
                                Ingresa este código en tu dispositivo para vincularlo.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-amber-600 font-bold bg-amber-50 py-2 px-4 rounded-xl inline-flex mx-auto">
                                <Clock className="w-4 h-4" />
                                <span>Expira en: {formatTime(timeLeft)}</span>
                            </div>
                            <button
                                onClick={handleGeneratePin}
                                className="block mx-auto mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 underline"
                            >
                                Generar otro código
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Bird className="w-5 h-5 text-teal-600" /> Últimas detecciones de tu dispositivo
                    </h2>
                    {detecciones.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-white rounded-2xl p-6 border border-slate-100 text-center">
                            Aún no hay detecciones. Vincula tu ESP32 y elige "Escuchar Ave".
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {detecciones.map(d => {
                                const top = d.aves?.[0];
                                return (
                                    <li key={d.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{top?.commonName || 'Ave'}</p>
                                            <p className="text-xs italic text-slate-500 truncate">{top?.scientificName}</p>
                                            <p className="text-xs text-slate-400 mt-1">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}</p>
                                        </div>
                                        <span className="shrink-0 bg-teal-50 text-teal-700 font-black text-sm px-3 py-1 rounded-full">{top?.confidence}%</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}