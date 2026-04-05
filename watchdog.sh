#!/bin/bash

# Script para manter o servidor vivo e reiniciando automaticamente

LOG_FILE="/tmp/watchdog_server.log"
SERVER_URL="http://localhost:3000"
PROJECT_DIR="/home/z/my-project"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_server() {
    curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$SERVER_URL" 2>/dev/null
}

start_server() {
    cd "$PROJECT_DIR"
    # Matar processos antigos
    pkill -f "next dev" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    pkill -f "bun run dev" 2>/dev/null
    sleep 2
    
    # Iniciar novo servidor
    HOSTNAME=0.0.0.0 nohup bun run dev >> /tmp/server_output.log 2>&1 &
    disown
    
    sleep 5
    
    # Verificar se subiu
    NEW_STATUS=$(check_server)
    if [ "$NEW_STATUS" = "200" ]; then
        log "Servidor restaurado com sucesso!"
    else
        log "ERRO: Falha ao restaurar servidor"
    fi
}

# Loop principal
log "Iniciando watchdog..."
start_server

while true; do
    STATUS=$(check_server)
    
    if [ "$STATUS" != "200" ]; then
        log "Servidor DOWN (status: $STATUS). Reiniciando..."
        start_server
    fi
    
    sleep 5
done
