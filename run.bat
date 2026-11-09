@echo off
title NeuroPlay Server
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo ==============================================
echo       Starting NeuroPlay Dev Server...
echo       Open your browser at: http://localhost:3000
echo ==============================================
call .\node_modules\.bin\tsx.cmd server/_core/index.ts
pause
