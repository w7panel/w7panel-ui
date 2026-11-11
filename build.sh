#!/bin/sh
set -e

git pull
npm run build
rm -rf ../w7panel-server/assets ../w7panel-server/kui.zip
cd ./dist && zip -r ./kui.zip ./*
cp ./kui.zip ../../w7panel-server/kodata/
cd ../../w7panel-server/kodata/ && unzip -o ./kui.zip
mkdir -p ./assets
cp ./logo.png ./assets/logo.png
#cp -r ./dist/** ../k8s-offline/kodata/
