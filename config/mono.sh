#!/bin/bash

set +x
MESSAGE=$(git log -1 HEAD --pretty=format:%s)

  case "$MESSAGE" in
    *node*)
       echo "node pipeline."
       aws codepipeline start-pipeline-execution --name monorepo-nodeapp
        ;;
    *react*) 
        echo "React pipeline"
        aws codepipeline start-pipeline-execution --name monorepo-react
        ;; 
    *terraform*)  
        echo "Terraform pipeline."
        aws codepipeline start-pipeline-execution --name monorepo-terrci
        ;;
    default)
        echo "no matches"
        ;;
  esac
