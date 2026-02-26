#!/bin/sh

git pull
npm run build
rm -rf ../k8s-offline/assets ../k8s-offline/kui.zip
cd ./dist && zip -r ./kui.zip ./*
cp ./kui.zip ../../k8s-offline/kodata/
cd ../../k8s-offline/kodata/ && unzip -o ./kui.zip
#cp -r ./dist/** ../k8s-offline/kodata/
