@echo off
cd /d "%~dp0"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm is required. See README.md.
  pause
  exit /b 1
)
if not exist node_modules call pnpm install
start "" "http://127.0.0.1:5173"
call pnpm dev --port 5173
pause
