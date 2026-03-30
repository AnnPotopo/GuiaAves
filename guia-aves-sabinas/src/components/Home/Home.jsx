import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, Bird, LogOut, Loader2 } from 'lucide-react';
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

export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
            console.error("Error al iniciar sesión:", error);
            alert("Hubo un problema al iniciar sesión con Google.");
        }
    };

    const handleLogout = () => {
        signOut(auth);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    // --- PANTALLA DE LOGIN OBLIGATORIO ---
    if (!user) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 font-sans">
                <Bird className="w-20 h-20 text-emerald-600 mb-6 drop-shadow-md" />
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2 text-center">Sabinas ID</h1>
                <p className="text-gray-500 text-center mb-10 max-w-sm">
                    Descubre e identifica las aves de Sabinas Hidalgo. Inicia sesión para guardar tu colección en la nube.
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

    // --- PANTALLA PRINCIPAL (Usuario Logueado) ---
    const isAdmin = user.email === "potopo.ann@gmail.com";

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans relative">

            {/* Botón de Cerrar Sesión */}
            <button
                onClick={handleLogout}
                className="absolute top-6 right-6 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200"
            >
                <LogOut className="w-4 h-4" /> Salir
            </button>

            <div className="max-w-4xl w-full">
                <div className="text-center mb-12 mt-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4 flex items-center justify-center gap-3">
                        <Bird className="w-10 h-10 text-emerald-600" />
                        Hola, <span className="text-emerald-600">{user.displayName.split(' ')[0]}</span>
                    </h1>
                    <p className="text-gray-500">¿Qué te gustaría hacer hoy?</p>
                </div>

                {/* CONTENEDOR DE TARJETAS (Se adapta si hay 1 o 2) */}
                <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>

                    {/* TARJETA 1: IDENTIFICADOR (Pública) */}
                    <div
                        onClick={() => navigate('/birdapp')}
                        className="bg-white rounded-2xl p-8 cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 group"
                    >
                        <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
                            <Mic className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Identificador de Aves</h2>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Explora el bosque, graba cantos en tiempo real con IA y llena tu colección de avistamientos.
                        </p>
                    </div>

                    {/* TARJETA 2: EDITOR DE LIBROS (Solo ADMIN) */}
                    {isAdmin && (
                        <div
                            onClick={() => navigate('/libros')}
                            className="bg-white rounded-2xl p-8 cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 group relative overflow-hidden"
                        >
                            <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                Admin
                            </div>
                            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                                <BookOpen className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">Editor de Libros</h2>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Administra tus libros, diseña las páginas y exporta para imprenta.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}