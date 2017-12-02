
$dir = (Get-Item -Path ".\" -Verbose).FullName
$deploy = $dir + '\deploy'
$publish = $dir + '\publish.zip'

Write-Host Starting publish...

##verify deploy exists
if(Test-Path $deploy)
{
    Write-Host Found deploy directory...    
    Write-Host
    if(Test-Path $publish)
    {
        Write-Host ..deleting existing publish.zip
        Remove-Item -Recurse -Force $publish
    }
    Write-Host ..loading zip assembly
    Add-Type -Assembly 'system.io.compression.filesystem'
    Write-Host ..publishing deploy
    [io.compression.zipfile]::createFromDirectory($deploy, $publish)    
    Write-Host
    Write-Host Published deploy as $publish.
}
else
{
    Write-Host
    Write-Host No deploy directory found...
    Write-Host Expected, $deploy
    Write-Host
    Write-Host Publish aborted.
}


Write-Host
Write-Host 'Press any key to close...';
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown');