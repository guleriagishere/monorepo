#!/bin/bash

set +x

MESSAGE=$(git log -1 HEAD --pretty=format:%s)

  case "$MESSAGE" in
    *node*)
        echo "node pipeline."
        echo "Uploading node data to s3 bucket."
        zip -r node.zip node-api
        aws s3 cp node.zip s3://monorepo-node-api/
        # aws codepipeline start-pipeline-execution --name monorepo-nodeapp
        ;;
    *react*) 
        echo "React pipeline"
        echo "Uploading react data to s3 bucket."
        zip -r react.zip react
        aws s3 cp react.zip s3://monorepo-react/        
        # aws codepipeline start-pipeline-execution --name monorepo-react
        ;; 
    *terraform*)  
        echo "Terraform pipeline."
        echo "Uploading terraform data to s3 bucket."
        zip -r terraform.zip terraform
        aws s3 cp terraform.zip s3://monorepo-bucket/          
        # aws codepipeline start-pipeline-execution --name monorepo-terrci
        ;;
    default)
        echo "no matches"
        ;;
  esac
