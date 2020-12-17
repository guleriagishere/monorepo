resource "aws_lb" "priv" {
  name               = var.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.SG_ALB_id]
  subnets            = [var.pub_subnet_1_id, var.pub_subnet_2_id, var.pub_subnet_3_id]

  enable_deletion_protection = false

  tags = {
    Name = "ALB for Private server"      
    Environment = "Private"
  }
}


locals {
  target_groups = [
    "green",
    "blue",
  ]
}

# resource "aws_lb_target_group" "this" {
#   count = length(local.target_groups)

#   name = "example-tg-${element(local.target_groups, count.index)}"

#   port        = 80
#   protocol    = "HTTP"
#   vpc_id      = aws_vpc.this.id
#   target_type = "ip"

#   health_check {
#     path = "/"
#     port = 80
#   }
# }


resource "aws_lb_target_group" "priv" {
  count       = length(local.target_groups)
  name        = "TG-alb-for-priv-server"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "15"
    protocol            = "HTTP"
    matcher             = var.alb_heath_check_code
    timeout             = "3"
    path                = var.health_check_path
    unhealthy_threshold = "2"
  }

    depends_on = [aws_lb.priv]
}

# Redirect all traffic from the ALB to the target group
resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.priv.id
  port              = var.alb_listener_port
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_lb_target_group.priv[0].id
    type             = "forward"
  }

}


resource "aws_lb_listener_rule" "front_end" {
  listener_arn = aws_lb_listener.front_end.arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.priv[0].arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}