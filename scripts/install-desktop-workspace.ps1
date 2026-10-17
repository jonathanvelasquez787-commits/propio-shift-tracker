param(
    [Parameter(Mandatory = $true)][string]$ShortcutPath,
    [Parameter(Mandatory = $true)][string]$NotesFile,
    [Parameter(Mandatory = $true)][string]$BackupDirectory
)
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '../windows/Open-Chrome-And-Notes.cs'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$installDirectory = Join-Path $env:LOCALAPPDATA 'Propio Shift Tracker/startup'
$launcherPath = Join-Path $installDirectory 'Open-Chrome-And-Notes.exe'
$configPath = "$launcherPath.config"
foreach ($required in @($ShortcutPath, $NotesFile, $source, $compiler)) {
    if (!(Test-Path -LiteralPath $required -PathType Leaf)) { throw "Falta el archivo: $required" }
}
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcut = $shortcutShell.CreateShortcut((Resolve-Path -LiteralPath $ShortcutPath).Path)
$chromePath = $shortcut.TargetPath
$chromeArguments = $shortcut.Arguments
$chromeWorkingDirectory = $shortcut.WorkingDirectory
if ($chromePath -eq $launcherPath) {
    [xml]$previousConfiguration = Get-Content -LiteralPath $configPath -Raw
    $previousValues = @{}
    foreach ($entry in $previousConfiguration.configuration.appSettings.add) { $previousValues[$entry.key] = $entry.value }
    $chromePath = $previousValues.ChromePath
    $chromeArguments = $previousValues.ChromeArguments
    $chromeWorkingDirectory = $previousValues.ChromeWorkingDirectory
}
if ((Split-Path -Leaf $chromePath) -ne 'chrome.exe' -or !(Test-Path -LiteralPath $chromePath -PathType Leaf)) {
    throw 'El acceso debe apuntar a Chrome o al iniciador instalado previamente.'
}
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
Copy-Item -LiteralPath $ShortcutPath -Destination (Join-Path $BackupDirectory (Split-Path -Leaf $ShortcutPath))
New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
foreach ($existing in @($launcherPath, $configPath)) {
    if (Test-Path -LiteralPath $existing) { Copy-Item -LiteralPath $existing -Destination $BackupDirectory }
}
$candidatePath = Join-Path $installDirectory 'Open-Chrome-And-Notes.new.exe'
& $compiler /nologo /codepage:65001 /target:winexe /reference:System.Configuration.dll /reference:System.Windows.Forms.dll "/out:$candidatePath" $source
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el iniciador.' }
$settings = @{
    ChromePath = $chromePath
    ChromeArguments = $chromeArguments
    ChromeWorkingDirectory = $chromeWorkingDirectory
    NotesExecutable = (Join-Path $env:WINDIR 'System32/notepad.exe')
    NotesFile = (Resolve-Path -LiteralPath $NotesFile).Path
}
$writer = [System.Xml.XmlWriter]::Create("$candidatePath.config", (New-Object System.Xml.XmlWriterSettings -Property @{ Indent = $true }))
try {
    $writer.WriteStartDocument(); $writer.WriteStartElement('configuration'); $writer.WriteStartElement('appSettings')
    foreach ($key in $settings.Keys) {
        $writer.WriteStartElement('add'); $writer.WriteAttributeString('key', $key); $writer.WriteAttributeString('value', $settings[$key]); $writer.WriteEndElement()
    }
    $writer.WriteEndElement(); $writer.WriteEndElement(); $writer.WriteEndDocument()
} finally { $writer.Dispose() }
$verification = Start-Process -FilePath $candidatePath -ArgumentList '--verify' -WindowStyle Hidden -Wait -PassThru
if ($verification.ExitCode -ne 0) { throw 'La configuración del iniciador no es válida; el acceso original no se modificó.' }
Move-Item -LiteralPath $candidatePath -Destination $launcherPath -Force
Move-Item -LiteralPath "$candidatePath.config" -Destination $configPath -Force
$shortcut.TargetPath = $launcherPath
$shortcut.Arguments = ''
$shortcut.Save()
$saved = $shortcutShell.CreateShortcut((Resolve-Path -LiteralPath $ShortcutPath).Path)
if ($saved.TargetPath -ne $launcherPath -or $saved.Arguments -ne '') { throw 'No se pudo verificar el acceso guardado.' }
[pscustomobject]@{ Shortcut = $ShortcutPath; Target = $saved.TargetPath; ChromeArgumentsPreserved = $chromeArguments; NotesFile = $settings.NotesFile; Backup = $BackupDirectory } | ConvertTo-Json
