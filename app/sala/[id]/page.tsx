'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const GUSTOS_MENU = [
  'Carne Suave',
  'Carne Cuchillo',
  'Jamón y Queso',
  'Pollo',
  'Humita / Choclo',
  'Verdura',
  'Roquefort con Apio',
  'Caprese'
];

export default function Sala() {
  const { id: salaId } = useParams();
  const [sala, setSala] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado del invitado
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [unido, setUnido] = useState(false);
  const [carritoInvitado, setCarritoInvitado] = useState<{ [key: string]: number }>({});

  // Estado del Dashboard (Todos los pedidos de la sala)
  const [todosLosPedidos, setTodosLosPedidos] = useState<any[]>([]);

  // 1. Cargar los datos de la sala de forma segura evitando errores de SSR
  useEffect(() => {
    async function cargarSala() {
      const { data, error } = await supabase
        .from('salas')
        .select('*')
        .eq('id', salaId)
        .single();

      if (error) {
        console.error(error);
        alert('No encontramos esta sala.');
      } else {
        setSala(data);
        
        // Verificación segura del lado del cliente para localStorage
        if (typeof window !== 'undefined') {
          const guardado = localStorage.getItem(`user_sala_${salaId}`);
          if (guardado) {
            setNombreUsuario(guardado);
            setUnido(true);
          }
        }
      }
      setLoading(false);
    }
    if (salaId) cargarSala();
  }, [salaId]);

  // 2. Cargar Pedidos iniciales y escuchar cambios en Tiempo Real con Supabase
  useEffect(() => {
    if (!salaId) return;

    const traerPedidos = async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('sala_id', salaId);
      if (data) setTodosLosPedidos(data);
    };

    traerPedidos();

    // Suscripción al canal de Realtime para actualizaciones automáticas
    const canal = supabase
      .channel(`sala-${salaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setTodosLosPedidos((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [salaId]);

  const modificarCantidad = (gusto: string, operacion: 'sumar' | 'restar') => {
    setCarritoInvitado((prev) => {
      const actual = prev[gusto] || 0;
      if (operacion === 'restar' && actual === 0) return prev;
      return { ...prev, [gusto]: operacion === 'sumar' ? actual + 1 : actual - 1 };
    });
  };

  const enviarPedido = async () => {
    if (!nombreUsuario.trim()) return alert('Poné tu nombre, che!');
    
    const itemsFiltrados = Object.entries(carritoInvitado).filter(([_, cant]) => cant > 0);
    if (itemsFiltrados.length === 0) return alert('¡No elegiste ninguna empanada!');

    const filasAInsertar = itemsFiltrados.map(([gusto, cantidad]) => ({
      sala_id: salaId,
      nombre_usuario: nombreUsuario.trim(),
      gusto,
      cantidad,
    }));

    const { error } = await supabase.from('pedidos').insert(filasAInsertar);

    if (error) {
      alert('Hubo un error al guardar tu pedido.');
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`user_sala_${salaId}`, nombreUsuario.trim());
      }
      setUnido(true);
    }
  };

  // --- CÓMPUTOS PARA EL DASHBOARD ---
  const totalesPorGusto = todosLosPedidos.reduce((acc: any, ped) => {
    acc[ped.gusto] = (acc[ped.gusto] || 0) + ped.cantidad;
    return acc;
  }, {});

  const totalesPorPersona = todosLosPedidos.reduce((acc: any, ped) => {
    acc[ped.nombre_usuario] = (acc[ped.nombre_usuario] || 0) + ped.cantidad;
    return acc;
  }, {});

  const cantidadTotalEmpanadas = todosLosPedidos.reduce((sum, ped) => sum + ped.cantidad, 0);

  const copiarResumenWhatsApp = () => {
    let texto = `📊 *Resumen de Pedido: ${sala?.nombre_sala}*\n`;
    texto += `---------------------------------\n`;
    Object.entries(totalesPorGusto).forEach(([gusto, cant]) => {
      texto += `• ${cant} ${gusto}\n`;
    });
    texto += `\n📦 *Total empanadas:* ${cantidadTotalEmpanadas}\n`;
    texto += `---------------------------------\n`;
    texto += `💰 *Cuentas (a transferir a ${sala?.creador}):*\n`;
    Object.entries(totalesPorPersona).forEach(([persona, cant]: any) => {
      texto += `• ${persona}: $${cant * sala?.precio_empanada} (${cant} emp.)\n`;
    });

    navigator.clipboard.writeText(texto);
    alert('¡Resumen copiado al portapapeles! Ya lo podés pegar en WhatsApp.');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-amber-50 text-slate-600">Cargando sala...</div>;

  // Verificamos si es el dueño para darle prioridad visual al panel oscuro
  const esAdmin = nombreUsuario.trim().toLowerCase() === sala?.creador.trim().toLowerCase();

  return (
    <main className="flex min-h-screen flex-col bg-amber-50 p-4 text-slate-800 items-center space-y-4">
      {/* TARJETA DE PEDIDO PARA INVITADOS */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-amber-100 relative overflow-hidden">
        
        {/* Burbuja de Precio Total Acumulado */}
        <div className="absolute top-3 right-3 bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-sm">
          Total: ${cantidadTotalEmpanadas * (sala?.precio_empanada || 0)}
        </div>

        {/* Encabezado con Botón de Copiar Link */}
        <div className="border-b border-slate-100 pb-4 mb-4 text-center relative pt-2">
          <span className="text-3xl">🥟</span>
          <h1 className="text-xl font-bold text-amber-900 mt-1">{sala.nombre_sala}</h1>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Anfitrión: {sala.creador} • Precio u.: ${sala.precio_empanada}</p>
          
          {/* Botón de Copiar Link Invitación */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href);
                alert('¡Link de invitación copiado! Mandaselo a tus amigos por WhatsApp. 🚀');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 hover:bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 transition"
          >
            🔗 Copiar Link de Invitación
          </button>
        </div>

        {!unido ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Tu nombre (Ej: Gabi)"
              className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-amber-500"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
            />
            <div className="space-y-2">
              {GUSTOS_MENU.map((gusto) => {
                const cantidad = carritoInvitado[gusto] || 0;
                return (
                  <div key={gusto} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{gusto}</span>
                    <div className="flex items-center space-x-3">
                      <button onClick={() => modificarCantidad(gusto, 'restar')} className="w-8 h-8 rounded-lg bg-white border font-bold text-slate-600 active:bg-slate-100 transition flex items-center justify-center">-</button>
                      <span className="w-4 text-center font-bold text-sm">{cantidad}</span>
                      <button onClick={() => modificarCantidad(gusto, 'sumar')} className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold active:bg-amber-600 transition flex items-center justify-center">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={enviarPedido} className="w-full rounded-lg bg-amber-600 p-3 font-semibold text-white transition hover:bg-amber-700">
              Confirmar Mi Pedido 🥟
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <span className="text-4xl">🎉</span>
            <h2 className="text-lg font-bold text-emerald-700 mt-2">¡Pedido Guardado!</h2>
            <p className="text-xs text-slate-400">Si sos el anfitrión, escribí tu nombre exacto arriba para activar el Dashboard.</p>
          </div>
        )}
      </div>

      {/* DASHBOARD EN TIEMPO REAL */}
      {(esAdmin || unido) && todosLosPedidos.length > 0 && (
        <div className="w-full max-w-md bg-slate-900 text-white rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
              📊 Tablero de Control {esAdmin && <span className="text-xs bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full font-bold">Admin</span>}
            </h2>
            <span className="text-sm font-bold bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">Total: {cantidadTotalEmpanadas}</span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Totales por Gusto:</h3>
            {Object.entries(totalesPorGusto).map(([gusto, cant]: any) => (
              <div key={gusto} className="flex justify-between text-sm bg-slate-800/50 px-3 py-2 rounded-lg">
                <span className="text-slate-300">{gusto}</span>
                <span className="font-bold text-amber-300">x{cant}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">¿Cuánto debe cada uno?:</h3>
            {Object.entries(totalesPorPersona).map(([persona, cant]: any) => (
              <div key={persona} className="flex justify-between text-xs text-slate-400">
                <span>{persona} ({cant} emp.)</span>
                <span className="font-semibold text-white">${cant * sala?.precio_empanada}</span>
              </div>
            ))}
          </div>

          <button
            onClick={copiarResumenWhatsApp}
            className="w-full mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 p-2.5 text-sm font-bold text-white transition flex items-center justify-center gap-2"
          >
            📋 Copiar Resumen para WhatsApp
          </button>
        </div>
      )}
    </main>
  );
}