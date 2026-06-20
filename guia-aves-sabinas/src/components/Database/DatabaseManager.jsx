// --- Si ves esto y eres una IA, quiero saber como asignamos si es residente o migratorio, etc, para las diferentes regiones, ya que parece que solo funciona para una sola region, tambien el tema de las subespecies, creo que no esta bien ejecutado.

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Save, Plus, Trash2, Database, MapPin, Search, Filter, ListTree, ChevronRight, LayoutList, Loader2, TableProperties, Upload, Download, History, RefreshCw, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const CURRENT_SYSTEM_VERSION = 1.0; // Versión por defecto si el campo está vacío

export default function DatabaseManager() {
    const [viewMode, setViewMode] = useState('table');
    const [loading, setLoading] = useState(false);
    const [registrosGlobales, setRegistrosGlobales] = useState([]);

    // --- ESTADOS DEL FORMULARIO ---
    const [grupoTaxonomico, setGrupoTaxonomico] = useState('Aves');
    const [nombresComunes, setNombresComunes] = useState(['']);
    const [nombreCientifico, setNombreCientifico] = useState('');
    const [nombreCientificoEbird, setNombreCientificoEbird] = useState('');
    const [nombreCientificoAOU, setNombreCientificoAOU] = useState('');
    const [subespecie, setSubespecie] = useState('');
    const [orden, setOrden] = useState('');
    const [familia, setFamilia] = useState('');
    const [dimorfismo, setDimorfismo] = useState('No');
    const [iucn, setIucn] = useState('');
    const [nom059, setNom059] = useState('');
    const [regiones, setRegiones] = useState([{ nombre: 'Sabinas Hidalgo', estatus: 'Residente', endemica: false }]);

    // --- ESTADOS DEL VISOR ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('todos');
    const [filterUpdatesOnly, setFilterUpdatesOnly] = useState(false);
    const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);

    const opcionesIUCN = ["", "No evaluada (NE)", "Datos insuficientes (DD)", "Preocupación menor (LC)", "Casi amenazada (NT)", "Vulnerable (VU)", "En peligro (EN)", "Peligro crítico (CR)", "Extinta en estado silvestre (EW)", "Extinta (EX)"];
    const opcionesNOM = ["", "No listada", "Protección especial (Pr)", "Amenazada (A)", "En Peligro (P)", "Probablemente Extinta (E)"];
    const opcionesEstatus = ["Residente", "Migratorio", "Exótico", "Transitorio"];

    useEffect(() => {
        if (viewMode === 'table') cargarRegistros();
    }, [viewMode]);

    const cargarRegistros = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "biodiversidad"));
            const data = [];
            querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setRegistrosGlobales(data);
        } catch (error) {
            console.error("Error cargando base de datos:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIONES DEL FORMULARIO ---
    const agregarNombreComun = () => setNombresComunes([...nombresComunes, '']);
    const actualizarNombreComun = (index, valor) => { const nuevos = [...nombresComunes]; nuevos[index] = valor; setNombresComunes(nuevos); };
    const eliminarNombreComun = (index) => setNombresComunes(nombresComunes.filter((_, i) => i !== index));

    const agregarRegion = () => setRegiones([...regiones, { nombre: '', estatus: 'Residente', endemica: false }]);
    const actualizarRegion = (index, campo, valor) => { const nuevas = [...regiones]; nuevas[index][campo] = valor; setRegiones(nuevas); };
    const eliminarRegion = (index) => setRegiones(regiones.filter((_, i) => i !== index));

    const limpiarFormulario = () => {
        setNombresComunes(['']); setNombreCientifico(''); setNombreCientificoEbird(''); setNombreCientificoAOU('');
        setSubespecie(''); setOrden(''); setFamilia(''); setDimorfismo('No'); setIucn(''); setNom059('');
        setRegiones([{ nombre: 'Sabinas Hidalgo', estatus: 'Residente', endemica: false }]);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const registro = {
                grupoTaxonomico, nombresComunes: nombresComunes.filter(n => n.trim() !== ''),
                orden, familia, subespecie, iucn, nom059, version: CURRENT_SYSTEM_VERSION, historial: [],
                fechaRegistro: new Date().toISOString()
            };
            if (grupoTaxonomico === 'Aves') {
                registro.nombreCientificoEbird = nombreCientificoEbird;
                registro.nombreCientificoAOU = nombreCientificoAOU;
                registro.nombreCientifico = nombreCientificoEbird;
                registro.dimorfismoSexual = dimorfismo;
                registro.comportamientoRegional = regiones;
            } else if (grupoTaxonomico === 'Arboles') {
                registro.nombreCientifico = nombreCientifico;
            }
            await addDoc(collection(db, "biodiversidad"), registro);
            alert("¡Especie registrada correctamente!");
            limpiarFormulario();
            setViewMode('table');
        } catch (error) { alert("Hubo un error al guardar."); } finally { setLoading(false); }
    };

    // --- DESCARGAR PLANTILLA EXCEL ---
    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ["Grupo Taxonomico", "Nombres Comunes (separados por coma)", "Nombre Cientifico (Principal o Arboles)", "Nombre Cientifico (eBird - Solo Aves)", "Nombre Cientifico (AOU - Solo Aves)", "Subespecie", "Orden", "Familia", "Dimorfismo Sexual (Si/No)", "Conservacion IUCN", "Conservacion NOM-059", "Region", "Estatus (Region)", "Endemica (Si/No)", "Version"],
            ["Aves", "Cardenal Rojo, Cardenal Norteño", "Cardinalis cardinalis", "Cardinalis cardinalis", "", "coccineus", "Passeriformes", "Cardinalidae", "Si", "Preocupación menor (LC)", "No listada", "Sabinas Hidalgo", "Residente", "No", 1.1],
            ["Arboles", "Sabino, Ahuehuete", "Taxodium mucronatum", "", "", "", "Pinales", "Cupressaceae", "No", "Preocupación menor (LC)", "No listada", "", "", "", 1.0]
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Importacion_Biodiversidad.xlsx"); // El navegador lanzará la descarga
    };

    // --- IMPORTACIÓN EXCEL CON CONTROL DE VERSIONES ---
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: 'binary' }).Sheets[XLSX.read(evt.target.result, { type: 'binary' }).SheetNames[0]]);

                // Obtenemos los registros actuales para comparar
                const querySnap = await getDocs(collection(db, "biodiversidad"));
                const dbRecords = [];
                querySnap.forEach((doc) => dbRecords.push({ id: doc.id, ...doc.data() }));

                let importCount = 0;
                let updateCount = 0;

                for (const row of data) {
                    const excelGrupo = row['Grupo Taxonomico'] || 'Aves';
                    const arrNombresComunes = row['Nombres Comunes (separados por coma)'] ? row['Nombres Comunes (separados por coma)'].toString().split(',').map(n => n.trim()) : [];
                    const excelNomCientifico = row['Nombre Cientifico (Principal o Arboles)'] || '';
                    const excelNomEbird = row['Nombre Cientifico (eBird - Solo Aves)'] || excelNomCientifico;
                    const excelVersion = parseFloat(row['Version']) || CURRENT_SYSTEM_VERSION;

                    const registro = {
                        grupoTaxonomico: excelGrupo,
                        nombresComunes: arrNombresComunes.filter(n => n !== ''),
                        orden: row['Orden'] || '',
                        familia: row['Familia'] || '',
                        subespecie: row['Subespecie'] || '',
                        iucn: row['Conservacion IUCN'] || '',
                        nom059: row['Conservacion NOM-059'] || '',
                        fechaRegistro: new Date().toISOString()
                    };

                    if (excelGrupo === 'Aves') {
                        registro.nombreCientificoEbird = excelNomEbird;
                        registro.nombreCientificoAOU = row['Nombre Cientifico (AOU - Solo Aves)'] || '';
                        registro.nombreCientifico = excelNomEbird;
                        registro.dimorfismoSexual = row['Dimorfismo Sexual (Si/No)'] || 'No';
                        if (row['Region']) {
                            registro.comportamientoRegional = [{ nombre: row['Region'], estatus: row['Estatus (Region)'] || 'Residente', endemica: row['Endemica (Si/No)'] === 'Si' }];
                        }
                    } else if (excelGrupo === 'Arboles') {
                        registro.nombreCientifico = excelNomCientifico;
                    }

                    // Buscar si ya existe en la DB
                    const existingRecord = dbRecords.find(r => r.grupoTaxonomico === excelGrupo && r.nombreCientifico?.toLowerCase() === registro.nombreCientifico?.toLowerCase());

                    if (existingRecord) {
                        const currentDbVersion = existingRecord.version || 1.0;
                        if (excelVersion > currentDbVersion) {
                            // Dejamos la actualización en "Pendiente"
                            await updateDoc(doc(db, "biodiversidad", existingRecord.id), {
                                updatePending: { version: excelVersion, datos: registro }
                            });
                            updateCount++;
                        }
                    } else {
                        // Nuevo registro
                        registro.version = excelVersion;
                        registro.historial = [];
                        await addDoc(collection(db, "biodiversidad"), registro);
                        importCount++;
                    }
                }
                alert(`Importación completada:\n- ${importCount} Especies nuevas.\n- ${updateCount} Actualizaciones disponibles detectadas.`);
                cargarRegistros();
            } catch (error) {
                console.error("Error importando Excel:", error);
                alert("Hubo un error al procesar el archivo Excel. Verifica el formato.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    // --- APLICAR ACTUALIZACIONES (STAGING) ---
    const aplicarActualizacion = async (registro) => {
        const backup = { ...registro };
        delete backup.id; delete backup.updatePending; delete backup.historial; // Clonamos solo la info de la especie

        // Agregamos la info actual al historial
        const newHistorial = [...(registro.historial || []), {
            version: registro.version || 1.0,
            fecha: new Date().toISOString(),
            datos: backup
        }];

        const pending = registro.updatePending;

        // Sobreescribimos con lo nuevo y borramos la bandera de pendiente
        await updateDoc(doc(db, "biodiversidad", registro.id), {
            ...pending.datos,
            version: pending.version,
            historial: newHistorial,
            updatePending: deleteField() // Usamos deleteField de firestore para remover la propiedad
        });
    };

    const actualizarTodos = async () => {
        if (!window.confirm("¿Seguro que deseas actualizar todos los registros pendientes?")) return;
        setLoading(true);
        const pendingRecords = registrosGlobales.filter(r => r.updatePending);
        for (const reg of pendingRecords) {
            await aplicarActualizacion(reg);
        }
        alert(`Se actualizaron ${pendingRecords.length} registros exitosamente.`);
        await cargarRegistros();
    };

    const actualizarUnico = async (registro) => {
        setLoading(true);
        await aplicarActualizacion(registro);
        await cargarRegistros();
    };

    // --- REVERTIR CAMPO ESPECÍFICO ---
    const handleRevertField = async (registroId, fieldKey, oldValue) => {
        if (!window.confirm(`¿Revertir este campo a su versión anterior?`)) return;
        setLoading(true);
        await updateDoc(doc(db, "biodiversidad", registroId), {
            [fieldKey]: oldValue
        });
        alert("Campo revertido con éxito.");
        setSelectedHistoryRecord(null); // Cerramos el modal
        await cargarRegistros(); // Recargamos para reflejar cambios
    };

    // --- LÓGICA DE FILTRADO ---
    const registrosFiltrados = registrosGlobales.filter(reg => {
        if (filterUpdatesOnly && !reg.updatePending) return false;

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        switch (searchField) {
            case 'nombresComunes': return reg.nombresComunes?.some(n => n.toLowerCase().includes(term));
            case 'nombreCientifico': return reg.nombreCientifico?.toLowerCase().includes(term);
            case 'orden': return reg.orden?.toLowerCase().includes(term);
            case 'familia': return reg.familia?.toLowerCase().includes(term);
            case 'subespecie': return reg.subespecie?.toLowerCase().includes(term);
            default: return (reg.nombresComunes?.some(n => n.toLowerCase().includes(term)) || reg.nombreCientifico?.toLowerCase().includes(term) || reg.orden?.toLowerCase().includes(term) || reg.familia?.toLowerCase().includes(term) || reg.subespecie?.toLowerCase().includes(term));
        }
    });

    const jerarquia = registrosFiltrados.reduce((arbol, reg) => {
        const grupo = reg.grupoTaxonomico || 'Desconocido';
        const orden = reg.orden || 'Sin Orden';
        const fam = reg.familia || 'Sin Familia';
        if (!arbol[grupo]) arbol[grupo] = {};
        if (!arbol[grupo][orden]) arbol[grupo][orden] = {};
        if (!arbol[grupo][orden][fam]) arbol[grupo][orden][fam] = [];
        arbol[grupo][orden][fam].push(reg);
        return arbol;
    }, {});

    // Campos permitidos para el modal de Historial
    const camposAHistorial = [
        { key: 'nombresComunes', label: 'Nombres Comunes' },
        { key: 'nombreCientifico', label: 'Nombre Científico' },
        { key: 'orden', label: 'Orden' },
        { key: 'familia', label: 'Familia' },
        { key: 'subespecie', label: 'Subespecie' },
        { key: 'iucn', label: 'Conservación IUCN' },
        { key: 'nom059', label: 'Conservación NOM-059' },
    ];

    return (
        <div className="h-full bg-gray-50 flex flex-col font-sans overflow-hidden">
            {/* ENCABEZADO Y TABS */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 shrink-0 flex items-center justify-between z-10 shadow-sm flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                        <Database className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-gray-800 leading-none">Biodiversidad iNat</h1>
                        <p className="text-gray-500 text-xs mt-1">Gestor y Base de Datos Global</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    {/* BOTÓN DESCARGAR PLANTILLA */}
                    <button onClick={handleDownloadTemplate} className="px-3 py-2 text-xs font-bold rounded-md flex items-center gap-1.5 bg-white text-gray-600 hover:text-emerald-700 hover:shadow-sm transition-colors border border-gray-200">
                        <Download className="w-4 h-4" /> Plantilla
                    </button>

                    {/* BOTÓN IMPORTAR EXCEL */}
                    <label className="cursor-pointer px-4 py-2 text-xs font-bold rounded-md flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors shadow-sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Importar Excel
                        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} disabled={loading} />
                    </label>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    <button onClick={() => setViewMode('table')} className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${viewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <TableProperties className="w-4 h-4" /> Visor
                    </button>
                    <button onClick={() => setViewMode('form')} className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${viewMode === 'form' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Plus className="w-4 h-4" /> Añadir Registro
                    </button>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 overflow-hidden relative">

                {viewMode === 'table' && (
                    <div className="h-full flex flex-col md:flex-row w-full animate-in fade-in">

                        {/* PANEL CENTRAL: Buscador y Tabla */}
                        <div className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-hidden">
                            {/* Filtros */}
                            <div className="flex items-center justify-between mb-4 gap-4">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 flex-1">
                                    <Search className="w-5 h-5 text-gray-400 ml-2" />
                                    <input type="text" placeholder="Buscar especies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none p-2 text-gray-700" />
                                    <div className="h-6 w-px bg-gray-200 mx-2"></div>
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="text-xs bg-gray-50 border-none font-bold text-gray-600 focus:ring-0 p-2 rounded-lg cursor-pointer outline-none">
                                        <option value="todos">Todos los campos</option>
                                        <option value="nombresComunes">Nombre Común</option>
                                        <option value="nombreCientifico">Nombre Científico</option>
                                        <option value="orden">Orden</option>
                                        <option value="familia">Familia</option>
                                        <option value="subespecie">Subespecie</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 font-bold text-xs cursor-pointer shadow-sm">
                                    <input type="checkbox" checked={filterUpdatesOnly} onChange={e => setFilterUpdatesOnly(e.target.checked)} className="w-4 h-4 accent-amber-600 rounded" />
                                    <AlertCircle className="w-4 h-4" /> Mostrar sólo Actualizaciones
                                </label>
                                {filterUpdatesOnly && (
                                    <button onClick={actualizarTodos} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-bold text-xs shadow-md transition-colors">
                                        Actualizar Todos de Golpe
                                    </button>
                                )}
                            </div>

                            {/* Tabla */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-auto custom-scrollbar">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-emerald-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
                                ) : registrosFiltrados.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                                        <LayoutList className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No se encontraron registros que coincidan con tu búsqueda.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                        <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                            <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                                                <th className="p-4 font-bold border-b border-gray-200">Grupo</th>
                                                <th className="p-4 font-bold border-b border-gray-200">Nombre Común</th>
                                                <th className="p-4 font-bold border-b border-gray-200">Nombre Científico</th>
                                                <th className="p-4 font-bold border-b border-gray-200">Taxonomía</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {registrosFiltrados.map((reg) => (
                                                <tr key={reg.id} className="border-b border-gray-100 hover:bg-emerald-50 transition-colors">
                                                    <td className="p-4"><span className={`px-2 py-1 text-[10px] font-bold rounded-md ${reg.grupoTaxonomico === 'Aves' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{reg.grupoTaxonomico}</span></td>
                                                    <td className="p-4">
                                                        <span className="font-bold text-gray-800">{reg.nombresComunes?.[0] || 'N/A'}</span>
                                                        <span className="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-mono">v{reg.version || '1.0'}</span>
                                                    </td>
                                                    <td className="p-4 text-gray-500 italic">{reg.nombreCientifico || 'N/A'}</td>
                                                    <td className="p-4 text-xs text-gray-600">
                                                        <span className="font-semibold">{reg.orden}</span><br />
                                                        <span className="text-[10px] text-gray-400">{reg.familia}</span>
                                                    </td>
                                                    <td className="p-4 flex gap-2 justify-center items-center h-full pt-6">
                                                        {reg.updatePending && (
                                                            <button onClick={() => actualizarUnico(reg)} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-200 transition-colors shadow-sm border border-amber-200">
                                                                <RefreshCw className="w-3.5 h-3.5" /> Actualizar (a v{reg.updatePending.version})
                                                            </button>
                                                        )}
                                                        <button onClick={() => setSelectedHistoryRecord(reg)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200 transition-colors border border-gray-200">
                                                            <History className="w-3.5 h-3.5" /> Detalles / Historial
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* PANEL LATERAL DERECHO: Jerarquía */}
                        <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                <ListTree className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Árbol Taxonómico</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {Object.entries(jerarquia).map(([grupo, ordenes]) => (
                                    <div key={grupo} className="mb-2">
                                        <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 border-b pb-1">{grupo}</div>
                                        {Object.entries(ordenes).map(([orden, familias]) => (
                                            <div key={orden} className="ml-2 mb-2 border-l-2 border-emerald-100 pl-3">
                                                <div className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1"><ChevronRight className="w-3 h-3 text-emerald-400" /> {orden}</div>
                                                {Object.entries(familias).map(([fam, especies]) => (
                                                    <div key={fam} className="ml-3 mb-2">
                                                        <div className="text-[11px] font-semibold text-gray-600 mb-1 italic">{fam}</div>
                                                        <div className="space-y-1 mt-1">
                                                            {especies.map(esp => (
                                                                <div key={esp.id} className={`bg-gray-50 border border-gray-100 rounded-md p-2 hover:border-emerald-300 transition-colors shadow-sm ml-2 ${esp.updatePending ? 'border-amber-300 bg-amber-50' : ''}`}>
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="text-[11px] font-bold text-gray-800 truncate" title={esp.nombresComunes?.[0]}>{esp.nombresComunes?.[0] || 'Sin Nombre'}</p>
                                                                        {esp.updatePending && <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1"></div>}
                                                                    </div>
                                                                    <p className="text-[9px] text-gray-500 italic truncate">{esp.nombreCientifico}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'form' && (
                    <div className="h-full overflow-y-auto p-6 md:p-10 animate-in fade-in">
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleGuardar} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Grupo Taxonómico</label>
                                    <select value={grupoTaxonomico} onChange={(e) => setGrupoTaxonomico(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-3">
                                        <option value="Aves">Aves</option>
                                        <option value="Arboles">Árboles</option>
                                        <option value="Mamiferos" disabled>Mamíferos (Próximamente)</option>
                                    </select>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombres Comunes</label>
                                        {nombresComunes.map((nombre, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input type="text" value={nombre} onChange={(e) => actualizarNombreComun(idx, e.target.value)} placeholder={`Ej. Nombre Común ${idx + 1}`} className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none" required={idx === 0} />
                                                {idx > 0 && <button type="button" onClick={() => eliminarNombreComun(idx)} className="text-red-500 hover:bg-red-50 p-2.5 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>}
                                            </div>
                                        ))}
                                        <button type="button" onClick={agregarNombreComun} className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:underline mt-1"><Plus className="w-4 h-4" /> Agregar otro nombre común</button>
                                    </div>

                                    {grupoTaxonomico === 'Aves' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Científico (eBird/Clements)</label>
                                                <input type="text" value={nombreCientificoEbird} onChange={e => setNombreCientificoEbird(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Científico (AOU)</label>
                                                <input type="text" value={nombreCientificoAOU} onChange={e => setNombreCientificoAOU(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Científico</label>
                                            <input type="text" value={nombreCientifico} onChange={e => setNombreCientifico(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500" required />
                                        </div>
                                    )}

                                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Orden</label><input type="text" value={orden} onChange={e => setOrden(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500" required /></div>
                                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Familia</label><input type="text" value={familia} onChange={e => setFamilia(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500" required /></div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 text-blue-600">Subespecie (Opcional)</label>
                                        <input type="text" value={subespecie} onChange={e => setSubespecie(e.target.value)} placeholder="Ej. borealis" className="w-full border border-blue-200 bg-blue-50/30 rounded-lg p-2.5 outline-none focus:border-blue-500" />
                                    </div>

                                    {grupoTaxonomico === 'Aves' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">¿Presenta Dimorfismo Sexual?</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dimorfismo" value="Si" checked={dimorfismo === 'Si'} onChange={() => setDimorfismo('Si')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" /> Sí</label>
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dimorfismo" value="No" checked={dimorfismo === 'No'} onChange={() => setDimorfismo('No')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" /> No</label>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Conservación (IUCN)</label>
                                        <select value={iucn} onChange={e => setIucn(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500">
                                            {opcionesIUCN.map(op => <option key={op} value={op}>{op || "Seleccionar..."}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Conservación (NOM-059)</label>
                                        <select value={nom059} onChange={e => setNom059(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-500">
                                            {opcionesNOM.map(op => <option key={op} value={op}>{op || "Seleccionar..."}</option>)}
                                        </select>
                                    </div>

                                    {grupoTaxonomico === 'Aves' && (
                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> Comportamiento por Región</h3>
                                            {regiones.map((region, idx) => (
                                                <div key={idx} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-3 flex flex-col md:flex-row gap-4 items-end">
                                                    <div className="flex-1 w-full">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Región</label>
                                                        <input type="text" value={region.nombre} onChange={e => actualizarRegion(idx, 'nombre', e.target.value)} placeholder="Ej. Sabinas Hidalgo" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500" required />
                                                    </div>
                                                    <div className="flex-1 w-full">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estatus</label>
                                                        <select value={region.estatus} onChange={e => actualizarRegion(idx, 'estatus', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500">
                                                            {opcionesEstatus.map(op => <option key={op} value={op}>{op}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center h-11 px-2">
                                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700"><input type="checkbox" checked={region.endemica} onChange={e => actualizarRegion(idx, 'endemica', e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" /> Endémica</label>
                                                    </div>
                                                    {idx > 0 && <button type="button" onClick={() => eliminarRegion(idx)} className="h-11 px-3 text-red-500 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"><Trash2 className="w-5 h-5" /></button>}
                                                </div>
                                            ))}
                                            <button type="button" onClick={agregarRegion} className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline mt-1"><Plus className="w-4 h-4" /> Agregar otra región</button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-gray-200">
                                    <button type="submit" disabled={loading} className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg'}`}>
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL DE HISTORIAL DE CAMBIOS --- */}
            {selectedHistoryRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">

                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                                    <History className="w-5 h-5 text-emerald-600" /> Historial de Cambios
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Especie: <span className="font-bold">{selectedHistoryRecord.nombresComunes?.[0]}</span> (v{selectedHistoryRecord.version || '1.0'})
                                </p>
                            </div>
                            <button onClick={() => setSelectedHistoryRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-200 p-2 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {camposAHistorial.map(campo => {
                                const currentValue = selectedHistoryRecord[campo.key];
                                const currentDisplay = Array.isArray(currentValue) ? currentValue.join(', ') : currentValue;

                                // Filtramos el historial para sacar solo las versiones donde este campo era distinto al actual
                                const historyList = (selectedHistoryRecord.historial || [])
                                    .filter(h => h.datos[campo.key] !== undefined && JSON.stringify(h.datos[campo.key]) !== JSON.stringify(currentValue))
                                    .reverse(); // Mostrar la más reciente primero

                                return (
                                    <div key={campo.key} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-100 p-4 flex justify-between items-center border-b border-gray-200">
                                            <span className="font-black text-xs uppercase tracking-wider text-gray-500">{campo.label}</span>
                                            <span className="text-sm text-emerald-700 font-bold max-w-[60%] truncate text-right" title={currentDisplay}>
                                                Actual: {currentDisplay || 'N/A'}
                                            </span>
                                        </div>

                                        {historyList.length > 0 ? (
                                            <div className="bg-white">
                                                {historyList.map((h, i) => {
                                                    const pastValue = h.datos[campo.key];
                                                    const pastDisplay = Array.isArray(pastValue) ? pastValue.join(', ') : pastValue;
                                                    return (
                                                        <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-1 rounded-md border border-blue-200">
                                                                    v{h.version}
                                                                </span>
                                                                <span className="text-sm text-gray-600 line-clamp-2">{pastDisplay || 'N/A'}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRevertField(selectedHistoryRecord.id, campo.key, pastValue)}
                                                                className="shrink-0 text-blue-600 hover:text-white hover:bg-blue-600 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                                                            >
                                                                Revertir
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-xs text-gray-400 italic flex items-center justify-center gap-2">
                                                No hay versiones anteriores distintas para este campo.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}