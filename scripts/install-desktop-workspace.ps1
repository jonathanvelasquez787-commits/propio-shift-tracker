param(
    [string]$ShortcutPath,
    [string]$NotesFile,
    [string]$BackupDirectory,
    [ValidateRange(.4, .85)][double]$RightPaneHeightRatio = .612,
    [ValidateRange(.25, .5)][double]$RightPaneWidthRatio = .3125,
    [string]$NotesStartupShortcut,
    [string]$ConfigurationPath,
    [string]$InstallDirectory,
    [switch]$PlanOnly
)
$ErrorActionPreference = 'Stop'
if ($ConfigurationPath) {
    $configuration = Get-Content -LiteralPath $ConfigurationPath -Raw | ConvertFrom-Json
    if ($configuration.version -ne 1) { throw 'La versión de configuración no es compatible.' }
    if (!$PSBoundParameters.ContainsKey('ShortcutPath')) { $ShortcutPath = [string]$configuration.ShortcutPath }
    if (!$PSBoundParameters.ContainsKey('NotesFile')) { $NotesFile = [string]$configuration.NotesFile }
    if (!$PSBoundParameters.ContainsKey('RightPaneHeightRatio')) { $RightPaneHeightRatio = [double]$configuration.RightPaneHeightRatio }
    if (!$PSBoundParameters.ContainsKey('RightPaneWidthRatio') -and $null -ne $configuration.RightPaneWidthRatio) { $RightPaneWidthRatio = [double]$configuration.RightPaneWidthRatio }
}
if (!$ShortcutPath -or !$NotesFile) { throw 'Seleccioná el acceso de Chrome y el archivo de notas de esta PC.' }
if ([double]::IsNaN($RightPaneHeightRatio) -or [double]::IsInfinity($RightPaneHeightRatio) -or $RightPaneHeightRatio -lt .4 -or $RightPaneHeightRatio -gt .85 -or
    [double]::IsNaN($RightPaneWidthRatio) -or [double]::IsInfinity($RightPaneWidthRatio) -or $RightPaneWidthRatio -lt .25 -or $RightPaneWidthRatio -gt .5) { throw 'Los tamaños de las ventanas no son válidos.' }
$source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../windows/Open-Chrome-And-Notes.cs'))
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!$InstallDirectory) { $InstallDirectory = Join-Path $env:USERPROFILE 'Documents/Propio Workspace' }
$installDirectory = [System.IO.Path]::GetFullPath($InstallDirectory)
if (!$BackupDirectory) { $BackupDirectory = Join-Path $installDirectory ('backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss-ffff')) }
$launcherPath = Join-Path $installDirectory 'Open-Chrome-And-Notes.exe'
$configPath = "$launcherPath.config"
$requiredFiles = @($ShortcutPath, $NotesFile, $source, $compiler)
if ($NotesStartupShortcut) { $requiredFiles += $NotesStartupShortcut }
foreach ($required in $requiredFiles) {
    if (!(Test-Path -LiteralPath $required -PathType Leaf)) { throw "Falta el archivo: $required" }
}
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcut = $shortcutShell.CreateShortcut((Resolve-Path -LiteralPath $ShortcutPath).Path)
$chromePath = $shortcut.TargetPath
$chromeArguments = $shortcut.Arguments
$chromeWorkingDirectory = $shortcut.WorkingDirectory
if ((Split-Path -Leaf $chromePath) -eq 'Open-Chrome-And-Notes.exe') {
    [xml]$previousConfiguration = Get-Content -LiteralPath "$chromePath.config" -Raw
    $previousValues = @{}
    foreach ($entry in $previousConfiguration.configuration.appSettings.add) { $previousValues[$entry.key] = $entry.value }
    $chromePath = $previousValues.ChromePath
    $chromeArguments = $previousValues.ChromeArguments
    $chromeWorkingDirectory = $previousValues.ChromeWorkingDirectory
}
if ((Split-Path -Leaf $chromePath) -ne 'chrome.exe' -or !(Test-Path -LiteralPath $chromePath -PathType Leaf)) {
    throw 'El acceso debe apuntar a Chrome o al iniciador instalado previamente.'
}
if ($PlanOnly) {
    [pscustomobject]@{ Mode = 'Preview'; Shortcut = $ShortcutPath; ChromePath = $chromePath; ChromeArgumentsPreserved = $chromeArguments;
        NotesFile = (Resolve-Path -LiteralPath $NotesFile).Path; InstallDirectory = $installDirectory; Backup = $BackupDirectory;
        RightPaneHeightRatio = $RightPaneHeightRatio; RightPaneWidthRatio = $RightPaneWidthRatio; NotesContentRead = $false } | ConvertTo-Json
    return
}
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
Copy-Item -LiteralPath $ShortcutPath -Destination (Join-Path $BackupDirectory (Split-Path -Leaf $ShortcutPath))
if ($NotesStartupShortcut) {
    if ((Split-Path -Leaf $NotesStartupShortcut) -eq (Split-Path -Leaf $ShortcutPath)) { throw 'Los dos accesos necesitan nombres distintos para conservar sus respaldos.' }
    Copy-Item -LiteralPath $NotesStartupShortcut -Destination (Join-Path $BackupDirectory (Split-Path -Leaf $NotesStartupShortcut))
}
New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
foreach ($existing in @($launcherPath, $configPath)) {
    if (Test-Path -LiteralPath $existing) { Copy-Item -LiteralPath $existing -Destination $BackupDirectory }
}
$candidatePath = Join-Path $installDirectory 'Open-Chrome-And-Notes.new.exe'
& $compiler /nologo /codepage:65001 /target:winexe /reference:System.Configuration.dll /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "/out:$candidatePath" $source
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el iniciador.' }
$settings = @{
    ChromePath = $chromePath
    ChromeArguments = $chromeArguments
    ChromeWorkingDirectory = $chromeWorkingDirectory
    NotesExecutable = (Join-Path $env:WINDIR 'System32/notepad.exe')
    NotesFile = (Resolve-Path -LiteralPath $NotesFile).Path
    RightPaneHeightRatio = $RightPaneHeightRatio.ToString([System.Globalization.CultureInfo]::InvariantCulture)
    RightPaneWidthRatio = $RightPaneWidthRatio.ToString([System.Globalization.CultureInfo]::InvariantCulture)
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
try {
Move-Item -LiteralPath $candidatePath -Destination $launcherPath -Force
Move-Item -LiteralPath "$candidatePath.config" -Destination $configPath -Force
$shortcut.TargetPath = $launcherPath
$shortcut.Arguments = ''
$shortcut.Save()
$saved = $shortcutShell.CreateShortcut((Resolve-Path -LiteralPath $ShortcutPath).Path)
if ($saved.TargetPath -ne $launcherPath -or $saved.Arguments -ne '') { throw 'No se pudo verificar el acceso guardado.' }
if ($NotesStartupShortcut) {
    $notesStartup = $shortcutShell.CreateShortcut((Resolve-Path -LiteralPath $NotesStartupShortcut).Path)
    $notesStartup.TargetPath = $launcherPath
    $notesStartup.Arguments = '--notes-only'
    $notesStartup.IconLocation = "$($settings.NotesExecutable),0"
    $notesStartup.Save()
}
} catch {
    $installFailure = $_
    Copy-Item -LiteralPath (Join-Path $BackupDirectory (Split-Path -Leaf $ShortcutPath)) -Destination $ShortcutPath -Force
    if ($NotesStartupShortcut) { Copy-Item -LiteralPath (Join-Path $BackupDirectory (Split-Path -Leaf $NotesStartupShortcut)) -Destination $NotesStartupShortcut -Force }
    foreach ($previousFile in @($launcherPath, $configPath)) {
        $backupFile = Join-Path $BackupDirectory (Split-Path -Leaf $previousFile)
        if (Test-Path -LiteralPath $backupFile -PathType Leaf) { Copy-Item -LiteralPath $backupFile -Destination $previousFile -Force }
    }
    throw $installFailure
}
[pscustomobject]@{ Shortcut = $ShortcutPath; Target = $saved.TargetPath; ChromeArgumentsPreserved = $chromeArguments; NotesFile = $settings.NotesFile; Backup = $BackupDirectory } | ConvertTo-Json
