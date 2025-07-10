provider "aws" {
  region = var.aws_region
}

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
  # (Optional) Remote state in S3 + locking in DynamoDB:
  # backend "s3" {
  #   bucket         = var.tfstate_bucket
  #   key            = "terraform.tfstate"
  #   region         = var.aws_region
  #   dynamodb_table = var.tfstate_lock_table
  # }
}
