import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Mic, Bird, LogOut, Loader2, BarChart3, Menu, X, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC2UNjl2dW0v_JH7-ScMUTnLkl64_7rsvM",
    authDomain: "librostools.firebaseapp.com",
    projectId: "librostools",
    storageBucket: "librostools.firebasestorage.app",
    messagingSenderId: "442055444824",
    appId: "1:442055444824:web:1722e67e11497edd2afd2d",
    measurementId: "G-M7MQHHR58B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
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
            await signInWithPopup(auth, provider);
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

    // PANTALLA DE LOGIN (Se muestra para todo si no hay sesión)
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
        { id: 'libros', titulo: 'Editor de Libros', icono: <BookOpen className="w-6 h-6 text-blue-600" />, color: 'bg-blue-50 hover:border-blue-300 text-blue-600', ruta: '/libros', adminOnly: true },
        { id: 'dashboard', titulo: 'Centro de Comando', icono: <BarChart3 className="w-6 h-6 text-purple-600" />, color: 'bg-purple-50 hover:border-purple-300 text-purple-600', ruta: '/dashboard', adminOnly: true },

        { id: 'database', titulo: 'Base de Datos (iNat)', icono: <Database className="w-6 h-6 text-amber-600" />, color: 'bg-amber-50 hover:border-amber-300 text-amber-600', ruta: '/database', adminOnly: true },
    ];

    return (
        <div className="flex h-screen bg-[#f8f9fa] font-sans overflow-hidden">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <Bird className="w-8 h-8 text-emerald-600" />
                        <span className="text-xl font-extrabold text-gray-800">Sabinas ID</span>
                    </div>
                    <button className="lg:hidden text-gray-500 hover:text-gray-800" onClick={() => setIsSidebarOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {isAdmin && <span className="mt-2 inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Admin</span>}
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Navegación</p>
                    {modulos.filter(m => !m.adminOnly || isAdmin).map((modulo) => {
                        const isActive = location.pathname === modulo.ruta;
                        return (
                            <button key={modulo.id} onClick={() => { navigate(modulo.ruta); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left group ${isActive ? modulo.color : 'hover:bg-gray-50'}`}>
                                <div className={`p-2 rounded-lg ${isActive ? 'bg-white shadow-sm' : modulo.color.split(' ')[0]}`}>{modulo.icono}</div>
                                <span className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>{modulo.titulo}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-semibold">
                        <LogOut className="w-5 h-5" /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL DINÁMICA */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:hidden z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
                        <span className="font-bold text-gray-800 text-lg">Sabinas ID</span>
                    </div>
                    <img src={user.photoURL || "https://via.placeholder.com/40"} alt="Perfil" className="w-8 h-8 rounded-full border border-gray-200" />
                </header>

                <div className="flex-1 overflow-y-auto bg-transparent relative">
                    {/* AQUÍ SE INYECTARÁN TUS MÓDULOS (Home, BirdApp, etc) */}
                    <Outlet context={{ user, isAdmin }} />
                </div>
            </main>
        </div>
    );
}