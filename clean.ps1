
$dir = (Get-Item -Path ".\" -Verbose).FullName
$deploy = $dir + '\deploy'
$publish = $dir + '\publish.zip'

Write-Host Starting clean...

##delete deploy
if(Test-Path $deploy)
{
    Write-Host ..deleting $deploy    
    Remove-Item -Recurse -Force $deploy
}
##delete publish
if(Test-Path $publish)
{
    Write-Host ..deleting $publish
    Remove-Item -Recurse -Force $publish
}


Write-Host
Write-Host Clean completed.