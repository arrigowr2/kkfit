#!/bin/bash
# Script para fazer push do código para o GitHub

echo "Adicionando remote do GitHub..."
git remote add github https://github.com/arrigowr2/kkfit.git

echo "Fazendo push para GitHub..."
git push github main

echo "Concluído!"
