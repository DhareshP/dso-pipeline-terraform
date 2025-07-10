resource "aws_s3_bucket" "logs_bucket" {
  bucket = var.logs_bucket_name

  tags = {
    Name = "Logs Bucket"
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


# resource "aws_iam_role_policy" "ec2_policy" {
#   name = "ec2-policy"
#   role = aws_iam_role.ec2_role.id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Effect   = "Allow"
#       Action   = ["s3:PutObject", "s3:GetObject"]
#       Resource = "${aws_s3_bucket.logs_bucket.arn}/*"
#     }]
#   })
# }

resource "aws_iam_role_policy" "ec2_policy" {
  name = "ec2-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "s3:CreateBucket",
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:DeleteBucket"
        ]
        Resource = [
          aws_s3_bucket.logs_bucket.arn,
          "${aws_s3_bucket.logs_bucket.arn}/*"
        ]
      }
    ]
  })
}


