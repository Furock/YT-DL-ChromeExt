@echo off
setlocal EnableDelayedExpansion

chcp 65001 >nul

@REM set pythonDL=https://www.python.org/ftp/python/3.13.3/python-3.13.3-amd64.exe
@REM set ffmpegDL=https://github.com/GyanD/codexffmpeg/releases/download/7.1.1/ffmpeg-7.1.1-essentials_build.zip
set pythonDL=http://127.0.0.1:8000/python-3.13.3-amd64.exe
set ffmpegDL=http://127.0.0.1:8000/ffmpeg-7.1.1-essentials_build.zip

REM choose download folder

set folder=D:\Programs

@REM powershell -STA -Command ^
@REM 	"Add-Type -AssemblyName System.Windows.Forms;"^
@REM 	"$fbd = New-Object System.Windows.Forms.FolderBrowserDialog;"^
@REM 	"$fbd.Description = 'Wähle den Installationspfad für YT-DLP, FFmpeg:';"^
@REM 	"$fbd.ShowNewFolderButton = $true;"^
@REM 	"if ($fbd.ShowDialog() -eq 'OK') {"^
@REM 	"	$fbd.SelectedPath"^
@REM 	"}" > folder.txt

@REM set folder=
@REM set file=folder.txt
@REM if exist !file! (
@REM 	set size=
@REM 	for /f %%a in ("!file!") do (
@REM 		set size=%%~za
@REM 	)
@REM 	if not !size! == 0 (
@REM 		set /p folder=< !file!
@REM 	)
@REM 	del !file!
@REM )


@REM echo "!folder!" 

set downloadPathFile=downloadPath.txt
powershell -command "(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path" > !downloadPathFile! 
set /p downloads=< !downloadPathFile!

python --version >nul 2>&1

if %errorlevel%==0 (
    echo Python is already installed.
) else (
    echo Python NOT found. Install python.
    set python=python-3.13.3-amd64.exe
    set file=!downloads!\!python!
    REM curl !pythonDL! -o file && file
)

ffmpeg -version >nul 2>&1
if %errorlevel%==0 (
    echo FFmpeg is already installed.
) else (
    echo FFmpeg NOT found. Install FFmpeg.
    set ffmpeg=ffmpeg-7.1.1-essentials_build
    set ffmpegFolder=!folder!\ffmpeg
    set zipFile=!downloads!\!ffmpeg!.zip
    @REM curl -L !ffmpegDL! -o !zipFile! ^
    @REM && powershell -Command "Expand-Archive -Path '!zipFile!' -DestinationPath '!ffmpegFolder!'" ^
    @REM && 
    powershell -Command "[Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH','User') + '!ffmpegFolder!\!ffmpeg!\bin;', 'User')"

    powershell -Command "[Environment]::GetEnvironmentVariable('PATH','User')" > envPath.txt
    type envPath.txt
    set /p path=<envPath.txt 
    del envPath.txt

    !ffmpegFolder!\!ffmpeg!\bin\ffmpeg -version 
    echo %errorlevel%
    REM >nul 2>&1
    if %errorlevel%==0 (
        echo FFmpeg successfully installed.
    ) else (
        echo FFmpeg not successfully installed. Please do it manually
    )
)

del !downloadPathFile!

echo Finished
pause