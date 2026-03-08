"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, AlertTriangle, ShieldCheck, Trophy } from 'lucide-react'

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 md:p-8 hide-scrollbar"
          >
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-900/90 backdrop-blur py-2 z-10">
              <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                <BookOpen className="text-emerald-500 w-8 h-8" />
                Reglamento de Primera
              </h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8 text-slate-300">
              {/* Introduction */}
              <section>
                <p className="text-lg leading-relaxed">
                  <strong>Primera</strong> es un juego de apuestas con baraja española donde el objetivo es lograr la mejor combinación de 4 cartas. El juego se divide en 5 fases de apuestas.
                </p>
              </section>

              {/* Fases del juego */}
              <section>
                <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                  Las Fases del Juego
                </h3>
                <ul className="space-y-3 list-decimal list-inside pl-2">
                  <li><strong>Pique Inicial (2 cartas):</strong> Se reparten 2 cartas. El jugador "Mano" apuesta primero. Puedes <em>Voy</em> o <em>Paso</em>.</li>
                  <li><strong>Completar (2 cartas extra):</strong> Quienes hayan dicho "Voy", reciben 2 cartas más (total 4).</li>
                  <li><strong>Descarte ("La Bajada"):</strong> Arrojas cartas que no te sirvan y robas nuevas del mazo para mejorar tu mano.</li>
                  <li><strong>El Farol (Guerra):</strong> Última ronda de apuestas fuertes con las 4 cartas definitivas.</li>
                  <li><strong>Showdown:</strong> Todos muestran sus cartas. Gana la mejor jerarquía.</li>
                </ul>
              </section>

              {/* Jerarquia */}
              <section>
                <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5" />
                  Jerarquía de Manos (De mayor a menor)
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h4 className="font-bold text-white text-lg">1. Segunda 🔥</h4>
                    <p className="text-sm mt-1">4 cartas del <strong>mismo palo</strong> (ej. 4 Copas). Es imbatible.</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h4 className="font-bold text-white text-lg">2. Chivo 🐐</h4>
                    <p className="text-sm mt-1">Tener en mano un <strong>As, un 6 y un 7</strong> del mismo palo (o cualquier palo acordado). Gana automáticamente contra Primera.</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h4 className="font-bold text-white text-lg">3. Primera ⭐</h4>
                    <p className="text-sm mt-1">Tener 4 cartas, <strong>una de cada palo distinto</strong> (Oros, Copas, Espadas, Bastos).</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h4 className="font-bold text-white text-lg">4. Mayor Puntaje (Puntos) 🔢</h4>
                    <p className="text-sm mt-1">Si nadie tiene las manos anteriores (o hay empate), se suman los valores de las cartas. Cartas del mismo palo que se repitan en Primera anulan la mano.</p>
                    <div className="mt-2 text-xs bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-400">
                      <strong>Valores de las cartas:</strong>
                      <br/> 7 = 21 pts | 6 = 18 pts | As = 16 pts | 5 = 15 pts | 4 = 14 pts | 3 = 13 pts | 2 = 12 pts
                    </div>
                  </div>
                </div>
              </section>

              {/* Warnings */}
              <section className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
                <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Reglas de Desconexión
                </h3>
                <p className="text-sm text-slate-300">
                  Si un jugador pierde la conexión a internet en medio de la partida, su mano se congela automáticamente. El jugador tiene exactamente <strong>5 minutos</strong> para regresar a la mesa usando el mismo enlace o reconectándose. Si no vuelve, el sistema abandonará su mano y perderá lo apostado.
                </p>
              </section>
            </div>
            
            {/* CTA */}
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <button 
                onClick={onClose}
                className="bg-emerald-500 text-slate-950 font-black px-10 py-4 rounded-full uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                ¡Entendido!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
