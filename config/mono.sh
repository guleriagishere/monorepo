#!/bin/bash

if [ $(git show -s --format=%s | grep "node")  -gt 0 ]; then
    echo "trigger node app."
    echo "Uploading node data to s3 bucket."
    zip -r node.zip ../node-api
    aws s3 cp node.zip monorepo-bucket/
    # aws codepipeline start-pipeline-execution --name monorepo-nodeapp
elif [ $(git show -s --format=%s | grep "react")  -gt 0 ]; then
    echo "trigger react app."
    echo "Uploading react data to s3 bucket."
    zip -r react.zip ../react
    aws s3 cp react.zip monorepo-bucket/
    # aws codepipeline start-pipeline-execution --name monorepo-react
else 
    echo "trigger terraform app"
    echo "Uploading terraform data to s3 bucket."
    aws codepipeline start-pipeline-execution --name monorepo-terrci
fi


