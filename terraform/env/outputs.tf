output "VPC_ID" {
  value = module.vpc.VPC_ID
}

output "app_repo_url" {
    value = module.ecr.app_registery_url
}

output "Private_subnet_1_id" {
    value = module.vpc.Private_subnet_ID_1
}

output "Private_subnet_2_id" {
    value = module.vpc.Private_subnet_ID_2
}

output "Private_subnet_3_id" {
    value = module.vpc.Private_subnet_ID_3
}

output "Pub_subnet_1_id" {
    value = module.vpc.Public_subnet_ID_1
}

output "Pub_subnet_2_id" {
    value = module.vpc.Public_subnet_ID_2
}

output "Pub_subnet_3_id" {
    value = module.vpc.Public_subnet_ID_3
}