@echo off
setlocal
title Optimizar Interpreter (captions)

REM ============================================================
REM  OPTIMIZAR INTERPRETER DESKTOP
REM  Hace doble clic y listo. Pide permisos de administrador solo.
REM ============================================================

REM --- Ruta del programa (cambiala si lo instalaste en otro lado) ---
set "EXE=C:\Users\Jonathan\AppData\Local\Programs\@interpreterdesktop\Interpreter.exe"

REM ------------------------------------------------------------
REM  Si no es administrador, se vuelve a abrir como administrador
REM ------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Pidiendo permisos de administrador...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ============================================================
echo   Aplicando ajustes para Interpreter...
echo ============================================================
echo.
echo IMPORTANTE: cierra la app Interpreter antes de continuar
echo (que no quede ningun "Interpreter.exe" en el Administrador de tareas).
echo.
pause

REM ------------------------------------------------------------
REM  1) PRIORIDAD ALTA PARA TODOS LOS PROCESOS Interpreter.exe
REM     Windows le aplica prioridad alta a cada proceso con ese
REM     nombre cada vez que se abre. Valor 3 = Alta.
REM     Es permanente (sobrevive a reinicios).
REM ------------------------------------------------------------
echo [1/4] Prioridad alta para Interpreter.exe...
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Interpreter.exe\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f

REM ------------------------------------------------------------
REM  2) DESACTIVAR EL AHORRO DE ENERGIA (Power Throttling)
REM     SOLO PARA ESTA APP. Evita que Windows la frene cuando
REM     esta en segundo plano. Tambien es permanente.
REM ------------------------------------------------------------
echo.
echo [2/4] Desactivando ahorro de energia para Interpreter.exe...
powercfg /powerthrottling disable /path "%EXE%"

REM ------------------------------------------------------------
REM  3) DESACTIVAR EL POWER THROTTLING EN TODO WINDOWS
REM     Evita que Windows ponga en "Modo de eficiencia" a
REM     cualquier programa. Requiere REINICIAR la PC para
REM     que tome efecto.
REM ------------------------------------------------------------
echo.
echo [3/4] Desactivando Power Throttling en todo el sistema...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 1 /f

REM ------------------------------------------------------------
REM  4) QUITAR EL "MODO DE EFICIENCIA" (hojita verde) DE CHROME
REM     Chrome lo pide el mismo (EcoQoS), por eso los ajustes de
REM     Windows de arriba no alcanzan. Este paso agrega la opcion
REM     --disable-features=UseEcoQoSForBackgroundProcess a tus
REM     accesos de Chrome (escritorio, menu Inicio, barra de tareas
REM     y el iniciador de Notas). CIERRA CHROME ANTES.
REM ------------------------------------------------------------
echo.
echo [4/4] Quitando el modo de eficiencia de Chrome (cierra Chrome antes)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0optimizar_chrome.ps1"

echo.
echo ============================================================
echo   LISTO. Todo aplicado.
echo ============================================================
echo.
echo  - Los puntos 1 y 2 funcionan al abrir la app de nuevo.
echo  - El punto 3 necesita REINICIAR la PC.
echo  - El punto 4: abre Chrome desde tu acceso y escribe chrome://version
echo    para ver la opcion en "Linea de comandos".
echo.
echo  Para comprobar: Administrador de tareas ^> Detalles ^>
echo  columna "Prioridad base" debe decir "Alta".
echo.
pause
exit /b

REM ============================================================
REM  PARA DESHACER TODO (copia estas lineas en un CMD como
REM  administrador, sin la palabra REM):
REM
REM  reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Interpreter.exe\PerfOptions" /f
REM  powercfg /powerthrottling reset /path "C:\Users\Jonathan\AppData\Local\Programs\@interpreterdesktop\Interpreter.exe"
REM  reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" /v PowerThrottlingOff /f
REM  (Punto 4: quita a mano "--disable-features=UseEcoQoSForBackgroundProcess" de las Propiedades del acceso de Chrome.)
REM ============================================================
