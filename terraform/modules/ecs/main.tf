resource "aws_ecs_cluster" "homeslab" {
  name = var.ecs_cluster_name
}


resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.homeslab.id
  task_definition = aws_ecs_task_definition.app_td.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  deployment_controller {
    type = "CODE_DEPLOY"
  }


  network_configuration {
    security_groups  = [var.ecs_task_sg]
    subnets          = [var.priv_subnet_1, var.priv_subnet_2]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_tg_arn
    container_name   = "app"
    container_port   = 80
  }

  # depends_on = [aws_lb_listener.https_forward, aws_iam_role_policy_attachment.ecs_task_execution_role]

  depends_on = [aws_ecs_task_definition.app_td]
  tags = {
    Environment = "dev"
    Application = "app"
  }
}


resource "aws_ecs_task_definition" "app_td" {
  family = var.td_name
  task_role_arn = var.ecs_task_execution_role
  execution_role_arn = var.ecs_task_execution_role
  requires_compatibilities = ["FARGATE"]
  network_mode = "awsvpc"
  cpu = 1024
  memory = 2048
  container_definitions = <<DEFINITION
[
  {
    "essential": true,
    "image": "httpd:2.4",
    "logConfiguration": { 
        "logDriver": "awslogs",
        "options": { 
        "awslogs-group" : "${var.cloudwatch_group_name}",
        "awslogs-region": "${var.aws_region}",
        "awslogs-stream-prefix": "ecs"
        }
    },
      "name": "${var.td_name}",
    "portMappings": [ 
    { 
        "containerPort": 80,
        "hostPort": 80,
        "protocol": "tcp"
        }
    ]
  }
] 
DEFINITION
}

# resource "aws_ecs_service" "main" {
#   name = var.ecs_svc_name
#   cluster = "${var.cluster}"
#   desired_count = 2
#   task_definition = "${aws_ecs_task_definition.main.family}:${max("${aws_ecs_task_definition.main.revision}", "${data.aws_ecs_task_definition.task.revision}")}"
#   iam_role = var.ecs-service-role-arn
# }