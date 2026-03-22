import React from 'react';
import {
    ImageIcon, Mic, MapPin, Feather, Scale,
    Info, ShieldAlert, Utensils, Activity, ListTree
} from 'lucide-react';

const BirdDetailItem = ({ Icon, label, value, iconColor, isBlock }) => {
    if (!value) return null;

    return (
        <div className={`flex items-start gap-3 text-[13px] leading-relaxed ${isBlock ? 'flex-col gap-1.5' : ''}`}>
            {!isBlock ? (
                <>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor || '#3b82f6' }} />
                    <div>
                        <strong>{label}:</strong> <span className="opacity-90 ml-1">{value}</span>
                    </div>
                </>
            ) : (
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

// MOTOR DE COLORES DINÁMICOS PARA CONSERVACIÓN
const getStatusColor = (type, text, fallbackColor) => {
    if (!text) return fallbackColor;
    const s = text.toLowerCase();

    if (type === 'nom059') {
        if (s.includes('extinta') || s === 'e') return '#1f2937'; // Gris muy oscuro / Negro
        if (s.includes('peligro') || s === 'p') return '#ef4444'; // Rojo
        if (s.includes('amenazada') || s === 'a') return '#f59e0b'; // Naranja/Ambar
        if (s.includes('protección') || s.includes('proteccion') || s === 'pr') return '#3b82f6'; // Azul
    }

    if (type === 'iucn') {
        if (s.includes('extinta') || s.includes('ex') || s.includes('ew')) return '#1f2937'; // Negro
        if (s.includes('crítico') || s.includes('critico') || s.includes('cr')) return '#dc2626'; // Rojo oscuro
        if (s.includes('peligro') || s.includes('en')) return '#ea580c'; // Naranja
        if (s.includes('vulnerable') || s.includes('vu')) return '#eab308'; // Amarillo
        if (s.includes('casi') || s.includes('nt')) return '#84cc16'; // Verde lima
        if (s.includes('menor') || s.includes('lc')) return '#22c55e'; // Verde brillante
    }

    return fallbackColor;
};

export default function PageRenderer({ pageData, bookSize = 'standard' }) {
    if (!pageData) return null;

    const config = pageData.config || {};

    const bgColor = config.backgroundColor || '#ffffff';
    const textColor = config.textColor || '#1f2937';
    const themeColor = config.themeColor || '#3b82f6';
    const imgOpacity = config.imageOpacity !== undefined ? config.imageOpacity : 1;
    const showCircle = config.showCornerCircle !== false;

    const sizeStyles = {
        standard: { width: '850px', height: '550px' },
        trade: { width: '900px', height: '675px' },
        letter: { width: '1020px', height: '660px' },
        a4: { width: '990px', height: '700px' },
        square: { width: '1000px', height: '500px' }
    };

    const currentDimensions = sizeStyles[bookSize] || sizeStyles.standard;
    const bookContainerClass = "shadow-2xl flex rounded-sm overflow-hidden relative print:shadow-none print:w-[100vw] print:h-[100vh]";

    // Función para saber si un campo está en formato bloque o sangría
    const isBlockField = (field, defaultBlock = false) => {
        return config[`block_${field}`] !== undefined ? config[`block_${field}`] : defaultBlock;
    };

    // 1. Portada
    if (pageData.tipo === 'portada') {
        const isCentered = config.layout === 'center';
        return (
            <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: bgColor, color: textColor }}>
                <div className={`absolute inset-0 flex flex-col p-16 ${isCentered ? 'items-center justify-center text-center' : 'justify-end'}`}>
                    <h1 className="text-6xl font-bold mb-4 leading-tight">{config.titulo || 'Título del Libro'}</h1>
                    <p className="text-xl opacity-80">{config.subtitulo || 'Guía de Campo'}</p>
                </div>
                {showCircle && <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20" style={{ backgroundColor: themeColor }}></div>}
            </div>
        );
    }

    // 2. Ficha de Ave
    if (pageData.tipo === 'ave') {
        const isImageRight = config.imagePosition === 'right';
        const nomColor = getStatusColor('nom059', config.nom059, themeColor);
        const iucnColor = getStatusColor('iucn', config.iucn, themeColor);

        return (
            <div className={`${bookContainerClass} ${isImageRight ? 'flex-row-reverse' : 'flex-row'}`} style={{ ...currentDimensions, backgroundColor: bgColor, color: textColor }}>
                <div className={`w-1/2 h-full relative overflow-hidden ${isImageRight ? 'border-l' : 'border-r'} border-gray-100`} style={{ backgroundColor: bgColor }}>
                    {config.imageSrc ? (
                        <img src={config.imageSrc} alt="Ave" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: imgOpacity }} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 p-8 text-center">
                            <ImageIcon className="w-16 h-16 mb-4" />
                            <p className="text-sm">Falta imagen para: {config.nombreComun}</p>
                        </div>
                    )}
                </div>

                <div className="w-1/2 h-full p-8 md:p-10 relative flex flex-col">
                    {showCircle && <div className={`absolute top-0 ${isImageRight ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'} w-24 h-24 print:border opacity-80`} style={{ backgroundColor: themeColor }}></div>}

                    <div className="relative z-10 mb-5 border-b pb-3" style={{ borderColor: `${themeColor}33` }}>
                        <h2 className="text-3xl font-bold mb-1" style={{ color: textColor }}>{config.nombreComun || 'Nombre Común'}</h2>
                        <h3 className="text-md italic opacity-70 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                    </div>

                    <div className={`space-y-3 flex-1 overflow-y-auto custom-scrollbar ${isImageRight ? 'pl-2' : 'pr-3'}`}>
                        <div className="grid grid-cols-1 gap-2 mb-2">
                            <BirdDetailItem Icon={ListTree} label="Orden" value={config.orden} iconColor={themeColor} isBlock={isBlockField('orden')} />
                            <BirdDetailItem Icon={Feather} label="Familia" value={config.familia} iconColor={themeColor} isBlock={isBlockField('familia')} />
                            <BirdDetailItem Icon={Scale} label="Longitud" value={config.longitud} iconColor={themeColor} isBlock={isBlockField('longitud')} />
                        </div>

                        <div className="bg-black/5 p-3 rounded-md space-y-2 my-2">
                            <BirdDetailItem Icon={ShieldAlert} label="NOM 059" value={config.nom059} iconColor={nomColor} isBlock={isBlockField('nom059')} />
                            <BirdDetailItem Icon={ShieldAlert} label="IUCN" value={config.iucn} iconColor={iucnColor} isBlock={isBlockField('iucn')} />
                        </div>

                        <BirdDetailItem Icon={MapPin} label="Hábitat" value={config.habitat} iconColor={themeColor} isBlock={isBlockField('habitat')} />
                        <BirdDetailItem Icon={Utensils} label="Alimentación" value={config.alimentacion} iconColor={themeColor} isBlock={isBlockField('alimentacion')} />
                        <BirdDetailItem Icon={Mic} label="Canto/Llamado" value={config.canto} iconColor={themeColor} isBlock={isBlockField('canto')} />
                        <BirdDetailItem Icon={Activity} label="Dimorfismo" value={config.dimorfismo} iconColor={themeColor} isBlock={isBlockField('dimorfismo')} />

                        {/* Por defecto, la descripción siempre será bloque a menos que el usuario lo cambie */}
                        <BirdDetailItem Icon={Info} label="Descripción" value={config.descripcion} iconColor={themeColor} isBlock={isBlockField('descripcion', true)} />
                    </div>
                </div>
            </div>
        );
    }

    // 3. Foto
    if (pageData.tipo === 'foto') {
        return (
            <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: bgColor }}>
                {config.imageSrc ? (
                    <img src={config.imageSrc} alt="Foto completa" className="w-full h-full object-cover" style={{ opacity: imgOpacity }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-16 h-16" /></div>
                )}
            </div>
        );
    }

    // 4. Blanco
    if (pageData.tipo === 'blanco') {
        return <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: bgColor }}></div>;
    }

    return null;
}