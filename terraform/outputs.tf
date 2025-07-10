# output "instance_public_ip" {
#   description = "Public IP of the EC2 instance"
#   value       = aws_instance.app_server.public_ip
# }

output "s3_bucket_name" {
  description = "Name of the logs S3 bucket"
  value       = aws_s3_bucket.logs_bucket.bucket
}
