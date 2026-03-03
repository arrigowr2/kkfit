@echo off
echo Fazendo push para o GitHub...
git remote add github https://github.com/arrigowr2/kkfit.git 2>nul
git push github main
echo.
echo Concluido! Verifique https://github.com/arrigowr2/kkfit
pause
