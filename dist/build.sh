#!/usr/bin/env bash
if [ "$1" = "" ]; then
    app="sss"
else
    app=$1
fi

./build.py $app setUp
./.build.sh
./build.py $app tearDown
