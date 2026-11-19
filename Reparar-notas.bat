@echo off
setlocal
cd /d "%~dp0"
set "CFG=%~dp0propio-workspace-configuration.json"
if not exist "%CFG%" set "CFG=%USERPROFILE%\Downloads\propio-workspace-configuration.json"
if not exist "%CFG%" (
  echo No encuentro el archivo propio-workspace-configuration.json
  echo.
  echo 1. Abre la extension, entra a "Notas y acceso al iniciar Windows"
  echo 2. Llena las dos rutas y toca "Preparar configuracion para Windows"
  echo 3. Vuelve a abrir este archivo
  echo.
  pause
  exit /b 1
)
echo Reparando el acceso de Chrome y las notas...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-workspace.ps1" -ConfigurationPath "%CFG%"
if errorlevel 1 (
  echo.
  echo No se pudo reparar. Tomale una foto a este mensaje y mandasela a Claude.
) else (
  echo.
  echo Listo. Ya puedes abrir Chrome con tu acceso de siempre.
)
echo.
pause
