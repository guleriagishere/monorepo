output "app_registery_url" {
    value = aws_ecr_repository.app.repository_url
}

output "ecr_repo_arn" {
    value = aws_ecr_repository.app.arn
}