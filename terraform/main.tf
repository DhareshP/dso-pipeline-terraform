resource "aws_s3_bucket" "logs_bucket" {
  bucket = var.logs_bucket_name

  tags = {
    Name = "Logs Bucket"
  }
}

resource "aws_instance" "my_ec2_instance" {
  ami                    = var.ami_id
  instance_type          = "t2.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  # Uncomment below if you want SSH access
  # key_name = var.key_pair_name

  tags = {
    Name = "my-terraform-ec2"
  }
}


# resource "aws_instance" "my_ec2_instance" {
#   ami           = "ami-0c55b159cbfafe1f0"
#   instance_type = "t2.micro"
#
#   tags = {
#     Name = "my-terraform-ec2"
#   }
# }

resource "aws_security_group" "ec2_sg" {
  name        = "ec2-sg"
  description = "Allow SSH and HTTP"
  vpc_id      = var.vpc_id

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



# resource "aws_iam_role" "ec2_role" {
#   name = "ec2-springboot-role"
#
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Action    = "sts:AssumeRole"
#       Effect    = "Allow"
#       Principal = {
#         Service = "ec2.amazonaws.com"
#       }
#     }]
#   })
# }
#
#
#
#
# resource "aws_iam_role_policy" "ec2_policy" {
#   name = "ec2-policy"
#   role = aws_iam_role.ec2_role.id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect   = "Allow"
#         Action   = [
#           "s3:CreateBucket",
#           "s3:PutObject",
#           "s3:GetObject",
#           "s3:ListBucket",
#           "s3:DeleteObject",
#           "s3:DeleteBucket"
#         ]
#         Resource = [
#           aws_s3_bucket.logs_bucket.arn,
#           "${aws_s3_bucket.logs_bucket.arn}/*"
#         ]
#       }
#     ]
#   })
# }


