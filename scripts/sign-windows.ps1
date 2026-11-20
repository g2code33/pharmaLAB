$ErrorActionPreference='Stop'
if(!$env:PFX -and !$env:PFX_PASS){'SIGN_STATE=unsigned' >> $env:GITHUB_ENV; Write-Output '::warning::No Windows certificate provided; installer will be labelled unsigned.'; 'Windows certificate unavailable: unsigned installer.' >> $env:GITHUB_STEP_SUMMARY; exit 0}
if(!$env:PFX -or !$env:PFX_PASS){throw 'Incomplete Windows signing credentials'}
$f=Join-Path $env:RUNNER_TEMP codesign.pfx
try { [IO.File]::WriteAllBytes($f,[Convert]::FromBase64String($env:PFX)); $cert=Import-PfxCertificate -FilePath $f -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString $env:PFX_PASS -AsPlainText -Force); $cfg=@{bundle=@{windows=@{certificateThumbprint=$cert.Thumbprint;digestAlgorithm='sha256';timestampUrl='http://timestamp.digicert.com'}}}; $cfg | ConvertTo-Json -Depth 4 | Set-Content "$env:RUNNER_TEMP/sign.json"; 'SIGN_STATE=signed' >> $env:GITHUB_ENV } finally {if(Test-Path $f){Remove-Item $f}}
