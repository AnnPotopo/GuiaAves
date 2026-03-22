import React from 'react';
import {
    ImageIcon, Mic, MapPin, Feather, Scale,
    Info, ShieldAlert, Utensils, Activity, ListTree
} from 'lucide-react';

// Componente auxiliar mejorado para las filas de detalles
// Ahora acepta 'isBlock' para textos largos (como Descripción) y oculta los vacíos
const BirdDetailItem = ({ Icon, label, value, iconColor, isBlock }) => {
    if (!value) return null; // Si no hay dato desde el Excel, no renderiza el campo

    return (
        <div className={`flex items-start gap-3 text-[13px] leading-relaxed ${isBlock ? 'flex-col gap-1.5' : ''}`}>
            {!isBlock ? (
                // Formato en línea (ej. Familia: Tinamidae)
                <>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor || '#3b82f6' }} />
                    <div>
                        <strong>{label}:</strong> <span className="opacity-90">{value}</span>
                    </div>
                </>
            ) : (
                // Formato en bloque para textos largos (ej. Descripción)
                <>
                    <div className="flex items-center gap-2 mt-2">
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || '#3b82f6' }} />
                        <strong className="uppercase tracking-wider text-[11px] opacity-70">{label}</strong>
                    </div>
                    <p className="opacity-90 text-justify">{value}</p>
                </>
            )}
        </div>
    );
};

export default function PageRenderer({ pageData }) {
    if (!pageData) return null;

    const config = pageData.config || {};

    // Extraemos las configuraciones de diseño
    const bgColor = config.backgroundColor || '#ffffff';
    const textColor = config.textColor || '#1f2937';
    const themeColor = config.themeColor || '#3b82f6';
    const imgOpacity = config.imageOpacity !== undefined ? config.imageOpacity : 1;

    // Estilo base para el contenedor del libro
    const bookContainerClass = "w-[850px] h-[550px] shadow-2xl flex rounded-sm overflow-hidden relative print:shadow-none print:w-[100vw] print:h-[100vh]";

    // -------------------------------------------------------------------------
    // 1. Diseño de Portada
    // -------------------------------------------------------------------------
    if (pageData.tipo === 'portada') {
        const isCentered = config.layout === 'center';

        return (
            <div className={bookContainerClass} style={{ backgroundColor: bgColor, color: textColor }}>
                <div className={`absolute inset-0 flex flex-col p-16 ${isCentered ? 'items-center justify-center text-center' : 'justify-end'}`}>
                    <h1 className="text-6xl font-bold mb-4 leading-tight">{config.titulo || 'Título del Libro'}</h1>
                    <p className="text-xl opacity-80">{config.subtitulo || 'Guía de Campo'}</p>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20" style={{ backgroundColor: themeColor }}></div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // 2. Diseño de Ficha de Ave (Con todos los campos de Excel integrados)
    // -------------------------------------------------------------------------
    if (pageData.tipo === 'ave') {
        return (
            <div className={bookContainerClass} style={{ backgroundColor: bgColor, color: textColor }}>
                {/* Lado Izquierdo: Imagen */}
                <div className="w-1/2 h-full relative overflow-hidden border-r border-gray-100" style={{ backgroundColor: bgColor }}>
                    {config.imageSrc ? (
                        <img
                            src={config.imageSrc}
                            alt="Ave"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ opacity: imgOpacity }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 p-8 text-center">
                            <ImageIcon className="w-16 h-16 mb-4" />
                            <p className="text-sm">Falta imagen para: {config.nombreComun}</p>
                        </div>
                    )}
                </div>

                {/* Lado Derecho: Datos */}
                <div className="w-1/2 h-full p-8 md:p-10 relative flex flex-col">
                    {/* Acento de esquina dinámico */}
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full print:border opacity-80" style={{ backgroundColor: themeColor }}></div>

                    {/* Cabecera: Nombres */}
                    <div className="relative z-10 mb-5 border-b pb-3" style={{ borderColor: `${themeColor}33` }}>
                        <h2 className="text-3xl font-bold mb-1" style={{ color: textColor }}>{config.nombreComun || 'Nombre Común'}</h2>
                        <h3 className="text-md italic opacity-70 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                    </div>

                    {/* Contenedor escroleable para los datos del Excel */}
                    <div className="space-y-3 flex-1 overflow-y-auto pr-3 custom-scrollbar">

                        {/* Datos de Taxonomía y Estado (En línea) */}
                        <div className="grid grid-cols-1 gap-2 mb-2">
                            <BirdDetailItem Icon={ListTree} label="Orden" value={config.orden} iconColor={themeColor} />
                            <BirdDetailItem Icon={Feather} label="Familia" value={config.familia} iconColor={themeColor} />
                            <BirdDetailItem Icon={Scale} label="Longitud" value={config.longitud} iconColor={themeColor} />
                        </div>

                        {/* Conservación (En línea) */}
                        <div className="bg-black/5 p-3 rounded-md space-y-2 my-2">
                            <BirdDetailItem Icon={ShieldAlert} label="NOM 059" value={config.nom059} iconColor={themeColor} />
                            <BirdDetailItem Icon={ShieldAlert} label="IUCN" value={config.iucn} iconColor={themeColor} />
                        </div>

                        {/* Comportamiento y Biología (En línea) */}
                        <BirdDetailItem Icon={MapPin} label="Hábitat" value={config.habitat} iconColor={themeColor} />
                        <BirdDetailItem Icon={Utensils} label="Alimentación" value={config.alimentacion} iconColor={themeColor} />
                        <BirdDetailItem Icon={Mic} label="Canto/Llamado" value={config.canto} iconColor={themeColor} />
                        <BirdDetailItem Icon={Activity} label="Dimorfismo" value={config.dimorfismo} iconColor={themeColor} />

                        {/* Textos largos (En bloque) */}
                        <BirdDetailItem Icon={Info} label="Descripción" value={config.descripcion} iconColor={themeColor} isBlock={true} />
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // 3. Página de Foto Completa
    // -------------------------------------------------------------------------
    if (pageData.tipo === 'foto') {
        return (
            <div className={bookContainerClass} style={{ backgroundColor: bgColor }}>
                {config.imageSrc ? (
                    <img
                        src={config.imageSrc}
                        alt="Foto completa"
                        className="w-full h-full object-cover"
                        style={{ opacity: imgOpacity }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                        <ImageIcon className="w-16 h-16" />
                    </div>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // 4. Página en Blanco
    // -------------------------------------------------------------------------
    if (pageData.tipo === 'blanco') {
        return (
            <div className={bookContainerClass} style={{ backgroundColor: bgColor }}></div>
        );
    }

    return null;
}