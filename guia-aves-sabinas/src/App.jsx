import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Upload, Printer, FileJson, Image as ImageIcon, Info } from 'lucide-react';

export default function App() {
  // Datos de muestra extraídos de tu PDF
  const defaultData = [
    {
      "nombreComun": "Tinamú Canelo",
      "nombreCientifico": "Crypturellus cinnamomeus",
      "familia": "Tinamidae",
      "orden": "Tinamiformes",
      "longitud": "27 a 32 cm. Peso: 400 a 550 g.",
      "dimorfismo": "No presenta dimorfismo sexual evidente.",
      "alimentacion": "Omnívoro. Frutas caídas, semillas, insectos, lombrices.",
      "canto": "Melancólico, profundo y aflautado, tipo '-uuu-uuu'.",
      "habitat": "Selvas bajas caducifolias, bosques secos, vegetación densa.",
      "descripcion": "Ave terrestre de tamaño mediano, coloración canela rojiza. Es sumamente esquivo y suele caminar sigilosamente entre la vegetación baja."
    },
    {
      "nombreComun": "Pijije Alas Blancas",
      "nombreCientifico": "Dendrocygna autumnalis",
      "familia": "Anatidae",
      "orden": "Anseriformes",
      "longitud": "47 a 56 cm. Envergadura: 76-94 cm.",
      "dimorfismo": "Machos y hembras son virtualmente idénticos.",
      "alimentacion": "Semillas, granos, hierbas acuáticas e invertebrados.",
      "canto": "Silbido claro, agudo y repetitivo, 'huit-huit' sonoro.",
      "habitat": "Cuerpos de agua dulce o salobre, estuarios, manglares.",
      "descripcion": "Pato silbador con cuerpo castaño rojizo y franja blanca en las alas. Se le reconoce por su hábito de posarse en árboles y moverse en grupos ruidosos."
    },
    {
      "nombreComun": "Chachalaca Oriental",
      "nombreCientifico": "Ortalis vetula",
      "familia": "Cracidae",
      "orden": "Galliformes",
      "longitud": "50 a 58 cm. Peso: 500 a 700 g.",
      "dimorfismo": "Machos y hembras muy similares.",
      "alimentacion": "Frugívora. Consume frutos, hojas tiernas, flores e insectos.",
      "canto": "Fuerte, áspero y rítmico, suena como 'cha-cha-lac'.",
      "habitat": "Bosques tropicales secos, selvas bajas, matorrales espinosos.",
      "descripcion": "Ave de tamaño mediano con cuerpo esbelto y cola larga. Apariencia discreta pardo oliváceo que contrasta con su comportamiento sumamente ruidoso."
    }
  ];

  const [birdsData, setBirdsData] = useState(defaultData);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultData, null, 2));
  const [jsonError, setJsonError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState({});

  // Manejar el cambio en el texto JSON
  const handleJsonChange = (e) => {
    const value = e.target.value;
    setJsonInput(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setBirdsData(parsed);
        setJsonError("");
        if (currentIndex >= parsed.length) setCurrentIndex(0);
      } else {
        setJsonError("El JSON debe ser un arreglo (array) de objetos.");
      }
    } catch (err) {
      setJsonError("JSON inválido. Revisa la sintaxis.");
    }
  };

  // Subir imagen local
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => ({
          ...prev,
          [currentIndex]: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Navegación
  const nextBird = () => setCurrentIndex(prev => Math.min(birdsData.length - 1, prev + 1));
  const prevBird = () => setCurrentIndex(prev => Math.max(0, prev - 1));

  // Imprimir
  const handlePrint = () => window.print();

  const currentBird = birdsData[currentIndex] || {};
  const currentImage = images[currentIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">

      {/* PANEL LATERAL (Controles) - Se oculta al imprimir */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white shadow-lg p-6 flex flex-col h-screen overflow-y-auto print:hidden">
        <h1 className="text-2xl font-bold text-emerald-800 mb-2">Generador de Libro</h1>
        <p className="text-sm text-gray-600 mb-6">Guía de Aves de Sabinas Hidalgo</p>

        <div className="mb-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
            <FileJson className="w-4 h-4 mr-2" /> Datos (Formato JSON)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Convierte tu Excel a JSON usando herramientas web y pégalo aquí. Usa las llaves del ejemplo.
          </p>
          <textarea
            className={`w-full h-48 p-3 text-xs font-mono border rounded focus:ring focus:ring-emerald-200 outline-none ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
            value={jsonInput}
            onChange={handleJsonChange}
          />
          {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
        </div>

        <div className="mb-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
            <ImageIcon className="w-4 h-4 mr-2" /> Imagen del Ave
          </label>
          <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition">
            <Upload className="w-4 h-4 mr-2" />
            Subir Foto
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevBird} disabled={currentIndex === 0} className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">
              Ave {currentIndex + 1} de {birdsData.length}
            </span>
            <button onClick={nextBird} disabled={currentIndex === birdsData.length - 1} className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button onClick={handlePrint} className="w-full flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-semibold rounded hover:bg-emerald-700 transition">
            <Printer className="w-5 h-5 mr-2" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ÁREA DE PREVISUALIZACIÓN Y FORMATO DEL LIBRO */}
      <div className="flex-1 bg-gray-200 p-8 flex items-center justify-center print:bg-white print:p-0 print:m-0 print:block">

        {/* CONTENEDOR TIPO LIBRO ABIERTO */}
        <div className="w-[850px] h-[550px] bg-white shadow-2xl flex rounded-sm overflow-hidden relative print:shadow-none print:w-[100vw] print:h-[100vh] print:rounded-none">

          {/* Sombras en el lomo para efecto de libro (solo pantalla) */}
          <div className="absolute inset-y-0 left-1/2 w-8 -ml-4 bg-gradient-to-r from-transparent via-black/10 to-transparent pointer-events-none print:hidden z-10"></div>

          {/* PÁGINA IZQUIERDA: IMAGEN COMPLETAMENTE LLENA */}
          <div className="w-1/2 h-full bg-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
            {currentImage ? (
              <img src={currentImage} alt={currentBird.nombreComun} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 flex flex-col items-center text-center p-8">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p>Sube una foto para el <b>{currentBird.nombreComun || "ave"}</b>.</p>
                <p className="text-xs mt-2">Ocupará toda esta página sin márgenes.</p>
              </div>
            )}

            {/* Opcional: Créditos de la foto abajo */}
            {currentImage && (
              <div className="absolute bottom-2 right-2 text-[10px] text-white/80 bg-black/30 px-2 py-1 rounded">
                Foto para fines ilustrativos
              </div>
            )}
          </div>

          {/* PÁGINA DERECHA: INFORMACIÓN */}
          <div className="w-1/2 h-full bg-[#f4f7f9] p-8 md:p-10 relative flex flex-col text-[#2c3e50]">

            {/* Pestaña decorativa de color en la esquina superior derecha */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-bl-full overflow-hidden print:bg-blue-500" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>

            {/* Encabezado */}
            <div className="border-b border-gray-300 pb-2 mb-6 pr-12 relative z-10">
              <h2 className="text-2xl font-bold leading-tight text-gray-900 mb-1">
                {currentBird.nombreComun || 'Nombre Común'}
              </h2>
              <h3 className="text-sm italic text-gray-600">
                {currentBird.nombreCientifico || 'Nombre científico'}
              </h3>
            </div>

            {/* Ficha técnica tipo lista */}
            <div className="flex-1 space-y-3 text-[13px] leading-snug">

              {currentBird.longitud && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Tamaño:</span>
                  <span>{currentBird.longitud}</span>
                </div>
              )}

              {currentBird.dimorfismo && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Dimorfismo:</span>
                  <span>{currentBird.dimorfismo}</span>
                </div>
              )}

              {currentBird.familia && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Familia:</span>
                  <span>{currentBird.familia}</span>
                </div>
              )}

              {currentBird.orden && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Orden:</span>
                  <span>{currentBird.orden}</span>
                </div>
              )}

              {currentBird.canto && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Canto:</span>
                  <span>{currentBird.canto}</span>
                </div>
              )}

              {currentBird.alimentacion && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Comida:</span>
                  <span>{currentBird.alimentacion}</span>
                </div>
              )}

              {currentBird.habitat && (
                <div className="flex">
                  <span className="font-bold min-w-[90px] text-right mr-3 shrink-0">Hábitat:</span>
                  <span>{currentBird.habitat}</span>
                </div>
              )}
            </div>

            {/* Notas del autor / Descripción */}
            {currentBird.descripcion && (
              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-[12px] text-gray-700 leading-relaxed text-justify">
                  <strong className="text-gray-900">Notas de Sabinas:</strong> {currentBird.descripcion}
                </p>
              </div>
            )}

            {/* Número de página inferior */}
            <div className="absolute bottom-6 right-8 text-sm font-semibold text-gray-500">
              {currentIndex + 1}
            </div>

          </div>
        </div>

        {/* INSTRUCCIONES ESTILOS DE IMPRESIÓN */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body { background: white; margin: 0; padding: 0; }
            @page { size: landscape; margin: 0cm; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          }
        `}} />
      </div>
    </div>
  );
}