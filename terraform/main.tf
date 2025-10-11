terraform {
  required_version = ">= 1.0"

  # Mainly AWS some null resources for local-exec provisioners (docker build/push to ECR)
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Related to `terraform init -backend-config="..."` command, that is `backend.tfvars` file
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Account     = var.aws_account_id
      Region      = var.aws_region
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}
