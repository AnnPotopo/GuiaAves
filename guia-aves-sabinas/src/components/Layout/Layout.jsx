import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Mic, Bird, LogOut, Loader2, BarChart3, Menu, X, Database, Library, ShieldAlert, QrCode } from 'lucide-react';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const auth = getAuth();
const provider = new GoogleAuthProvider();

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Inicia cerrado (modo mini) por defecto
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const loggedUser = result.user;

            await setDoc(doc(db, "usuarios", loggedUser.uid), {
                uid: loggedUser.uid,
                displayName: loggedUser.displayName,
                email: loggedUser.email,
                avatarUrl: loggedUser.photoURL || '',
                estadoBaneo: 'activo'
            }, { merge: true });

        } catch (error) {
            alert("Hubo un problema al iniciar sesión con Google.");
        }
    };

    const handleLogout = () => {
        signOut(auth).then(() => navigate('/'));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 font-sans">
                <Bird className="w-20 h-20 text-emerald-600 mb-6 drop-shadow-md" />
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2 text-center">Sabinas ID</h1>
                <p className="text-gray-500 text-center mb-10 max-w-sm">
                    Descubre e identifica las aves de Sabinas Hidalgo. Inicia sesión para guardar tu colección.
                </p>
                <button
                    onClick={handleLogin}
                    className="flex items-center gap-3 bg-white border border-gray-300 px-8 py-4 rounded-full font-bold shadow-sm hover:shadow-md hover:bg-gray-50 transition-all text-gray-700 text-lg"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-6 h-6" alt="Google" />
                    Continuar con Google
                </button>
            </div>
        );
    }

    const isAdmin = user.email === "potopo.ann@gmail.com";

    const modulos = [
        { id: 'home', titulo: 'Inicio', icono: <Bird className="w-6 h-6 text-gray-500" />, color: 'bg-gray-50 hover:border-gray-300 text-gray-600', ruta: '/', adminOnly: false },
        { id: 'birdapp', titulo: 'Identificador', icono: <Mic className="w-6 h-6 text-emerald-600" />, color: 'bg-emerald-50 hover:border-emerald-300 text-emerald-600', ruta: '/birdapp', adminOnly: false },
        { id: 'libros', titulo: 'Biblioteca Digital', icono: <Library className="w-6 h-6 text-emerald-600" />, color: 'bg-emerald-50 hover:border-emerald-300 text-emerald-600', ruta: '/libros', adminOnly: false },

        // <-- NUEVO MÓDULO AÑADIDO AQUÍ -->
        { id: 'canjear', titulo: 'Canjear Códigos', icono: <QrCode className="w-6 h-6 text-indigo-600" />, color: 'bg-indigo-50 hover:border-indigo-300 text-indigo-600', ruta: '/canjear', adminOnly: false },

        { id: 'creador', titulo: 'Creador de Guías', icono: <BookOpen className="w-6 h-6 text-blue-600" />, color: 'bg-blue-50 hover:border-blue-300 text-blue-600', ruta: '/creador-guias', adminOnly: true },
        { id: 'dashboard', titulo: 'Centro de Comando', icono: <BarChart3 className="w-6 h-6 text-purple-600" />, color: 'bg-purple-50 hover:border-purple-300 text-purple-600', ruta: '/dashboard', adminOnly: true },
        { id: 'database', titulo: 'Base de Datos (iNat)', icono: <Database className="w-6 h-6 text-amber-600" />, color: 'bg-amber-50 hover:border-amber-300 text-amber-600', ruta: '/database', adminOnly: true },
        { id: 'moderacion', titulo: 'Moderación', icono: <ShieldAlert className="w-6 h-6 text-red-600" />, color: 'bg-red-50 hover:border-red-300 text-red-600', ruta: '/moderacion', adminOnly: true }
    ];

    return (
        <div className="flex h-screen bg-[#f8f9fa] font-sans overflow-hidden">

            {/* MINI SIDEBAR */}
            <aside className={`bg-white shadow-xl transition-all duration-300 ease-in-out flex flex-col z-20 shrink-0 ${isSidebarOpen ? 'w-72' : 'w-16 sm:w-20'}`}>

                <div className={`p-4 flex items-center border-b border-gray-100 h-16 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Bird className="w-8 h-8 text-emerald-600 shrink-0" />
                        {isSidebarOpen && <span className="text-xl font-extrabold text-gray-800 whitespace-nowrap">Sabinas ID</span>}
                    </div>
                </div>

                <div className={`p-4 border-b border-gray-100 flex ${isSidebarOpen ? 'items-start flex-col' : 'items-center justify-center'}`}>
                    {isSidebarOpen ? (
                        <div className="overflow-hidden w-full">
                            <p className="text-sm font-semibold text-gray-800 truncate">{user.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            {isAdmin && <span className="mt-2 inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Admin</span>}
                        </div>
                    ) : (
                        <img src={user.photoURL || "https://via.placeholder.com/40"} alt="Perfil" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm shrink-0" />
                    )}
                </div>

                <nav className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {isSidebarOpen && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Navegación</p>}

                    {modulos.filter(m => !m.adminOnly || isAdmin).map((modulo) => {
                        const isActive = location.pathname === modulo.ruta;
                        return (
                            <button
                                key={modulo.id}
                                onClick={() => navigate(modulo.ruta)}
                                title={!isSidebarOpen ? modulo.titulo : ''}
                                className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-colors text-left group ${isActive ? modulo.color : 'hover:bg-gray-50'}`}
                            >
                                <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-white shadow-sm' : modulo.color.split(' ')[0]}`}>
                                    {modulo.icono}
                                </div>
                                {isSidebarOpen && (
                                    <span className={`font-semibold truncate ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                        {modulo.titulo}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-3 sm:p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        title={!isSidebarOpen ? "Cerrar Sesión" : ""}
                        className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-semibold`}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {isSidebarOpen && <span className="whitespace-nowrap">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bird className="w-5 h-5 text-emerald-600 hidden sm:block" />
                            <span className="font-bold text-slate-800 text-lg tracking-tight hidden sm:block">Sabinas ID</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 hidden sm:block">{user.displayName}</span>
                        <img src={user.photoURL || "https://via.placeholder.com/40"} alt="Perfil" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-transparent relative custom-scrollbar">
                    <Outlet context={{ user, isAdmin }} />
                </div>
            </main>
        </div>
    );
}