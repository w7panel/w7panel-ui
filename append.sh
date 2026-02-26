#!/bin/sh


npm run build
rm -rf ./var
mkdir -p ./var/run/ko
cp -r ./dist/** ./var/run/ko/
tar -cvf archive.tar ./var
# http://dashboard.jm.local.aichuang.team/app/apps
# ccr.ccs.tencentyun.com/afan/k8s-offline:0.1.240-arm

crane append --base ccr.ccs.tencentyun.com/afan/k8s-offline:1.0.25 -t=ccr.ccs.tencentyun.com/afan/k8s-offline:1.0.25-1 -f ./archive.tar

rm -rf ./var ./archive.tar

