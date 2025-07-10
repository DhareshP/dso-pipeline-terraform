
provider "aws" {
  region = "ap-south-1"  # or your region
}

resource "aws_s3_bucket" "logs_bucket" {
  bucket = var.logs_bucket_name

  tags = {
    Name = "Logs Bucket"
  }
}

resource "aws_instance" "my_ec2_instance" {
  ami                    = var.ami_id
  instance_type          = "t2.micro"
  # subnet_id              = var.subnet_id
  subnet_id = data.aws_subnet.default.id
  vpc_security_group_ids = [aws_security_group.ec2_sg-custom]

  # Uncomment below if you want SSH access
  # key_name = var.key_pair_name

  tags = {
    Name = "my-terraform-ec2"
  }
}

data "aws_vpc" "default" {
  default = true
}
resource "aws_security_group" "ec2_sg-custom" {
  name        = "ec2-sg-custom"
  description = "Allow SSH and HTTP"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ec2-sg"
  }
}
data "aws_subnet" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "availability-zone"
    values = ["ap-south-1a"] # ← Replace with an AZ that exists in your AWS account
  }
}




