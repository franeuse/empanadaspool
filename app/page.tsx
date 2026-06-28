'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../app/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    creador: '',
    nombre_sala: '',
    precio_empanada: 1800,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creador.trim()) return alert('Poné tu nombre, che!');

    setLoading(true);

    const { data, error } = await supabase
      .from('salas')
      .insert([
        {
          nombre_sala: formData.nombre_sala.trim() || 'Pedido de Empanadas',
          creador: formData.creador.trim(),
          precio_empanada: formData.precio_empanada,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      alert('Error al crear la sala. Revisá la consola de Supabase.');
    } else if (data) {
      // Redirigir a la sala dinámica que crearemos en el próximo paso
      router.push(`/sala/${data.id}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-4 text-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-amber-100">
        <div className="text-center mb-6">
          <span className="text-4xl">🥟</span>
          <h1 className="text-2xl font-bold mt-2 text-amber-900">EmpanadaPool</h1>
          <p className="text-sm text-slate-500">Armá el carrito grupal y olvidate de sumar con papel y lápiz.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tu Nombre (Anfitrión)</label>
            <input
              type="text"
              required
              placeholder="Ej: Euse"
              className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              value={formData.creador}
              onChange={(e) => setFormData({ ...formData, creador: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Juntada (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Los 4 Fantásticos"
              className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              value={formData.nombre_sala}
              onChange={(e) => setFormData({ ...formData, nombre_sala: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio por Empanada ($)</label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              value={formData.precio_empanada}
              onChange={(e) => setFormData({ ...formData, precio_empanada: parseInt(e.target.value) || 0 })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 p-3 font-semibold text-white transition hover:bg-amber-700 disabled:bg-slate-300"
          >
            {loading ? 'Creando sala...' : 'Crear Carrito Colectivo 🚀'}
          </button>
        </form>
      </div>
    </main>
  );
}