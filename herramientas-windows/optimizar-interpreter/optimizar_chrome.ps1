# Agrega --disable-features=UseEcoQoSForBackgroundProcess a tus accesos de Chrome
# para que Windows no ponga los procesos de Chrome en "Modo de eficiencia" (la hojita verde).
# Cierra Chrome antes de correrlo. No necesita permisos de administrador.
$flag = '--disable-features=UseEcoQoSForBackgroundProcess'
$feature = 'UseEcoQoSForBackgroundProcess'

function Add-Flag([string]$arguments) {
    if ($arguments -match [regex]::Escape($feature)) { return $arguments }
    if ($arguments -match '--disable-features=(\S+)') {
        return ($arguments -replace '--disable-features=(\S+)', "--disable-features=`$1,$feature")
    }
    return (($arguments + ' ' + $flag).Trim())
}

$folders = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('CommonDesktopDirectory'),
    [Environment]::GetFolderPath('Programs'),
    [Environment]::GetFolderPath('CommonPrograms'),
    (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

$shell = New-Object -ComObject WScript.Shell
$changed = 0; $already = 0
foreach ($folder in $folders) {
    foreach ($file in Get-ChildItem -LiteralPath $folder -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue) {
        try { $link = $shell.CreateShortcut($file.FullName) } catch { continue }
        $leaf = Split-Path -Leaf $link.TargetPath
        if ($leaf -eq 'chrome.exe') {
            $new = Add-Flag $link.Arguments
            if ($new -eq $link.Arguments) { $already++; continue }
            $link.Arguments = $new; $link.Save(); $changed++
            Write-Host "Listo: $($file.FullName)"
        }
        elseif ($leaf -eq 'Open-Chrome-And-Notes.exe') {
            # En este acceso los argumentos de Chrome viven en el archivo .config del iniciador.
            $configFile = "$($link.TargetPath).config"
            if (!(Test-Path -LiteralPath $configFile)) { continue }
            [xml]$xml = Get-Content -LiteralPath $configFile -Raw
            $entry = $xml.configuration.appSettings.add | Where-Object { $_.key -eq 'ChromeArguments' }
            if (!$entry) { continue }
            $new = Add-Flag $entry.value
            if ($new -eq $entry.value) { $already++; continue }
            Copy-Item -LiteralPath $configFile -Destination "$configFile.bak" -Force
            $entry.value = $new; $xml.Save($configFile); $changed++
            Write-Host "Listo (iniciador): $configFile"
        }
    }
}
Write-Host ''
Write-Host "Accesos cambiados: $changed. Ya estaban listos: $already."
Write-Host 'Para comprobar: abre Chrome desde un acceso, escribe chrome://version y mira "Linea de comandos".'
Write-Host 'Tambien apaga en Chrome > Configuracion > Sistema: "Seguir ejecutando aplicaciones en segundo plano al cerrar Chrome".'
