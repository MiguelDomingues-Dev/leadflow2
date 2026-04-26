@echo off
:: ============================================================
:: LeadFlow — Instalador Windows (Execute como ADMINISTRADOR)
:: ============================================================
setlocal EnableDelayedExpansion
echo.
echo  ====================================================
echo   LeadFlow — Configuracao de Servico Windows
echo  ====================================================
echo.

set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"

echo [1/6] Verificando dependencias...
python --version >nul 2>&1 || (echo [ERRO] Python nao encontrado. Instale em https://python.org & pause & exit /b 1)
node   --version >nul 2>&1 || (echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org & pause & exit /b 1)
echo  OK  Python e Node.js encontrados

:: Instalar NSSM se necessario
where nssm >nul 2>&1
if errorlevel 1 (
    echo Baixando NSSM...
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile '%TEMP%\nssm.zip'"
    powershell -Command "Expand-Archive -Path '%TEMP%\nssm.zip' -DestinationPath '%TEMP%\nssm' -Force"
    copy "%TEMP%\nssm\nssm-2.24\win64\nssm.exe" "%SystemRoot%\System32\nssm.exe" >nul
    echo  OK  NSSM instalado
)

echo.
echo [2/6] Configurando backend Python...
cd /d "%BACKEND_DIR%"
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo  OK  Dependencias Python instaladas

echo.
echo [3/6] Configurando .env...
if not exist "%BACKEND_DIR%\.env" (
    copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    echo  IMPORTANTE: Edite o .env com sua senha MySQL:
    echo  %BACKEND_DIR%\.env
    notepad "%BACKEND_DIR%\.env"
)

echo.
echo [4/6] Detectando IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set "LOCAL_IP=%%a" & goto :got_ip
)
:got_ip
set "LOCAL_IP=%LOCAL_IP: =%"
echo  IP Local: %LOCAL_IP%

echo.
echo [5/6] Configurando frontend e build...
cd /d "%FRONTEND_DIR%"
echo VITE_API_URL=http://%LOCAL_IP%:4031/api > .env
npm install --silent
npm run build --silent
npm install -g serve --silent 2>nul
for /f "tokens=*" %%i in ('where serve') do set "SERVE_PATH=%%i"
echo  OK  Build do frontend gerado

echo.
echo [6/6] Registrando servicos Windows...
mkdir "%BACKEND_DIR%\logs"  >nul 2>&1
mkdir "%FRONTEND_DIR%\logs" >nul 2>&1

:: Backend
nssm stop   LeadFlow-Backend >nul 2>&1
nssm remove LeadFlow-Backend confirm >nul 2>&1
nssm install LeadFlow-Backend "%BACKEND_DIR%\venv\Scripts\python.exe"
nssm set LeadFlow-Backend AppParameters "%BACKEND_DIR%\app.py"
nssm set LeadFlow-Backend AppDirectory  "%BACKEND_DIR%"
nssm set LeadFlow-Backend DisplayName   "LeadFlow Backend (Flask)"
nssm set LeadFlow-Backend Start         SERVICE_AUTO_START
nssm set LeadFlow-Backend AppStdout     "%BACKEND_DIR%\logs\backend.log"
nssm set LeadFlow-Backend AppStderr     "%BACKEND_DIR%\logs\erros.log"
nssm set LeadFlow-Backend AppRotateFiles 1
nssm start LeadFlow-Backend
echo  OK  Backend registrado (porta 4031)

:: Frontend
nssm stop   LeadFlow-Frontend >nul 2>&1
nssm remove LeadFlow-Frontend confirm >nul 2>&1
nssm install LeadFlow-Frontend "%SERVE_PATH%"
nssm set LeadFlow-Frontend AppParameters "dist -l 4030 --no-clipboard"
nssm set LeadFlow-Frontend AppDirectory  "%FRONTEND_DIR%"
nssm set LeadFlow-Frontend DisplayName   "LeadFlow Frontend (React)"
nssm set LeadFlow-Frontend Start         SERVICE_AUTO_START
nssm set LeadFlow-Frontend AppStdout     "%FRONTEND_DIR%\logs\frontend.log"
nssm set LeadFlow-Frontend AppStderr     "%FRONTEND_DIR%\logs\frontend_erros.log"
nssm start LeadFlow-Frontend
echo  OK  Frontend registrado (porta 4030)

:: Firewall
netsh advfirewall firewall add rule name="LeadFlow Backend"  dir=in action=allow protocol=TCP localport=4031 >nul 2>&1
netsh advfirewall firewall add rule name="LeadFlow Frontend" dir=in action=allow protocol=TCP localport=4030 >nul 2>&1
echo  OK  Portas 4030 e 4031 liberadas no Firewall

echo.
echo  ====================================================
echo   Instalacao concluida!
echo  ====================================================
echo.
echo   Painel do gerente:  http://%LOCAL_IP%:4030
echo   Formulario vendedor: http://%LOCAL_IP%:4030/coletar
echo   API health:          http://%LOCAL_IP%:4031/api/health
echo.
echo   Servicos iniciam automaticamente com o Windows.
echo.
pause
