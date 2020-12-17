variable "env_map" {
}

variable "env" {
  type = map(
    object({
      vpc_name_var                          = string
      key_name_var                          = string
      aws_region_var                        = string
      aws_cidr_block_var                    = string 
      pub_subnet_1_var                      = string 
      pub_subnet_2_var                      = string 
      pub_subnet_3_var                      = string 
      priv_subnet_1_var                     = string
      priv_subnet_2_var                     = string
      priv_subnet_3_var                     = string
    })
  )
}


locals {
      environment                           = lookup(var.env_map, terraform.workspace, "dev")
      vpc_name                              = var.env[local.environment].vpc_name_var
      key_name                              = var.env[local.environment].key_name_var
      aws_region                            = var.env[local.environment].aws_region_var
      aws_cidr_block                        = var.env[local.environment].aws_cidr_block_var 
      pub_subnet_1                          = var.env[local.environment].pub_subnet_1_var
      pub_subnet_2                          = var.env[local.environment].pub_subnet_2_var
      pub_subnet_3                          = var.env[local.environment].pub_subnet_3_var    
      priv_subnet_1                         = var.env[local.environment].priv_subnet_1_var
      priv_subnet_2                         = var.env[local.environment].priv_subnet_2_var
      priv_subnet_3                         = var.env[local.environment].priv_subnet_3_var
}

