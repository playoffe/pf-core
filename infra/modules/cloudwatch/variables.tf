variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "redis_cluster_id" {
  type        = string
  default     = null
  description = "ElastiCache cluster ID — null for staging (Redis sidecar has no CloudWatch metrics)"
}

variable "alert_email" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "ecs_log_group_name" {
  type        = string
  description = "CloudWatch log group name created by the ECS module — ensures metric filter is created after the log group"
}
