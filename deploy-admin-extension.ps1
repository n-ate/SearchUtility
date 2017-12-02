
$exclude = @('*.ps1', '*manifest.json', 'publish.zip') ## files, directories, or extensions to exclude
$manifest = 'admin-manifest.json' ## manifest fileName to include as manifest.json

$dir = (Get-Item -Path ".\" -Verbose).FullName
$deploy = $dir + '\deploy'

Write-Host Starting deploy...
Write-Host Exluding ($exclude -join ', ')...
Write-Host Manifest file name: $manifest
Write-Host

## delete previous deploy
if(Test-Path $deploy) 
{ 
    Write-Host ..deleting $deploy
    Remove-Item -Recurse -Force $deploy 
}
## copy files and directories
Get-ChildItem $dir -Recurse -Exclude $exclude | ForEach-Object `
{ 
    $ignore = $false
    Foreach($excl in $exclude)
    {
        if($_.FullName.StartsWith($dir + '\' + $excl))
        {
            $ignore = $true
            break
        }
    }
    if(-NOT $ignore)
    {
        Write-Host ..copying $_.FullName
        Copy-Item $_ -Destination (Join-Path $deploy $_.FullName.Substring($dir.length))
    }
}

## copy manifest file as manifest.json
Write-Host ..copying $dir\$manifest [as] manifest.json
Get-Item ($dir + '\' + $manifest) | Copy-Item -Destination ($deploy + '\manifest.json')


Write-Host
Write-Host Successfully deployed to $deploy.
Write-Host
Write-Host 'Press any key to close...';
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown');