$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\RomuloMeloMouraLeite\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\SentinelaIA.lnk")
$Shortcut.TargetPath = "C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2\SENTINELA_HIDDEN.vbs"
$Shortcut.Save()
Write-Host "Atalho de Inicializacao criado com sucesso."
