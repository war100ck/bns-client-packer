@echo off
echo Обработка всех данных GARENA (основных и THAI)...
node --max-old-space-size=4096 app.js "contents/Local/GARENA/data/"
node --max-old-space-size=4096 app.js "contents/Local/GARENA/THAI/data/"
echo Done! Check the logs above.
pause