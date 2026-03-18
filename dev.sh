#!/bin/bash

# Script para iniciar todo el ecosistema de Mesa Primera en Desarrollo
# Requiere que el entorno de Supabase esté activo

echo "🚀 Iniciando Mesa Primera: Stack Completa..."

# Matar procesos previos en los puertos clave (3000, 2567, 2568) de forma agresiva
echo "🧹 Limpiando puertos y procesos zombis..."
fuser -k 3000/tcp 2567/tcp 2568/tcp 2>/dev/null || true
lsof -ti :3000,2567,2568 | xargs kill -9 2>/dev/null || true
# Limpieza de procesos node específicos de desarrollo
ps aux | grep -E "ts-node-dev|next-dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 2

# Iniciar procesos en segundo plano
echo "🎮 Arrancando Servidores (Web + Game Server)..."
npm run dev --workspace=game-server &
npm run dev --workspace=web &

# Esperar a que los procesos terminen (o se cierren con Ctrl+C)
wait
