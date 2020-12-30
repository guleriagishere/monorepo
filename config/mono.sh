#!/bin/bash

if [ $(git show -s --format=%s | grep "node")  -gt 0 ]; then
    echo "trigger node app."
    aws codepipeline start-pipeline-execution --name monorepo-nodeapp
elif [ $(git show -s --format=%s | grep "react")  -gt 0 ]; then
    echo "trigger react app."
    aws codepipeline start-pipeline-execution --name monorepo-react
else 
    echo "trigger terraform app"
    aws codepipeline start-pipeline-execution --name monorepo-terrci
fi


