@echo off
setlocal
cd /d "%~dp0"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12 or newer and pnpm. See README.md.
  pause
  exit /b 1
)
if not exist node_modules (
  call pnpm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call pnpm dev --port 5173 --strictPort --open
pause
