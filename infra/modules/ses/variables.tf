variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "domain" {
  description = "Domain to verify as an SES identity and restrict the sending policy to (e.g. playoffe.com)"
  type        = string
}
