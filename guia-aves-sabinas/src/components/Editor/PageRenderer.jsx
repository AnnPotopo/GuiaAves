import React from 'react';
import {
    ImageIcon, Mic, MapPin, Feather, Scale,
    Info, ShieldAlert, Utensils, Activity, ListTree
} from 'lucide-react';

const BirdDetailItem = ({ Icon, label, value, iconColor, isBlock, lineHeight }) => {
    if (!value) return null;

    return (
        <div className={`flex items-start gap-3 ${isBlock ? 'flex-col gap-1.5' : ''}`} style={{ fontSize: '0.95em', lineHeight: lineHeight || '1.625' }}>
            {!isBlock ? (
                <>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor || '#3b82f6' }} />
                    <div>
                        <strong>{label}:</strong> <span className="opacity-90 ml-1 whitespace-pre-wrap break-words">{value}</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 mt-2">
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || '#3b82f6' }} />
                        <strong className="uppercase tracking-wider opacity-70" style={{ fontSize: '0.85em' }}>{label}</strong>
                    </div>
                    <p className="opacity-90 text-justify w-full whitespace-pre-wrap break-words">{value}</p>
                </>
            )}
        </div>
    );
};

const getStatusColor = (type, text) => {
    if (!text || text.trim() === '' || text.toLowerCase().includes('no listada') || text.toLowerCase().includes('no evaluada') || text.toLowerCase().includes('datos insuficientes')) return '#9ca3af';

    const s = text.toLowerCase();

    if (type === 'nom059') {
        if (s.includes('(e)') || s.includes('extinta')) return '#7f1d1d';
        if (s.includes('(p)') || s.includes('peligro')) return '#dc2626';
        if (s.includes('(a)') || s.includes('amenazada')) return '#ea580c';
        if (s.includes('(pr)') || s.includes('protección') || s.includes('proteccion')) return '#eab308';
    }
    if (type === 'iucn') {
        if (s.includes('(ex)') || s.includes('(ew)') || s.includes('extinta')) return '#7f1d1d';
        if (s.includes('(cr)') || s.includes('crítico') || s.includes('critico')) return '#dc2626';
        if (s.includes('(en)') || s.includes('peligro')) return '#ea580c';
        if (s.includes('(vu)') || s.includes('vulnerable')) return '#eab308';
        if (s.includes('(nt)') || s.includes('casi amenazada')) return '#84cc16';
        if (s.includes('(lc)') || s.includes('preocupación menor')) return '#22c55e';
    }
    return '#9ca3af';
};

const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PrintGuides = ({ showBleed, showMargins, marginSize }) => (
    <>
        {showBleed && <div className="absolute inset-0 border-[3mm] border-red-500/50 border-dashed z-50 pointer-events-none"></div>}
        {showMargins && <div className="absolute inset-0 border border-blue-500/50 border-dashed z-50 pointer-events-none" style={{ margin: marginSize }}></div>}
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

const PageNumberDisplay = ({ num, show, tipo, position = 'default' }) => {
    if (!show || !num || tipo === 'portada') return null;
    let posClass = 'bottom-6 ';

    // MODIFICADO: Sistema de posicionamiento de números actualizado
    if (position === 'left') posClass += 'left-8';
    else if (position === 'center') posClass += 'left-1/2 -translate-x-1/2';
    else if (position === 'right') posClass += 'right-8';
    else if (position === 'inner') posClass += (num % 2 !== 0 ? 'left-8' : 'right-8'); // Alternado Interior (Lomo)
    else posClass += (num % 2 !== 0 ? 'right-8' : 'left-8'); // Alternado Exterior (default)

    return <div className={`absolute ${posClass} z-50 text-[10px] font-bold opacity-60`} style={{ fontFamily: 'monospace' }}>{num}</div>;
};

const GalleryRenderer = ({ config, extraImages }) => {
    const imgOpacity = config.imageOpacity !== undefined ? config.imageOpacity : 1;

    const allImgsData = [
        {
            src: config.imageSrc,
            copy: config.showCopyright ? config.copyrightText : null,
            scale: config.imageScale || 1,
            offsetX: config.imageOffsetX || 0,
            offsetY: config.imageOffsetY || 0,
            fit: config.imageFit || 'cover',
            opacity: imgOpacity
        },
        ...extraImages.map((item, i) => {
            const isObj = typeof item === 'object' && item !== null;
            return {
                src: isObj ? item.url : item,
                copy: config.showCopyright ? (config.extraCopyrights?.[i]) : null,
                scale: isObj ? (item.scale || 1) : 1,
                offsetX: isObj ? (item.offsetX || 0) : 0,
                offsetY: isObj ? (item.offsetY || 0) : 0,
                fit: isObj && item.fit ? item.fit : 'cover',
                opacity: imgOpacity
            };
        })
    ].filter(img => img.src);

    if (allImgsData.length === 0) {
        return <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 text-center z-0"><ImageIcon className="w-16 h-16 mb-4" /><p className="text-sm">Falta imagen</p></div>;
    }

    const GalleryImage = ({ data, className }) => (
        <div className={`relative overflow-hidden ${className}`}>
            <img src={data.src} className="w-full h-full" style={{
                objectFit: data.fit,
                opacity: data.opacity,
                transform: `scale(${data.scale}) translate(${data.offsetX}%, ${data.offsetY}%)`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out'
            }} />
            {data.copy && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white/90 text-[7px] md:text-[9px] px-2 py-1 rounded-sm z-40 shadow-lg pointer-events-none max-w-[90%] truncate">
                    {data.copy}
                </div>
            )}
        </div>
    );

    const layout = config.galleryLayout || 'single';

    return (
        <div className="absolute inset-0 z-0 bg-white">
            {layout === 'single' && <GalleryImage data={allImgsData[0]} className="w-full h-full" />}
            {layout === 'grid2-v' && (
                <div className="flex flex-col w-full h-full">
                    <GalleryImage data={allImgsData[0]} className="w-full h-1/2 border-b-2 border-white" />
                    {allImgsData[1] && <GalleryImage data={allImgsData[1]} className="w-full h-1/2" />}
                </div>
            )}
            {layout === 'grid2-h' && (
                <div className="flex flex-row w-full h-full">
                    <GalleryImage data={allImgsData[0]} className="w-1/2 h-full border-r-2 border-white" />
                    {allImgsData[1] && <GalleryImage data={allImgsData[1]} className="w-1/2 h-full" />}
                </div>
            )}
            {layout === 'grid3' && (
                <div className="flex flex-col w-full h-full">
                    <GalleryImage data={allImgsData[0]} className="w-full h-1/2 border-b-2 border-white" />
                    <div className="flex w-full h-1/2">
                        {allImgsData[1] && <GalleryImage data={allImgsData[1]} className="w-1/2 h-full border-r-2 border-white" />}
                        {allImgsData[2] && <GalleryImage data={allImgsData[2]} className="w-1/2 h-full" />}
                    </div>
                </div>
            )}
            {layout === 'grid4' && (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1 bg-white">
                    {allImgsData.slice(0, 4).map((data, i) => <GalleryImage key={i} data={data} className="w-full h-full" />)}
                </div>
            )}
            {layout === 'mosaic' && (
                <div className="relative w-full h-full bg-gray-900">
                    {allImgsData[0] && <GalleryImage data={allImgsData[0]} className="absolute top-0 left-0 w-full h-[60%] opacity-80" />}
                    {allImgsData[1] && <GalleryImage data={allImgsData[1]} className="absolute bottom-[5%] left-[5%] w-[45%] h-[40%] border-4 border-white shadow-xl rotate-[-2deg]" />}
                    {allImgsData[2] && <GalleryImage data={allImgsData[2]} className="absolute bottom-[10%] right-[5%] w-[40%] h-[35%] border-4 border-white shadow-xl rotate-[3deg]" />}
                </div>
            )}
        </div>
    );
};

export default function PageRenderer({ pageData, bookSize = 'trade', printSettings = {}, isPrintMode = false, pageIndex = 0, bookTitle = "Guía", forceHalf = null, pageNum = null, showPageNumbers = true, pageNumberPosition = 'default' }) {
    if (!pageData) return null;

    const sizeStyles = {
        trade: { width: printSettings.splitPages || forceHalf ? '152.4mm' : '304.8mm', height: '228.6mm' },
        letter: { width: printSettings.splitPages || forceHalf ? '215.9mm' : '431.8mm', height: '279.4mm' },
        standard: { width: printSettings.splitPages || forceHalf ? '425px' : '850px', height: '550px' }
    };

    const currentDimensions = sizeStyles[bookSize] || sizeStyles.trade;
    const bookContainerClass = `relative bg-white overflow-hidden ${isPrintMode ? 'break-inside-avoid shadow-none' : 'shadow-2xl rounded-sm flex'}`;

    if (pageData.isBlankPad) {
        return (
            <div className="break-after-page flex items-center justify-center w-[100vw] min-h-[100vh] bg-white">
                <div className="relative" style={{ padding: '20mm' }}>
                    <div className="relative shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                        <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: '#ffffff' }}></div>
                        {printSettings.cropMarks && <CropMarks />}
                        {printSettings.slugInfo && <div className="absolute -bottom-[8mm] left-[0] w-full flex justify-between text-[8px] font-mono text-gray-500"><span>{bookTitle}</span><span>Pág. {pageNum} (En Blanco)</span></div>}
                    </div>
                </div>
            </div>
        );
    }

    const config = pageData.config || {};
    const bgColor = config.backgroundColor || '#ffffff';
    const textColor = config.textColor || '#1f2937';
    const themeColor = config.themeColor || '#3b82f6';
    const showCircle = config.showCornerCircle !== false;
    const hideTitle = config.hideTitle === true;
    const titlePosition = config.titlePosition || 'data';
    const titleBgColor = config.titleBgColor || '#000000';
    const titleBgOpacity = config.titleBgOpacity !== undefined ? config.titleBgOpacity : 0.6;

    const fontFamily = config.fontFamily || 'system-ui, sans-serif';
    const baseFontSize = config.fontSize || '11pt';
    const marginSize = config.marginSize || '15mm';
    const lineHeight = config.lineHeight || '1.625';

    const extraImages = config.extraImages || [];

    const { showBleed = false, showMargins = false, splitPages = false, cropMarks = false, slugInfo = false } = printSettings;

    const isBlockField = (field, defaultBlock = false) => {
        return config[`block_${field}`] !== undefined ? config[`block_${field}`] : defaultBlock;
    };

    const PrintPageWrapper = ({ children, customPageNum }) => {
        if (!isPrintMode) return children;
        return (
            <div className="break-after-page flex items-center justify-center w-[100vw] min-h-[100vh] bg-white">
                <div className="relative" style={{ padding: '20mm' }}>
                    <div className="relative shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                        {children}
                        {cropMarks && <CropMarks />}
                        {slugInfo && (
                            <div className="absolute -bottom-[8mm] left-[0] w-full flex justify-between text-[8px] font-mono text-gray-500">
                                <span>{bookTitle}</span><span>Pág. {customPageNum || pageNum || (pageIndex + 1)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (pageData.tipo === 'portada' || pageData.tipo === 'foto' || pageData.tipo === 'blanco') {
        const isCentered = config.layout === 'center';
        return (
            <PrintPageWrapper customPageNum={pageNum}>
                <div className={bookContainerClass} style={{ ...currentDimensions, backgroundColor: bgColor, color: textColor, fontFamily: fontFamily }}>
                    {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} marginSize={marginSize} />}
                    <PageNumberDisplay num={pageNum} show={showPageNumbers} position={pageNumberPosition} tipo={pageData.tipo} />

                    {pageData.tipo === 'portada' && (
                        <>
                            <div className={`absolute inset-0 flex flex-col z-10 ${isCentered ? 'items-center justify-center text-center' : 'justify-end'}`} style={{ padding: marginSize }}>
                                <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">{config.titulo || 'Título del Libro'}</h1>
                                <p className="text-xl opacity-80">{config.subtitulo || 'Guía de Campo'}</p>
                            </div>
                            {showCircle && <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20 z-0" style={{ backgroundColor: themeColor }}></div>}
                        </>
                    )}

                    {pageData.tipo === 'foto' && (
                        <div className="absolute inset-0 flex flex-col z-10 w-full h-full">
                            {config.titulo ? (
                                <>
                                    <div className="w-full z-20 shrink-0" style={{ padding: `${marginSize} ${marginSize} 0 ${marginSize}` }}>
                                        <div className="border-b pb-2 mb-2" style={{ borderColor: `${themeColor}33` }}>
                                            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: config.textColor || '#1f2937' }}>{config.titulo}</h2>
                                        </div>
                                    </div>
                                    <div className="relative flex-1 w-full z-0 pb-4" style={{ padding: `0 ${marginSize} ${marginSize} ${marginSize}` }}>
                                        <GalleryRenderer config={config} extraImages={extraImages} />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full relative z-0">
                                    <GalleryRenderer config={config} extraImages={extraImages} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PrintPageWrapper>
        );
    }

    if (pageData.tipo === 'ave') {
        const isImageRight = config.imagePosition === 'right';
        const nomColor = getStatusColor('nom059', config.nom059);
        const iucnColor = getStatusColor('iucn', config.iucn);

        const ImageSide = ({ pNum }) => {
            return (
                <div className={`relative overflow-hidden ${splitPages || forceHalf ? 'w-full h-full' : 'w-1/2 h-full'}`} style={{ backgroundColor: bgColor, fontFamily: fontFamily }}>
                    {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} marginSize={marginSize} />}
                    <PageNumberDisplay num={pNum} show={showPageNumbers} position={pageNumberPosition} tipo="ave" />

                    {config.showPlaceholderBox && (
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-10 h-40 bg-black/60 backdrop-blur-md border-r border-y border-white/20 flex items-center justify-center z-30 rounded-r-md shadow-lg">
                            <span className="text-white text-[10px] font-bold tracking-[0.2em] -rotate-90 whitespace-nowrap opacity-80">PLACEHOLDER</span>
                        </div>
                    )}

                    {!hideTitle && titlePosition === 'image' && (
                        <div className="absolute top-0 left-0 w-full z-20 flex flex-col justify-start" style={{ backgroundColor: hexToRgba(titleBgColor, titleBgOpacity), padding: marginSize }}>
                            <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white">{config.nombreComun || 'Nombre Común'}</h2>
                            <h3 className="text-sm md:text-md italic text-gray-200 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                        </div>
                    )}

                    <div className="absolute inset-0 z-0">
                        <GalleryRenderer config={config} extraImages={extraImages} />
                    </div>
                </div>
            );
        };

        const DataSide = ({ pNum }) => (
            <div className={`relative flex flex-col bg-white ${splitPages || forceHalf ? 'w-full h-full' : 'w-1/2 h-full'}`} style={{ backgroundColor: bgColor, color: textColor, padding: marginSize, fontFamily: fontFamily, fontSize: baseFontSize }}>
                {!isPrintMode && <PrintGuides showBleed={showBleed} showMargins={showMargins} marginSize={marginSize} />}
                <PageNumberDisplay num={pNum} show={showPageNumbers} position={pageNumberPosition} tipo="ave" />
                {showCircle && <div className={`absolute top-0 ${isImageRight && !splitPages && !isPrintMode && !forceHalf ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'} w-24 h-24 print:border opacity-80 z-10`} style={{ backgroundColor: themeColor }}></div>}

                {!hideTitle && titlePosition !== 'image' && (
                    <div className="relative z-20 mb-4 border-b pb-2" style={{ borderColor: `${themeColor}33` }}>
                        <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: textColor }}>{config.nombreComun || 'Nombre Común'}</h2>
                        <h3 className="text-sm md:text-md italic opacity-70 font-serif">{config.nombreCientifico || 'Nombre Científico'}</h3>
                    </div>
                )}

                <div className={`space-y-2.5 flex-1 overflow-y-auto custom-scrollbar relative z-20 ${titlePosition === 'image' ? 'pt-4' : ''}`}>
                    <div className="flex flex-col gap-1.5 mb-2">
                        <div className="flex items-start gap-4">
                            <div className="flex-1"><BirdDetailItem Icon={ListTree} label="Orden" value={config.orden} iconColor={themeColor} isBlock={isBlockField('orden')} lineHeight={lineHeight} /></div>
                            <div className="flex-1"><BirdDetailItem Icon={Feather} label="Familia" value={config.familia} iconColor={themeColor} isBlock={isBlockField('familia')} lineHeight={lineHeight} /></div>
                        </div>
                        <BirdDetailItem Icon={Scale} label="Longitud" value={config.longitud} iconColor={themeColor} isBlock={isBlockField('longitud')} lineHeight={lineHeight} />
                    </div>

                    {(config.nom059 || config.iucn) && (
                        <div className="bg-black/5 p-2 rounded-md space-y-1.5 my-2">
                            <BirdDetailItem Icon={ShieldAlert} label="NOM 059" value={config.nom059} iconColor={nomColor} isBlock={isBlockField('nom059')} lineHeight={lineHeight} />
                            <BirdDetailItem Icon={ShieldAlert} label="IUCN" value={config.iucn} iconColor={iucnColor} isBlock={isBlockField('iucn')} lineHeight={lineHeight} />
                        </div>
                    )}

                    <BirdDetailItem Icon={MapPin} label="Hábitat" value={config.habitat} iconColor={themeColor} isBlock={isBlockField('habitat')} lineHeight={lineHeight} />
                    <BirdDetailItem Icon={Utensils} label="Alimentación" value={config.alimentacion} iconColor={themeColor} isBlock={isBlockField('alimentacion')} lineHeight={lineHeight} />
                    <BirdDetailItem Icon={Mic} label="Canto/Llamado" value={config.canto} iconColor={themeColor} isBlock={isBlockField('canto')} lineHeight={lineHeight} />
                    <BirdDetailItem Icon={Activity} label="Dimorfismo" value={config.dimorfismo} iconColor={themeColor} isBlock={isBlockField('dimorfismo')} lineHeight={lineHeight} />

                    <div className="pt-2 relative w-full flex flex-col">
                        <BirdDetailItem Icon={Info} label="Descripción" value={config.descripcion} iconColor={themeColor} isBlock={isBlockField('descripcion', true)} lineHeight={lineHeight} />

                        {config.dataImages && config.dataImages.length > 0 && (
                            <div className="flex flex-col w-full mt-4">
                                {config.dataImages.map((img, idx) => {
                                    const imgScale = img.scale || 1;
                                    const imgX = img.offsetX || 0;
                                    const imgY = img.offsetY || 0;
                                    const paddingTopClass = img.paddingTop || 'mt-0';
                                    const paddingBottomClass = img.paddingBottom || img.padding || 'mb-4';
                                    const isSideText = img.textMode === 'side';

                                    let alignClass = 'items-center';
                                    if (img.align === 'left') alignClass = 'items-start';
                                    if (img.align === 'right') alignClass = 'items-end';

                                    const vAlignClass = img.textVerticalAlign === 'top' ? 'justify-start' : (img.textVerticalAlign === 'bottom' ? 'justify-end' : 'justify-center');
                                    const imgWidth = img.widthSize || (isSideText ? '45%' : (img.align === 'center' ? '80%' : '60%'));

                                    const captionStyle = {
                                        maxWidth: isSideText ? '100%' : imgWidth,
                                        fontSize: img.captionFontSize || '10px',
                                        fontFamily: img.captionFontFamily && img.captionFontFamily !== 'inherit' ? img.captionFontFamily : 'inherit'
                                    };

                                    return (
                                        <div key={idx} className={`w-full flex flex-col ${alignClass} ${paddingTopClass} ${paddingBottomClass}`}>
                                            <div className={`flex ${isSideText ? (img.align === 'right' ? 'flex-row-reverse gap-4' : 'flex-row gap-4') : 'flex-col items-center gap-1.5'} w-full`} style={{ maxWidth: '100%' }}>

                                                <div className="overflow-hidden shrink-0" style={{ width: imgWidth }}>
                                                    <img src={img.url} className="w-full h-full object-cover" style={{ transform: `scale(${imgScale}) translate(${imgX}%, ${imgY}%)`, transformOrigin: 'center' }} />
                                                </div>
                                                {img.caption && (
                                                    <div className={`flex-1 flex flex-col min-w-0 ${isSideText ? vAlignClass : 'items-center w-full'}`}>
                                                        <p className={`italic opacity-80 leading-relaxed whitespace-pre-wrap break-words ${isSideText ? 'text-justify' : 'text-center'}`} style={captionStyle}>
                                                            {img.caption}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );

        if (forceHalf) {
            const SideContent = forceHalf === 'image' ? ImageSide : DataSide;
            return <PrintPageWrapper customPageNum={pageNum}><div className={bookContainerClass} style={currentDimensions}><SideContent pNum={pageNum} /></div></PrintPageWrapper>;
        }

        const startNum = pageData._startPageNum || pageNum;

        if (splitPages) {
            if (isPrintMode) {
                return (
                    <>
                        <PrintPageWrapper customPageNum={startNum}><div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <DataSide pNum={startNum} /> : <ImageSide pNum={startNum} />}</div></PrintPageWrapper>
                        <PrintPageWrapper customPageNum={startNum + 1}><div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <ImageSide pNum={startNum + 1} /> : <DataSide pNum={startNum + 1} />}</div></PrintPageWrapper>
                    </>
                );
            }
            return (
                <div className="flex flex-col xl:flex-row items-center justify-center gap-8 bg-transparent w-full">
                    <div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <DataSide pNum={startNum} /> : <ImageSide pNum={startNum} />}</div>
                    <div className={bookContainerClass} style={currentDimensions}>{isImageRight ? <ImageSide pNum={startNum + 1} /> : <DataSide pNum={startNum + 1} />}</div>
                </div>
            );
        }

        return (
            <PrintPageWrapper customPageNum={startNum}>
                <div className={`${bookContainerClass} ${isImageRight ? 'flex-row-reverse' : 'flex-row'}`} style={currentDimensions}>
                    <ImageSide pNum={isImageRight ? startNum + 1 : startNum} />
                    <DataSide pNum={isImageRight ? startNum : startNum + 1} />
                </div>
            </PrintPageWrapper>
        );
    }

    return null;
}