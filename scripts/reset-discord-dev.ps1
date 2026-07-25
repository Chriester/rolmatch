# ============================================================
# rolder · borra canales de Discord creados por el bot (SOLO dev)
# ============================================================
# DOS MODOS:
#   · Con -ChannelIds: borra SOLO esos canales (los ids salen de la
#     consulta previa de dev-reset.sql). Es el modo correcto habiendo
#     usuarios reales en la app.
#       .\scripts\reset-discord-dev.ps1 -Token "..." -ChannelIds id1,id2
#   · Sin -ChannelIds: purga TODOS los canales match-*/mesa-*/voz-* del
#     servidor — ⚠️ incluidos los de usuarios reales. Solo para resets
#     totales de un servidor de desarrollo.
#
# El token NO se guarda en ningún sitio: solo viaja a la API de Discord.

param(
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [string]$Guild = "1530123122349703168",
  [string[]]$ChannelIds = @()
)

# Discord exige TLS 1.2+ y un User-Agent con formato de bot; sin ellos
# responde "internal network error" (code 40333)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$headers = @{
  Authorization = "Bot $Token"
  "User-Agent"  = "DiscordBot (https://github.com/Chriester/rolmatch, 1.0)"
}
$patrones = @('match-*', 'mesa-*', 'voz-*')

$canales = Invoke-RestMethod -Uri "https://discord.com/api/v10/guilds/$Guild/channels" -Headers $headers

if ($ChannelIds.Count -gt 0) {
  # Modo quirúrgico: solo los ids indicados (y solo si existen en el guild)
  $objetivo = $canales | Where-Object { $ChannelIds -contains $_.id }
  Write-Host "Modo selectivo: $($objetivo.Count) de $($ChannelIds.Count) id(s) encontrados en el servidor."
} else {
  Write-Host "AVISO: sin -ChannelIds se borran TODOS los canales del bot,"
  Write-Host "incluidos los de usuarios reales. Ctrl+C para abortar (5 s)..."
  Start-Sleep -Seconds 5
  $objetivo = $canales | Where-Object {
    $nombre = $_.name
    ($patrones | Where-Object { $nombre -like $_ }).Count -gt 0
  }
}

if (-not $objetivo) {
  Write-Host "No hay canales del bot que borrar. Servidor limpio."
} else {
  Write-Host "Borrando $($objetivo.Count) canal(es)..."
  foreach ($canal in $objetivo) {
    Invoke-RestMethod -Method Delete -Uri "https://discord.com/api/v10/channels/$($canal.id)" -Headers $headers | Out-Null
    Write-Host "  borrado: $($canal.name)"
    Start-Sleep -Milliseconds 350  # respetar el rate limit de Discord
  }
  Write-Host "Hecho."
}

Write-Host ""
Write-Host "Recuerda: supabase/seed/dev-reset.sql en el SQL Editor resetea los"
Write-Host "bots (y su consulta previa te da los ids para -ChannelIds)."
