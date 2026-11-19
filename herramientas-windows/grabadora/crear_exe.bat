@echo off
setlocal
cd /d "%~dp0"
title Creando Grabadora.exe

if not exist grabadora.pyw (
  echo No encuentro grabadora.pyw en esta carpeta.
  pause
  exit /b 1
)
if not exist grabadora.ico (
  echo No encuentro grabadora.ico en esta carpeta.
  pause
  exit /b 1
)

echo [1/4] Instalando librerias necesarias...
py -m pip install --quiet pyinstaller pystray pillow soundcard soundfile numpy
if errorlevel 1 goto error

echo [2/4] Creando el exe (puede tardar 1-3 minutos)...
copy /y grabadora.pyw grabadora_build.py >nul
py -m PyInstaller --noconsole --onefile --name Grabadora --icon grabadora.ico --hidden-import pystray._win32 --hidden-import _cffi_backend --collect-all soundcard --collect-all soundfile grabadora_build.py
if errorlevel 1 goto error
if not exist dist\Grabadora.exe goto error

echo [3/4] Instalando en tu usuario...
set "DEST=%LOCALAPPDATA%\Grabadora"
if not exist "%DEST%" mkdir "%DEST%"
copy /y dist\Grabadora.exe "%DEST%\Grabadora.exe" >nul
if errorlevel 1 (
  echo No pude copiar el exe. Cierra la Grabadora si esta abierta y vuelve a intentar.
  pause
  exit /b 1
)

echo [4/4] Creando accesos directos...
powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut($d+'\Grabadora.lnk'); $s.TargetPath='%DEST%\Grabadora.exe'; $s.IconLocation='%DEST%\Grabadora.exe'; $s.Save() }"

rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul
del /q Grabadora.spec 2>nul
del /q grabadora_build.py 2>nul

echo.
echo Listo. Ya tienes "Grabadora" en el escritorio y en el menu Inicio.
pause
exit /b 0

:error
echo.
echo Algo fallo. Copia el texto de arriba y pegaselo a Claude.
pause
exit /b 1
