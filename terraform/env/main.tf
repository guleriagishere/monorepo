terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.11"
    }
  }
}


provider "aws" {
  shared_credentials_file           = ".credentials"
  profile                           =   "default"
  region                            =   local.aws_region
}


module "keys" {
    source                          =      "../modules/Keypairs"
    key_name                        =       local.key_name
    public_key                      =       var.public_key    
}

module "vpc" {
    source                          =       "../modules/vpc"
    vpc_name                        =       local.vpc_name
    aws_region                      =       local.aws_region
    aws_cidr_block                  =       local.aws_cidr_block
    pub_subnet_1                    =       local.pub_subnet_1
    pub_subnet_2                    =       local.pub_subnet_2
    pub_subnet_3                    =       local.pub_subnet_3
    priv_subnet_1                   =       local.priv_subnet_1
    priv_subnet_2                   =       local.priv_subnet_2
    priv_subnet_3                   =       local.priv_subnet_3
}

module "alb" {
  source = "../modules/alb"
  alb_name                          =       "homeslav-alb"
  vpc_id                            =       module.vpc.VPC_ID
  alb_heath_check_code              =       200
  health_check_path                 =       "/"
  alb_listener_port                 =       80
  pub_subnet_1_id                   =       module.vpc.Public_subnet_ID_1
  pub_subnet_2_id                   =       module.vpc.Public_subnet_ID_2
  pub_subnet_3_id                   =       module.vpc.Public_subnet_ID_3
  SG_ALB_id                         =       module.security_groups.SG_priv_alb_id
}

module "security_groups" {
    source                          =     "../modules/securityGroups"  
    vpc_id                          =     module.vpc.VPC_ID
    SG_private_name                 =     "SG_private_Group"    
    aws_cidr_block                  =     local.aws_cidr_block   
    SG_ALB_name                     =     "SG for ALB" 
}

module "iam" {
  source = "../modules/iam"
}

module "ecr" {
    source                          =     "../modules/ecr"  
}

module "ecs" {
    source                          =     "../modules/ecs"  
    common_name                     =   "app-engy"
    VPC_ID                          =   module.vpc.VPC_ID
    aws_region                      =    local.aws_region
    ecs_cluster_name                =   "homeslab"
    ecr_repo_arn                    =   module.ecr.ecr_repo_arn
    green_tg                        =   module.alb.green_tg
    blue_tg                         =   module.alb.blue_tg
    aws_lb_listener_arn             =   module.alb.aws_lb_listener_arn
    app_registery_url               =   module.ecr.app_registery_url
    td_name                         =   "app"
    container_port                  =   80
    ecs_task_sg                     =   module.security_groups.SG_priv_alb_id
    cloudwatch_group_name           =      "/ecs/fargate-task-definition-new"    
    # iam_role_arn                    =     module.iam.
    # task_role_arn                   =     module.iam.
    ecs_task_execution_role         =   module.iam.ecs_task_execution_role
    alb_tg_arn                      =   module.alb.aws_lb_target_group_arn
    priv_subnet_1                   =   module.vpc.Private_subnet_ID_1
    priv_subnet_2                   =   module.vpc.Private_subnet_ID_2
    priv_subnet_3                   =   module.vpc.Private_subnet_ID_3      
}

module "cloudwatch" {
    source                          =      "../modules/cloudwatch"  
    cloudwatch_group_name           =      "/ecs/fargate-task-definition-new"
}