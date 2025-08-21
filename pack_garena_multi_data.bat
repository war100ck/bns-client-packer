@echo off
set NODE_OPTIONS=--max-old-space-size=4096

REM Указываем только нужные файлы, пути должны точно совпадать с клиентской структурой
node multi-app.js "contents/Local/GARENA/data/xml.dat" "contents/Local/GARENA/THAI/data/local.dat"

echo.
echo ==============================================
echo   Patch successfully created as Version 1
echo   Only selected files are included
echo ==============================================
pause
