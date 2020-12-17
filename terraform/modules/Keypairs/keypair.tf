resource "aws_key_pair" "private_key" {
  key_name   = var.key_name
  public_key = var.public_key
}


