@echo off
setlocal EnableExtensions
cd /d "%~dp0\..\.."
title Northline RP - Server Command Bridge
node scripts\server-bridge\command-bridge.mjs
pause
