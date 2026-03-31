#!/bin/bash
set -e

python3 build.py

cd public
git init
git add -A
git commit -m "deploy"
git push --force git@github.com:sandoogh/hafez-fal.ir.git master:gh-pages

echo "Deployed to gh-pages"
