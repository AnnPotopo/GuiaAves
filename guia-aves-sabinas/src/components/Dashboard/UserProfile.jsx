import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ArrowLeft, BookOpen, Loader2, Bookmark } from 'lucide-react';

export default function UserProfile() {
    const { usuarioId } = useParams();
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const qUser = query(collection(db, "usuarios"), where("uid", "==", usuarioId));
                const userSnap = await getDocs(qUser);
                if (!userSnap.empty) {
                    setProfileData(userSnap.docs[0].data());
                }

                const qBooks = query(
                    collection(db, "libros_publicados"),
                    where("authorId", "==", usuarioId),
                    where("visibilidad", "==", "publico")
                );
                const booksSnap = await getDocs(qBooks);
                let booksData = [];
                booksSnap.forEach(doc => booksData.push({ id: doc.id, ...doc.data() }));

                booksData.sort((a, b) => b.createdAt - a.createdAt);
                setBooks(booksData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [usuarioId]);

    if (loading) return <div className="h-full flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>;

    const displayCover = profileData?.coverUrl || "";
    const displayAvatar = profileData?.avatarUrl || "https://via.placeholder.com/150";
    const displayName = profileData?.displayName || (books.length > 0 ? books[0].authorName : "Investigador Ciudadano");

    return (
        <div className="h-full bg-gray-50 flex flex-col font-sans overflow-y-auto pb-20 relative">
            <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-md transition shadow-lg"><ArrowLeft className="w-6 h-6" /></button>

            <div className="w-full shrink-0 bg-white border-b border-gray-200 pb-6">
                <div className="relative w-full h-48 md:h-64 bg-slate-800">
                    {displayCover ? <img src={displayCover} alt="Portada" className="w-full h-full object-cover opacity-70" /> : <div className="w-full h-full bg-gradient-to-r from-emerald-900 to-slate-900" />}
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-4 flex items-center gap-4">
                    <img src={displayAvatar} alt="Avatar" className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md object-cover bg-white shrink-0 -mt-12 md:-mt-16 relative z-10" />
                    <div>
                        <h1 className="text-2xl font-black text-gray-800">{displayName}</h1>
                        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block mt-1">Perfil Público</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 mt-10 flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><BookOpen className="w-5 h-5 text-gray-400" /> Publicaciones de {displayName.split(' ')[0]}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {books.map(book => (
                        <div key={book.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative w-full aspect-[3/4]">
                            <div onClick={() => navigate(`/visor/${book.id}`)} className="flex-1 bg-gray-100 relative overflow-hidden cursor-pointer">
                                {book.coverUrl ? <img src={book.coverUrl} alt="Portada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-200"><BookOpen className="w-12 h-12" /></div>}
                                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[90%] z-10">
                                    {book.categorias?.map(cat => <span key={cat} className="bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{cat}</span>)}
                                </div>
                            </div>
                            <div onClick={() => navigate(`/visor/${book.id}`)} className="p-3 bg-white border-t border-gray-100 shrink-0 cursor-pointer text-left">
                                <h3 className="font-bold text-gray-800 text-xs leading-tight mb-0.5 truncate group-hover:text-emerald-600 transition-colors">{book.titulo}</h3>
                                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold mt-2">
                                    <span>{new Date(book.createdAt).toLocaleDateString()}</span><span>👁️ {book.views || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {books.length === 0 && (
                    <div className="py-20 text-center text-gray-400 bg-white border border-gray-200 rounded-2xl p-6 mt-4">
                        <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">Este usuario aún no tiene publicaciones públicas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}