import Link from "next/link";

export default function PlayerPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 pt-20">
      <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md">
        Mesa <span className="text-green-400">Primera</span>
      </h1>
      
      <p className="text-lg text-green-100 max-w-md text-center">
        Bienvenido al juego de cartas en tiempo real. 
      </p>

      <div className="flex gap-4">
        <button className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
          Crear Mesa
        </button>
        <button className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-2xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 border-2 border-green-500">
          Unirse
        </button>
      </div>

      <div className="mt-12 text-sm text-green-300">
        <Link href="/admin" className="hover:underline opacity-50">
          Panel Admin
        </Link>
      </div>
    </div>
  );
}
