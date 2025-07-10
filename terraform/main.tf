resource "aws_s3_bucket" "logs_bucket" {
  bucket = var.logs_bucket_name

  tags = {
    Name = "Logs Bucket"
  }
}

resource "aws_security_group" "app_sg" {
  name        = "app-security-group"
  description = "Allow HTTP (8080) and SSH (22)"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "ec2-springboot-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "ec2_policy" {
  name = "ec2-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject"]
      Resource = "${aws_s3_bucket.logs_bucket.arn}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_instance" "app_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  key_name               = var.key_pair_name
  security_groups        = [aws_security_group.app_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name = "SpringBoot App Server"
  }

  user_data = <<-EOF
    #!/bin/bash
    yum install -y java-17-amazon-corretto
    aws s3 cp s3://${var.logs_bucket_name}/app.jar /home/ec2-user/app.jar
    nohup java -jar /home/ec2-user/app.jar > /home/ec2-user/app.log 2>&1 &
  EOF
}
