resource "aws_cloudwatch_log_group" "app-td" {
  name =    var.cloudwatch_group_name
}

variable "cloudwatch_group_name" {}