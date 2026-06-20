import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Clock, Speaker, Lock, Unlock, Bell } from 'lucide-react';
import { diccionarioAves } from './diccionarioSabinas';

export default function BirdSoundBox({ db, user }) {
    const [progreso, setProgreso] = useState({});
    const [alarma, setAlarma] = useState("07:00");

    // Escuchar progreso en tiempo real
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "colecciones_usuarios", user.uid), (doc) => {
            setProgreso(doc.data() || {});
        });
        return () => unsub();
    }, [user]);

    const guardarAlarma = async (nuevaHora) => {
        setAlarma(nuevaHora);
        await setDoc(doc(db, "ajustes_dispositivos", user.uid), {
            alarmaHora: nuevaHora,
            ultimoCambio: new Date().toISOString()
        }, { merge: true });
    };

    return (
        <div className="p-6 bg-slate-50 min-h-full pb-24">
            {/* SECCIÓN RELOJ */}
            <div className="bg-white rounded-3xl p-6 shadow-xl mb-8 border border-slate-100">
                <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="text-indigo-500" /> Alarma BirdSoundBox
                </h2>
                <div className="flex flex-col items-center">
                    <input
                        type="time"
                        value={alarma}
                        onChange={(e) => guardarAlarma(e.target.value)}
                        className="text-5xl font-black text-indigo-600 bg-slate-50 p-4 rounded-2xl border-2 border-indigo-100 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest">
                        Sonará un ave aleatoria de Sabinas
                    </p>
                </div>
            </div>

            {/* SECCIÓN CHAPITAS (MEDALLAS) */}
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Speaker className="w-4 h-4" /> Tus Chapitas Sincronizadas
            </h3>

            <div className="grid grid-cols-3 gap-4">
                {Object.entries(diccionarioAves).slice(0, 15).map(([cientifico, comun]) => {
                    const aveID = cientifico.replace(" ", "_");
                    const desbloqueado = progreso[aveID] || progreso[cientifico.replace(" ", "_")];

                    return (
                        <div key={aveID} className="flex flex-col items-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-inner ${desbloqueado
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600 scale-100'
                                    : 'border-slate-200 bg-slate-100 text-slate-300 grayscale'
                                }`}>
                                {desbloqueado ? <Unlock className="w-8 h-8" /> : <Lock className="w-8 h-8 opacity-20" />}
                            </div>
                            <span className={`text-[9px] font-bold mt-2 text-center leading-tight ${desbloqueado ? 'text-slate-700' : 'text-slate-400'}`}>
                                {comun}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}