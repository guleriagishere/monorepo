output "VPC_ID" {
  value = aws_vpc.main.id
}

output "Public_subnet_ID_1" {
  value   =   aws_subnet.pub_subnet_1.id
}

output "Public_subnet_ID_2" {
  value   =   aws_subnet.pub_subnet_2.id
}

output "Public_subnet_ID_3" {
  value   =   aws_subnet.pub_subnet_3.id
}

output "Private_subnet_ID_1" {
  value   =   aws_subnet.priv_subnet_1.id
}


output "Private_subnet_ID_2" {
  value   =   aws_subnet.priv_subnet_2.id
}

output "Private_subnet_ID_3" {
  value   =   aws_subnet.priv_subnet_3.id
}