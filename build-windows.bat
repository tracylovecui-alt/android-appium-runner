@echo off
setlocal

echo Installing dependencies...
call npm install || exit /b 1

echo Building Windows executable...
call npm run build:exe || exit /b 1

echo Done. Check the release folder.
