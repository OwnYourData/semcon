#!/bin/bash

cd ~/dev/semcon/dc-base
./build.sh --local --arm
docker rm -f dc
docker run -d --name dc -p 3500:3000 oydeu/dc-base:arm64v8

cd pytest