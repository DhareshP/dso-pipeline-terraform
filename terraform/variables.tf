# ONLY DEFN HERE , REAL VALUES FO TO TFVARS

variable "aws_region" {
  default = "ap-south-1"
}

variable "logs_bucket_name" {
  description = "S3 bucket for logs or JAR uploads"
}

variable "ami_id" {
  description = "AMI ID for EC2 (Amazon Linux 2 or Ubuntu)"
}

variable "instance_type" {
  default = "t2.micro"
}

variable "subnet_id" {
  description = "Subnet where EC2 will be launched"
}

variable "vpc_id" {
  description = "VPC where resources will live"
}
