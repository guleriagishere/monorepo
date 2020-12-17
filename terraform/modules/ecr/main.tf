resource "aws_ecr_repository" "app" {
  name                 = "app-${terraform.workspace}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = {
    Name = "App registery ${terraform.workspace}"
    Environment = terraform.workspace
    }
}