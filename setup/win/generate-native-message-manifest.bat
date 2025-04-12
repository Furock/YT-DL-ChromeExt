@echo off
cd ../..
set name=furock.yt_dl_native_msg_host
set file=%CD%\yt-dl-native-msg-manifest.json

echo Generate %file%.
echo { > %file%
echo   "name": "%name%", >> %file%
echo   "description": "Native Messaging host for the yt-dl extension", >> %file%
echo   "path": "%CD:\=\\%\\nativeHost\\local.py", >> %file%
echo   "type": "stdio", >> %file%
echo   "allowed_origins": ["chrome-extension://klgpkoadmchcmppnchnnigeffjhdbifm/"] >> %file%
echo } >> %file%

echo Successfully generated.

echo Add to registry.
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\%name%" /ve /t REG_SZ /d "%file:\=\\%" /f
echo Successfully added.
pause