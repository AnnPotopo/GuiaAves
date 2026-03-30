import React from 'react';
import { Award, Feather, Map, Crown, Star } from 'lucide-react';

export default function Achievements({ progreso }) {
    // Calcular estadísticas actuales
    const especiesDescubiertas = Object.keys(progreso).length;
    const totalAvistamientos = Object.values(progreso).reduce((total, data) => {
        return total + (typeof data === 'number' ? data : data.count || 0);
    }, 0);

    // Definir las reglas de los logros
    const logros = [
        {
            id: 'primer_vuelo',
            titulo: 'Primer Aleteo',
            descripcion: 'Identifica tu primera especie.',
            icono: <Feather className="w-8 h-8" />,
            desbloqueado: especiesDescubiertas >= 1,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            border: 'border-blue-200'
        },
        {
            id: 'explorador_10',
            titulo: 'Explorador Sabinense',
            descripcion: 'Registra 10 especies diferentes.',
            icono: <Map className="w-8 h-8" />,
            desbloqueado: especiesDescubiertas >= 10,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200'
        },
        {
            id: 'constante_50',
            titulo: 'Observador Frecuente',
            descripcion: 'Acumula 50 avistamientos en total.',
            icono: <Star className="w-8 h-8" />,
            desbloqueado: totalAvistamientos >= 50,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            border: 'border-purple-200'
        },
        {
            id: 'rey_sabinas',
            titulo: 'Rey del Río Sabinas',
            descripcion: 'Registra 50 especies diferentes.',
            icono: <Crown className="w-8 h-8" />,
            desbloqueado: especiesDescubiertas >= 50,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200'
        }
    ];

    return (
        <div className="animate-in fade-in duration-300 pb-20">

            {/* Resumen Estadístico */}
            <div className="mb-8 bg-gray-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                    <Award className="w-32 h-32" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight mb-4 relative z-10">Tus Estadísticas</h2>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Especies Únicas</p>
                        <p className="text-3xl font-black text-emerald-400">{especiesDescubiertas}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Avistamientos Totales</p>
                        <p className="text-3xl font-black text-blue-400">{totalAvistamientos}</p>
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-extrabold text-gray-800 tracking-tight mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Medallas Desbloqueables
            </h3>

            {/* Cuadrícula de Medallas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {logros.map(logro => (
                    <div
                        key={logro.id}
                        className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all duration-300 ${logro.desbloqueado
                                ? `${logro.bg} ${logro.border} shadow-sm`
                                : 'bg-gray-50 border-gray-200 grayscale opacity-60'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${logro.desbloqueado ? 'bg-white shadow-md' : 'bg-gray-200'
                            }`}>
                            <div className={logro.desbloqueado ? logro.color : 'text-gray-400'}>
                                {logro.icono}
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${logro.desbloqueado ? 'text-gray-800' : 'text-gray-500'}`}>
                                {logro.titulo}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                                {logro.descripcion}
                            </p>

                            <div className="mt-2">
                                {logro.desbloqueado ? (
                                    <span className="inline-block px-2 py-0.5 bg-white rounded text-[9px] font-bold text-gray-700 shadow-sm border border-gray-100">
                                        ✅ Desbloqueado
                                    </span>
                                ) : (
                                    <span className="inline-block px-2 py-0.5 bg-gray-200 rounded text-[9px] font-bold text-gray-500">
                                        🔒 Bloqueado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}