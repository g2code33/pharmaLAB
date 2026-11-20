$ErrorActionPreference='Stop'
$items=@(Get-ChildItem src-tauri/target/release/bundle/nsis/*-setup.exe)
if($items.Count -ne 1){throw 'Expected exactly one NSIS installer'}
$file=$items[0]; $hash=(Get-FileHash $file).Hash
$dest=Join-Path $env:RUNNER_TEMP PharmaLabSmoke
$copy=Join-Path $env:RUNNER_TEMP $file.Name; Copy-Item $file $copy
if((Get-FileHash $copy).Hash -ne $hash){throw 'Checksum mismatch'}
if ($env:SIGN_STATE -eq 'signed' -and (Get-AuthenticodeSignature $copy).Status -ne 'Valid'){throw 'Installer signature invalid'}
$p=Start-Process $copy -ArgumentList "/S /D=$dest" -Wait -PassThru; if($p.ExitCode){throw "Install failed: $($p.ExitCode)"}
$exe=Get-Item "$dest/pharmalab.exe"; $v=(Get-Content package.json -Raw|ConvertFrom-Json).version
if(($exe.VersionInfo.ProductVersion -split '\+')[0] -notin @($v,"$v.0")){throw "Embedded version mismatch: $($exe.VersionInfo.ProductVersion)"}
if ($env:SIGN_STATE -eq 'signed' -and (Get-AuthenticodeSignature $exe.FullName).Status -ne 'Valid'){throw 'Application signature invalid'}
$b=[IO.File]::ReadAllBytes($exe.FullName); $pe=[BitConverter]::ToInt32($b,60); if([BitConverter]::ToUInt16($b,$pe+4) -ne 0x8664){throw 'Expected x64 PE'}
$app=Start-Process $exe.FullName -PassThru
try { $ok=$false; foreach($i in 1..60){Start-Sleep 1; $app.Refresh(); if($app.HasExited){throw 'App exited early'}; if($app.MainWindowTitle -eq 'PharmaLab' -and ((Test-Path "$env:APPDATA/org.pharmalab.workspace/pharmalab.db") -or (Test-Path "$env:LOCALAPPDATA/org.pharmalab.workspace/pharmalab.db"))){$ok=$true; break}}; if(!$ok){throw 'Window or initial SQLite database missing'} } finally {if(!$app.HasExited){Stop-Process -Id $app.Id}}
node scripts/stage.mjs windows $file.FullName $env:SIGN_STATE
exit $LASTEXITCODE
