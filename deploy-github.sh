#!/bin/bash
# Script para fazer push para o GitHub

# Adicionar o remote do GitHub (se não existir)
git remote add github https://github.com/arrigowr2/kkfit.git 2>/dev/null || true

# Fazer push para o GitHub
git push github main

echo "Concluído! Verifique https://github.com/arrigowr2/kkfit"
