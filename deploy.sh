#!/bin/bash
set -e

python3 build.py

cd public
git init -b gh-pages
git add -A
git commit -m "deploy"
git push --force git@github.com:sandoogh/hafez-fal.ir.git gh-pages

echo "Deployed to gh-pages"
