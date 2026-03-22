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

const getStatusColor = (type, text, fallbackColor) => {
    if (!text) return fallbackColor;
    const s = text.toLowerCase();

    if (type === 'nom059') {
        if (s.includes('extinta') || s === 'e') return '#1f2937';
        if (s.includes('peligro') || s === 'p') return '#ef4444';
        if (s.includes('amenazada') || s === 'a') return '#f59e0b';
        if (s.includes('protección') || s.includes('proteccion') || s === 'pr') return '#3b82f6';
    }

    if (type === 'iucn') {
        if (s.includes('extinta') || s.includes('ex') || s.includes('ew')) return '#1f2937';
        if (s.includes('crítico') || s.includes('critico') || s.includes('cr')) return '#dc2626';
        if (s.includes('peligro') || s.includes('en')) return '#ea580c';
        if (s.includes('vulnerable') || s.includes('vu')) return '#eab308';
        if (s.includes('casi') || s.includes('nt')) return '#84cc16';
        if (s.includes('menor') || s.includes('lc')) return '#22c55e';
    }
    return fallbackColor;
};

const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// HERRAMIENTAS DE PRE-PRENSA (INDESIGN STYLE)
const PrintGuides = ({ showBleed, showMargins }) => (
    <>
        {showBleed && <div className="absolute inset-0 border-[3mm] border-red-500/50 border-dashed z-50 pointer-events-none" title="Sangría (Bleed) de 3mm"></div>}
        {showMargins && <div className="absolute inset-0 m-[15mm] border border-blue-500/50 border-dashed z-50 pointer-events-none" title="Margen de Seguridad (1.5cm)"></div>}
    </>
);

const CropMarks = () => (
    <>
        <div className="absolute -top-[10mm] left-[0] w-[1px] h-[7mm] bg-black"></div>
        <div className="absolute -top-[10mm] right-[0] w-[1px] h-[7mm] bg-black"></div>
        <div className="absolute -bottom-[10mm] left-[0] w-[1px] h-[7mm] bg-black"></div>
        <div className="absolute -bottom-[10mm] right-[0] w-[1px] h-[7mm] bg-black"></div>
        <div className="absolute top-[0] -left-[10mm] w-[7mm] h-[1px] bg-black"></div>
        <div className="absolute bottom-[0] -left-[10mm] w-[7mm] h-[1px] bg-black"></div>
        <div className="absolute top-[0] -right-[10mm] w-[7mm] h-[1px] bg-black"></div>
        <div className="absolute bottom-[0] -right-[10mm] w-[7mm] h-[1px] bg-black"></div>
    </>
);

export default function PageRenderer({ pageData, bookSize = 'trade', printSettings = {}, isPrintMode = false, pageIndex = 0, bookTitle = "Guía" }) {
    if (!pageData) return null;

    const config = pageData.config || {};
    const bgColor = config.backgroundColor || '#ffffff';
    const textColor = config.textColor || '#1f2937';
    const themeColor = config.themeColor || '#3b82f6';
    const imgOpacity = config.imageOpacity !== undefined ? config.imageOpacity : 1;
    const showCircle = config.showCornerCircle !== false;
    const titlePosition = config.titlePosition || 'data';
    const titleBgColor = config.titleBgColor || '#000000';
    const titleBgOpacity = config.titleBgOpacity !== undefined ? config.titleBgOpacity : 0.6;

    const { showBleed = false, showMargins = false, splitPages = false, cropMarks = false, slugInfo = false } = printSettings;

    const sizeStyles = {
        trade: { width: splitPages ? '152.4mm' : '304.8mm', height: '228.6mm' },
        letter: { width: splitPages ? '215.9mm' : '431.8mm', height: '279.4mm' },
        standard: { width: splitPages ? '425px' : '850px', height: '550px' }
    };

    const currentDimensions = sizeStyles[bookSize] || sizeStyles.trade;

    // En modo impresión quitamos sombras e integramos break-inside-avoid para evitar cortes a la mitad
    const bookContainerClass = `relative bg-white overflow-hidden ${isPrintMode ? 'break-inside-avoid' : 'shadow-2xl rounded-sm flex'}`;

    const isBlockField = (field, defaultBlock = false) => {
        return config[`block_${field}`] !== undefined ? config[`block_${field}`] : defaultBlock;
    };

    // Wrapper que inyecta las marcas de corte e información fuera del documento
    const RenderWrapper = ({ children }) => {
        if (!isPrintMode) return children; // En pantalla se renderiza normal
        return (
            <div className="relative flex items-center justify-center bg-white" style={{ padding: '20mm' }}>
                <div className="relative shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                    {children}
                    {cropMarks && <CropMarks />}
                    {slugInfo && (
                        <div className="absolute -bottom-[8mm] left-[0] w-full flex justify-between text-[8px] font-mono text-gray-500">
                            <span>{bookTitle} | {new Date().toLocaleDateString()}</span>
                            <span>CMYK / FOGRA39 target</span>
                            <span>Página {pageIndex + 1} | {config.nombreComun || pageData.tipo}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 1. Portada
    if (pageData.tipo === 'portada' || pageData.tipo === 'foto' || pageData.tipo === 'blanco') {
        const isCentered = config.layout === 'center';
        return (
            <RenderWrapper>
                <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: bgColor, color: textColor }}>
                    {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} />}

                    {pageData.tipo === 'portada' && (
                        <>
                            <div className={`absolute inset-0 flex flex-col p-[15mm] z-10 ${isCentered ? 'items-center justify-center text-center' : 'justify-end'}`}>
                                <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">{config.titulo || 'Título del Libro'}</h1>
                                <p className="text-xl opacity-80">{config.subtitulo || 'Guía de Campo'}</p>
                            </div>
                            {showCircle && <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20 z-0" style={{ backgroundColor: themeColor }}></div>}
                        </>
                    )}

                    {pageData.tipo === 'foto' && (
                        config.imageSrc ? (
                            <img src={config.imageSrc} alt="Foto" className="w-full h-full object-cover" style={{ opacity: imgOpacity }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-16 h-16" /></div>
                        )
                    )}
                </div>
            </RenderWrapper>
        );
    }

    // 2. Ficha de Ave
    if (pageData.tipo === 'ave') {
        const isImageRight = config.imagePosition === 'right';
        const nomColor = getStatusColor('nom059', config.nom059, themeColor);
        const iucnColor = getStatusColor('iucn', config.iucn, themeColor);

        const ImageSide = () => (
            <div className={`relative overflow-hidden ${splitPages || isPrintMode ? 'w-full h-full' : 'w-1/2 h-full'}`} style={{ backgroundColor: bgColor }}>
                {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} />}
                {titlePosition === 'image' && (
                    <div
                        className="absolute top-0 left-0 w-full p-6 z-20 flex flex-col justify-start"
                        style={{ backgroundColor: hexToRgba(titleBgColor, titleBgOpacity) }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white">{config.nombreComun || 'Nombre Común'}</h2>
                        <h3 className="text-sm md:text-md italic text-gray-200 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                    </div>
                )}
                {config.imageSrc ? (
                    <img src={config.imageSrc} alt="Ave" className="absolute inset-0 w-full h-full object-cover z-0" style={{ opacity: imgOpacity }} />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 p-8 text-center z-0">
                        <ImageIcon className="w-16 h-16 mb-4" />
                        <p className="text-sm">Falta imagen</p>
                    </div>
                )}
            </div>
        );

        const DataSide = () => (
            <div className={`p-8 md:p-10 relative flex flex-col bg-white ${splitPages || isPrintMode ? 'w-full h-full' : 'w-1/2 h-full'}`} style={{ backgroundColor: bgColor, color: textColor }}>
                {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} />}
                {showCircle && <div className={`absolute top-0 ${isImageRight && !splitPages && !isPrintMode ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'} w-24 h-24 print:border opacity-80 z-10`} style={{ backgroundColor: themeColor }}></div>}

                {titlePosition !== 'image' && (
                    <div className="relative z-20 mb-4 border-b pb-2" style={{ borderColor: `${themeColor}33` }}>
                        <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: textColor }}>{config.nombreComun || 'Nombre Común'}</h2>
                        <h3 className="text-sm md:text-md italic opacity-70 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                    </div>
                )}

                <div className={`space-y-2.5 flex-1 overflow-y-auto custom-scrollbar relative z-20 ${titlePosition === 'image' ? 'pt-4' : ''}`}>
                    <div className="flex flex-col gap-1.5 mb-2">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <BirdDetailItem Icon={ListTree} label="Orden" value={config.orden} iconColor={themeColor} isBlock={isBlockField('orden')} />
                            </div>
                            <div className="flex-1">
                                <BirdDetailItem Icon={Feather} label="Familia" value={config.familia} iconColor={themeColor} isBlock={isBlockField('familia')} />
                            </div>
                        </div>
                        <BirdDetailItem Icon={Scale} label="Longitud" value={config.longitud} iconColor={themeColor} isBlock={isBlockField('longitud')} />
                    </div>

                    <div className="bg-black/5 p-2 rounded-md space-y-1.5 my-2">
                        <BirdDetailItem Icon={ShieldAlert} label="NOM 059" value={config.nom059} iconColor={nomColor} isBlock={isBlockField('nom059')} />
                        <BirdDetailItem Icon={ShieldAlert} label="IUCN" value={config.iucn} iconColor={iucnColor} isBlock={isBlockField('iucn')} />
                    </div>

                    <BirdDetailItem Icon={MapPin} label="Hábitat" value={config.habitat} iconColor={themeColor} isBlock={isBlockField('habitat')} />
                    <BirdDetailItem Icon={Utensils} label="Alimentación" value={config.alimentacion} iconColor={themeColor} isBlock={isBlockField('alimentacion')} />
                    <BirdDetailItem Icon={Mic} label="Canto/Llamado" value={config.canto} iconColor={themeColor} isBlock={isBlockField('canto')} />
                    <BirdDetailItem Icon={Activity} label="Dimorfismo" value={config.dimorfismo} iconColor={themeColor} isBlock={isBlockField('dimorfismo')} />

                    <div className="pt-1">
                        <BirdDetailItem Icon={Info} label="Descripción" value={config.descripcion} iconColor={themeColor} isBlock={isBlockField('descripcion', true)} />
                    </div>
                </div>
            </div>
        );

        if (splitPages || isPrintMode) {
            return (
                <>
                    <RenderWrapper><div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <DataSide /> : <ImageSide />}</div></RenderWrapper>
                    <RenderWrapper><div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <ImageSide /> : <DataSide />}</div></RenderWrapper>
                </>
            );
        }

        return (
            <div className={`${bookContainerClass} ${isImageRight ? 'flex-row-reverse' : 'flex-row'}`} style={currentDimensions}>
                <ImageSide />
                <DataSide />
            </div>
        );
    }

    return null;
}