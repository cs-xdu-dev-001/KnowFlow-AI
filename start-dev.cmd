@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

if "%KNOWFLOW_BACKEND_PORT%"=="" set "KNOWFLOW_BACKEND_PORT=8010"
if "%KNOWFLOW_FRONTEND_HOST%"=="" set "KNOWFLOW_FRONTEND_HOST=127.0.0.1"
if "%KNOWFLOW_FRONTEND_PORT%"=="" set "KNOWFLOW_FRONTEND_PORT=5173"

set "VITE_BACKEND_URL=http://127.0.0.1:%KNOWFLOW_BACKEND_PORT%"
set "KNOWFLOW_BASE_URL=%VITE_BACKEND_URL%"
set "KNOWFLOW_FRONTEND_ORIGIN=http://%KNOWFLOW_FRONTEND_HOST%:%KNOWFLOW_FRONTEND_PORT%"
set "KNOWFLOW_OAUTH_RETURN_ORIGINS=%KNOWFLOW_FRONTEND_ORIGIN%"

rem Tool API keys are configured per user in Settings and are never loaded from this script.

if not exist "%BACKEND_DIR%\main.py" (
  echo [KnowFlow] Backend directory not found: "%BACKEND_DIR%"
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [KnowFlow] Frontend directory not found: "%FRONTEND_DIR%"
  exit /b 1
)

if /I "%~1"=="--check" (
  echo [KnowFlow] Backend directory:  "%BACKEND_DIR%"
  echo [KnowFlow] Frontend directory: "%FRONTEND_DIR%"
  echo [KnowFlow] Backend URL:        %VITE_BACKEND_URL%
  echo [KnowFlow] GitHub callback URL: %KNOWFLOW_BASE_URL%/api/auth/oauth/github/callback
  echo [KnowFlow] MCP callback URL:    %KNOWFLOW_BASE_URL%/api/mcp/oauth/callback
  echo [KnowFlow] OAuth return origin:%KNOWFLOW_OAUTH_RETURN_ORIGINS%
  echo [KnowFlow] Frontend target:    %KNOWFLOW_FRONTEND_ORIGIN%
  echo [KnowFlow] Backend command:    set KNOWFLOW_BASE_URL=%KNOWFLOW_BASE_URL% ^&^& set KNOWFLOW_OAUTH_RETURN_ORIGINS=%KNOWFLOW_OAUTH_RETURN_ORIGINS% ^&^& py -3 -m uvicorn main:app --reload --host 127.0.0.1 --port %KNOWFLOW_BACKEND_PORT%
  echo [KnowFlow] Frontend command:   npm run dev -- --host %KNOWFLOW_FRONTEND_HOST% --port %KNOWFLOW_FRONTEND_PORT% --strictPort
  exit /b 0
)

if /I "%~1"=="/check" (
  "%~f0" --check
  exit /b %ERRORLEVEL%
)

echo [KnowFlow] Backend:  %VITE_BACKEND_URL%
echo [KnowFlow] Frontend: %KNOWFLOW_FRONTEND_ORIGIN%
echo.
echo [KnowFlow] Opening two terminal windows. Keep both windows open while developing.
echo [KnowFlow] If the frontend port is busy, close the old Vite window or set KNOWFLOW_FRONTEND_PORT before retrying.
echo.

start "KnowFlow Backend :%KNOWFLOW_BACKEND_PORT%" /D "%BACKEND_DIR%" cmd /k "set KNOWFLOW_BASE_URL=%KNOWFLOW_BASE_URL%&& set KNOWFLOW_OAUTH_RETURN_ORIGINS=%KNOWFLOW_OAUTH_RETURN_ORIGINS%&& py -3 -m uvicorn main:app --reload --host 127.0.0.1 --port %KNOWFLOW_BACKEND_PORT%"

timeout /t 2 /nobreak >nul

start "KnowFlow Frontend :%KNOWFLOW_FRONTEND_PORT%" /D "%FRONTEND_DIR%" cmd /k "set VITE_BACKEND_URL=%VITE_BACKEND_URL%&& npm run dev -- --host %KNOWFLOW_FRONTEND_HOST% --port %KNOWFLOW_FRONTEND_PORT% --strictPort"

endlocal
