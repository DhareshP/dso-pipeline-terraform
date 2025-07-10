resource "aws_s3_bucket" "logs_bucket" {
  bucket = var.logs_bucket_name

  tags = {
    Name = "Logs Bucket"
  }
}


