output "End_Point_To_connect_with_ALB" {
  value = aws_lb.priv.dns_name
}

output "priv_alb_id" {
  value = aws_lb.priv.id
}

output "aws_lb_target_group_arn" {
  value = aws_lb_target_group.priv[0].arn
}

output "aws_lb_listener_arn" {
  value = aws_lb_listener.front_end.arn
}

output "blue_tg" {
  value = "aws_lb_target_group.priv[0].name"
}

output "green_tg" {
  value = "aws_lb_target_group.priv[1].name"
}