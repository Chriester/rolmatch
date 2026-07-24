# ============================================================
# RolMatch · purga TODOS los canales creados por el bot (SOLO dev)
# ============================================================
# Borra los canales match-* (modelo antiguo), mesa-* y voz-* (modelo actual)
# del servidor comunitario. Paso 1 del reset completo; el paso 2 es SQL
# (ver instrucciones al final).
#
# Uso (desde la raíz del repo, con TU token del bot):
#   .\scripts\reset-discord-dev.ps1 -Token "TU_DISCORD_BOT_TOKEN"
#
# El token NO se guarda en ningún sitio: solo viaja a la API de Discord.

param(
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [string]$Guild = "1530123122349703168"
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

$objetivo = $canales | Where-Object {
  $nombre = $_.name
  ($patrones | Where-Object { $nombre -like $_ }).Count -gt 0
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
Write-Host "PASO 2 (obligatorio): en el SQL Editor de Supabase ejecuta"
Write-Host "supabase/seed/dev-reset.sql (resetea el mundo de prueba Y desvincula"
Write-Host "los canales borrados de todas las mesas)."
