#!/bin/bash
# LeadFlow — Instalador Linux/macOS
# Execute: sudo bash instalar-linux.sh
set -e
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN} ✔  $1${NC}"; }
info() { echo -e "${BLUE} →  $1${NC}"; }

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
IS_MAC=false; [[ "$(uname)" == "Darwin" ]] && IS_MAC=true

echo ""
echo "  ================================================"
echo "   LeadFlow — Configuração de Serviço Automático"
echo "  ================================================"
echo ""

command -v python3 >/dev/null 2>&1 || { echo "Python3 necessário"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "Node.js necessário"; exit 1; }
ok "Dependências OK"

# IP local
if $IS_MAC; then
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
else
  LOCAL_IP=$(hostname -I | awk '{print $1}')
fi
info "IP local: $LOCAL_IP"

# Python env
info "Configurando ambiente Python..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
ok "Dependências Python instaladas"

# .env backend
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo -e "${YELLOW} ⚠  Edite $BACKEND_DIR/.env com sua senha MySQL${NC}"
  read -p "  Pressione ENTER após editar o .env..."
fi

# .env frontend
info "Configurando frontend para rede local..."
echo "VITE_API_URL=http://$LOCAL_IP:4031/api" > "$FRONTEND_DIR/.env"
ok "Frontend configurado para http://$LOCAL_IP:4030"

# Build
info "Instalando dependências e gerando build..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build
npm install -g serve --silent 2>/dev/null || true
SERVE_BIN=$(which serve 2>/dev/null || echo "$HOME/.npm-global/bin/serve")
ok "Build gerado"

mkdir -p "$BACKEND_DIR/logs" "$FRONTEND_DIR/logs"
PYTHON_BIN="$BACKEND_DIR/venv/bin/python"
CURRENT_USER=$(logname 2>/dev/null || echo "$SUDO_USER" || echo "$USER")

if $IS_MAC; then
  LAUNCH_DIR="$HOME/Library/LaunchAgents"
  mkdir -p "$LAUNCH_DIR"

  cat > "$LAUNCH_DIR/com.leadflow.backend.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key>             <string>com.leadflow.backend</string>
  <key>ProgramArguments</key>  <array><string>$PYTHON_BIN</string><string>$BACKEND_DIR/app.py</string></array>
  <key>WorkingDirectory</key>  <string>$BACKEND_DIR</string>
  <key>RunAtLoad</key>         <true/>
  <key>KeepAlive</key>         <true/>
  <key>StandardOutPath</key>   <string>$BACKEND_DIR/logs/backend.log</string>
  <key>StandardErrorPath</key> <string>$BACKEND_DIR/logs/erros.log</string>
</dict></plist>
EOF

  cat > "$LAUNCH_DIR/com.leadflow.frontend.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key>             <string>com.leadflow.frontend</string>
  <key>ProgramArguments</key>  <array><string>$SERVE_BIN</string><string>dist</string><string>-l</string><string>4030</string><string>--no-clipboard</string></array>
  <key>WorkingDirectory</key>  <string>$FRONTEND_DIR</string>
  <key>RunAtLoad</key>         <true/>
  <key>KeepAlive</key>         <true/>
  <key>StandardOutPath</key>   <string>$FRONTEND_DIR/logs/frontend.log</string>
  <key>StandardErrorPath</key> <string>$FRONTEND_DIR/logs/frontend_erros.log</string>
</dict></plist>
EOF

  launchctl unload "$LAUNCH_DIR/com.leadflow.backend.plist"  2>/dev/null || true
  launchctl unload "$LAUNCH_DIR/com.leadflow.frontend.plist" 2>/dev/null || true
  launchctl load   "$LAUNCH_DIR/com.leadflow.backend.plist"
  launchctl load   "$LAUNCH_DIR/com.leadflow.frontend.plist"
  ok "LaunchAgents criados e iniciados"
else
  cat > /etc/systemd/system/leadflow-backend.service << EOF
[Unit]
Description=LeadFlow Backend (Flask)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$BACKEND_DIR
ExecStart=$PYTHON_BIN $BACKEND_DIR/app.py
Restart=always
RestartSec=5
StandardOutput=append:$BACKEND_DIR/logs/backend.log
StandardError=append:$BACKEND_DIR/logs/erros.log

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/leadflow-frontend.service << EOF
[Unit]
Description=LeadFlow Frontend (React)
After=network.target leadflow-backend.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$FRONTEND_DIR
ExecStart=$SERVE_BIN dist -l 4030 --no-clipboard
Restart=always
RestartSec=5
StandardOutput=append:$FRONTEND_DIR/logs/frontend.log
StandardError=append:$FRONTEND_DIR/logs/frontend_erros.log

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable  leadflow-backend  leadflow-frontend
  systemctl restart leadflow-backend  leadflow-frontend
  ok "Serviços systemd criados e iniciados"

  # Firewall
  command -v ufw >/dev/null 2>&1 && { ufw allow 4030/tcp >/dev/null; ufw allow 4031/tcp >/dev/null; ok "Portas abertas (ufw)"; }
fi

echo ""
echo "  ================================================"
echo -e "   ${GREEN}Instalação concluída!${NC}"
echo "  ================================================"
echo ""
echo -e "   Painel do gerente:   ${BLUE}http://$LOCAL_IP:4030${NC}"
echo -e "   Formulário vendedor: ${BLUE}http://$LOCAL_IP:4030/coletar${NC}"
echo -e "   API health:          ${BLUE}http://$LOCAL_IP:4031/api/health${NC}"
echo ""
if $IS_MAC; then
  echo "   Gerenciar: launchctl stop/start com.leadflow.backend"
else
  echo "   Gerenciar: sudo systemctl restart leadflow-backend"
  echo "   Logs:      sudo journalctl -u leadflow-backend -f"
fi
echo ""
