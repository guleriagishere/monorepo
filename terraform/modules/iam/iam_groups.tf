resource "aws_iam_group" "admin" {
  name = "admin"
  path = "/"
}


resource "aws_iam_group" "devs" {
  name = "devs"
  path = "/"
}


resource "aws_iam_group" "devops" {
  name = "devops"
  path = "/"
}



resource "aws_iam_policy" "ProductionClusterReadAccess" {
  name        = "ProductionClusterReadAccess"
  path        = "/"
  description = "Allow Read only access to Production cluster."

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ecs:ListTasks",
                "ecs:DescribeContainerInstances",
                "ecs:DescribeTasks"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/homesalesclub-api-fargate-cluster"
                }
            }
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "ecs:Describe*",
                "ecs:List*"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/homesalesclub-api-fargate-cluster"
                }
            }
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": [
                "ecs:DescribeClusters",
                "ecs:ListClusters"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}


resource "aws_iam_policy" "DevClusterReadAccess" {
  name        = "DevClusterReadAccess"
  path        = "/"
  description = "Allow Read only access to Dev cluster."

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ecs:ListTasks",
                "ecs:DescribeContainerInstances",
                "ecs:DescribeTasks"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/hsc-api-cluster-dev"
                }
            }
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "ecs:Describe*",
                "ecs:List*"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/hsc-api-cluster-dev"
                }
            }
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": [
                "ecs:DescribeClusters",
                "ecs:ListClusters"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_policy" "CloudWatchReadOnlyAccess" {
  name        = "CloudWatchReadOnlyAccess"
  path        = "/"
  description = "Allow Read only access to Cloudwatch."

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:DescribeInsightRules",
        "cloudwatch:GetDashboard",
        "cloudwatch:GetInsightRuleReport",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "cloudwatch:DescribeAnomalyDetectors",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:ListDashboards",
        "cloudwatch:ListTagsForResource",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:GetMetricWidgetImage"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}



resource "aws_iam_policy" "ProductionClusterWriteAccess" {
  name        = "ProductionClusterWriteAccess"
  path        = "/"
  description = "Allow Read/Write access to Production cluster."

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ecs:PutAttributes",
                "ecs:UpdateContainerInstancesState",
                "ecs:StartTask",
                "ecs:DeleteService",
                "ecs:DeleteTaskSet",
                "ecs:UpdateService",
                "ecs:CreateService",
                "ecs:RunTask",
                "ecs:ListTasks",
                "ecs:UpdateContainerAgent",
                "ecs:StopTask",
                "ecs:UpdateServicePrimaryTaskSet",
                "ecs:DescribeContainerInstances",
                "ecs:DescribeTasks",
                "ecs:UpdateTaskSet",
                "ecs:CreateTaskSet"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/homesalesclub-api-fargate-cluster"
                }
            }
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "ecs:SubmitAttachmentStateChanges",
                "ecs:SubmitTaskStateChange",
                "ecs:UpdateClusterSettings",
                "ecs:Describe*",
                "ecs:RegisterTaskDefinition",
                "ecs:RegisterContainerInstance",
                "ecs:SubmitContainerStateChange",
                "ecs:DeregisterContainerInstance",
                "ecs:List*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": "ecs:ListContainerInstances",
            "Resource": "arn:aws:ecs:us-east-2:465464725359:cluster/homesalesclub-api-fargate-cluster"
        }
    ]
}
EOF
}

resource "aws_iam_policy" "DevClusterWriteAccess" {
  name        = "DevClusterWriteAccess"
  path        = "/"
  description = "Allow Read/Write access to production cluster."

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ecs:PutAttributes",
                "ecs:UpdateContainerInstancesState",
                "ecs:StartTask",
                "ecs:DeleteService",
                "ecs:DeleteTaskSet",
                "ecs:UpdateService",
                "ecs:CreateService",
                "ecs:RunTask",
                "ecs:ListTasks",
                "ecs:UpdateContainerAgent",
                "ecs:StopTask",
                "ecs:UpdateServicePrimaryTaskSet",
                "ecs:DescribeContainerInstances",
                "ecs:DescribeTasks",
                "ecs:UpdateTaskSet",
                "ecs:CreateTaskSet"
            ],
            "Resource": "*",
            "Condition": {
                "ArnEquals": {
                    "ecs:cluster": "arn:aws:ecs:us-east-2:465464725359:cluster/hsc-api-cluster-dev"
                }
            }
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "ecs:SubmitAttachmentStateChanges",
                "ecs:SubmitTaskStateChange",
                "ecs:UpdateClusterSettings",
                "ecs:Describe*",
                "ecs:RegisterTaskDefinition",
                "ecs:RegisterContainerInstance",
                "ecs:SubmitContainerStateChange",
                "ecs:DeregisterContainerInstance",
                "ecs:List*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": "ecs:ListContainerInstances",
            "Resource": "arn:aws:ecs:us-east-2:465464725359:cluster/hsc-api-cluster-dev"
        }
    ]
}
EOF
}


resource "aws_iam_group_policy_attachment" "admin_1" {
  group      = aws_iam_group.admin.name
  policy_arn = aws_iam_policy.ProductionClusterWriteAccess.arn
}

resource "aws_iam_group_policy_attachment" "admin_2" {
  group      = aws_iam_group.admin.name
  policy_arn = aws_iam_policy.DevClusterWriteAccess.arn
}

resource "aws_iam_group_policy_attachment" "admin_3" {
  group      = aws_iam_group.admin.name
  policy_arn = aws_iam_policy.CloudWatchReadOnlyAccess.arn
}


resource "aws_iam_group_policy_attachment" "devs_1" {
  group      = aws_iam_group.devs.name
  policy_arn = aws_iam_policy.ProductionClusterReadAccess.arn
}

resource "aws_iam_group_policy_attachment" "devs_2" {
  group      = aws_iam_group.devs.name
  policy_arn = aws_iam_policy.DevClusterReadAccess.arn
}

resource "aws_iam_group_policy_attachment" "devs_3" {
  group      = aws_iam_group.devs.name
  policy_arn = aws_iam_policy.CloudWatchReadOnlyAccess.arn
}

resource "aws_iam_group_policy_attachment" "devops_1" {
  group      = aws_iam_group.devops.name
  policy_arn = aws_iam_policy.ProductionClusterWriteAccess.arn
}

resource "aws_iam_group_policy_attachment" "devops_2" {
  group      = aws_iam_group.devops.name
  policy_arn = aws_iam_policy.DevClusterWriteAccess.arn
}

resource "aws_iam_group_policy_attachment" "devops_3" {
  group      = aws_iam_group.devops.name
  policy_arn = aws_iam_policy.CloudWatchReadOnlyAccess.arn
}