$ErrorActionPreference = 'Stop'

$dir = Join-Path $PSScriptRoot 'supabase\migrations'
if (-not (Test-Path $dir)) {
  throw "Migrations folder not found: $dir"
}

# Renombra migraciones para cumplir patrón <timestamp>_name.sql y evitar versiones duplicadas.
# - Si el archivo empieza con 8 dígitos YYYYMMDD_, se convierte a YYYYMMDDHHMMSS_ (HHMMSS incremental por día)
# - Si NO tiene prefijo numérico, se le agrega un timestamp del día actual
# - Si ya tiene 14 dígitos al inicio, se deja igual

$files = Get-ChildItem -LiteralPath $dir -File | Sort-Object Name
$perDayCounter = @{}

function Next-HHMMSS([string]$day) {
  if (-not $perDayCounter.ContainsKey($day)) { $perDayCounter[$day] = 0 }
  $i = [int]$perDayCounter[$day]
  $perDayCounter[$day] = $i + 1
  # empezamos en 00:00:01, 00:00:02, ...
  $hh = 0
  $mm = 0
  $ss = $i + 1
  if ($ss -ge 60) {
    $mm = [math]::Floor($ss / 60)
    $ss = $ss % 60
  }
  if ($mm -ge 60) {
    $hh = [math]::Floor($mm / 60)
    $mm = $mm % 60
  }
  return ("{0:00}{1:00}{2:00}" -f $hh, $mm, $ss)
}

$renamePlan = @()

foreach ($f in $files) {
  $name = $f.Name
  $newName = $null

  if ($name -match '^\d{14}_.+\.sql$') {
    continue
  }

  if ($name -match '^(\d{8})_(.+\.sql)$') {
    $day = $Matches[1]
    $rest = $Matches[2]
    $hhmmss = Next-HHMMSS $day
    $newName = "$day$hhmmss`_$rest"
  } elseif ($name -match '^(\d{10})_(.+\.sql)$') {
    # Caso raro: YYYYMMDDHH_...
    $prefix = $Matches[1]
    $rest = $Matches[2]
    $day = $prefix.Substring(0,8)
    $hh = $prefix.Substring(8,2)
    $hhmmss = "${hh}0001"
    $newName = "$day$hhmmss`_$rest"
  } else {
    $day = (Get-Date -Format 'yyyyMMdd')
    $hhmmss = Next-HHMMSS $day
    $newName = "$day$hhmmss`_$name"
  }

  if ($newName -and $newName -ne $name) {
    $renamePlan += [PSCustomObject]@{ Old = $name; New = $newName }
  }
}

# Validar colisiones
$dupes = $renamePlan | Group-Object -Property New | Where-Object { $_.Count -gt 1 }
if ($dupes) {
  $msg = "Name collision detected after rename plan:\n" + ($dupes | ForEach-Object { $_.Name } | Out-String)
  throw $msg
}

Write-Host "Planned renames:" -ForegroundColor Cyan
$renamePlan | Format-Table -AutoSize

if ($renamePlan.Count -eq 0) {
  Write-Host "No renames needed." -ForegroundColor Green
  exit 0
}

if ($env:APPLY_RENAME -ne '1') {
  Write-Host "Preview only. To apply, run with APPLY_RENAME=1" -ForegroundColor Yellow
  exit 0
}

foreach ($p in $renamePlan) {
  $oldPath = Join-Path $dir $p.Old
  Rename-Item -LiteralPath $oldPath -NewName $p.New
}

Write-Host "Renames applied." -ForegroundColor Green
