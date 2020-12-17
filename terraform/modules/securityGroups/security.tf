resource "aws_security_group" "priv_alb" {
  vpc_id      = var.vpc_id    
  name        = var.SG_ALB_name
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_security_group" "private" {
  vpc_id    =   var.vpc_id
  name        = var.SG_private_name
  description = "Allow SSH to private host"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.aws_cidr_block]
  }
# Allow all traffic from Application Load balancer.
  ingress {
      protocol = "tcp"
      security_groups = [aws_security_group.priv_alb.id]
      from_port = 0
      to_port = 65535
  }
  ingress {
      protocol = "tcp"
      cidr_blocks = [var.aws_cidr_block]
      from_port = 0
      to_port = 65535
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8
    to_port     = 0
    protocol    = "icmp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "private server"
    Environment = "Private"
    }
}



