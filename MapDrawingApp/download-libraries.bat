@echo off
echo ========================================
echo Map Drawing Application - Setup
echo ========================================
echo.

echo Checking for required directories...
if not exist "wwwroot\lib\bootstrap" mkdir wwwroot\lib\bootstrap
if not exist "wwwroot\lib\jquery" mkdir wwwroot\lib\jquery
if not exist "wwwroot\lib\konva" mkdir wwwroot\lib\konva
if not exist "wwwroot\lib\signalr" mkdir wwwroot\lib\signalr
if not exist "wwwroot\lib\bootstrap-icons\fonts" mkdir wwwroot\lib\bootstrap-icons\fonts

echo.
echo Downloading libraries...
echo.

echo [1/8] Downloading Bootstrap CSS...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css' -OutFile 'wwwroot/lib/bootstrap/bootstrap.min.css'"

echo [2/8] Downloading Bootstrap JS...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js' -OutFile 'wwwroot/lib/bootstrap/bootstrap.bundle.min.js'"

echo [3/8] Downloading jQuery...
powershell -Command "Invoke-WebRequest -Uri 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js' -OutFile 'wwwroot/lib/jquery/jquery.min.js'"

echo [4/8] Downloading Konva.js...
powershell -Command "Invoke-WebRequest -Uri 'https://unpkg.com/konva@8.4.3/konva.min.js' -OutFile 'wwwroot/lib/konva/konva.min.js'"

echo [5/8] Downloading SignalR...
powershell -Command "Invoke-WebRequest -Uri 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.1/signalr.min.js' -OutFile 'wwwroot/lib/signalr/signalr.min.js'"

echo [6/8] Downloading Bootstrap Icons CSS...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css' -OutFile 'wwwroot/lib/bootstrap-icons/bootstrap-icons.css'"

echo [7/8] Downloading Bootstrap Icons Font (WOFF)...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/fonts/bootstrap-icons.woff' -OutFile 'wwwroot/lib/bootstrap-icons/fonts/bootstrap-icons.woff'"

echo [8/8] Downloading Bootstrap Icons Font (WOFF2)...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/fonts/bootstrap-icons.woff2' -OutFile 'wwwroot/lib/bootstrap-icons/fonts/bootstrap-icons.woff2'"

echo.
echo ========================================
echo All libraries downloaded successfully!
echo ========================================
echo.
echo Library locations:
echo   - Bootstrap: wwwroot\lib\bootstrap\
echo   - jQuery: wwwroot\lib\jquery\
echo   - Konva.js: wwwroot\lib\konva\
echo   - SignalR: wwwroot\lib\signalr\
echo   - Bootstrap Icons: wwwroot\lib\bootstrap-icons\
echo.
echo You can now run the application with: dotnet run
echo.
pause
