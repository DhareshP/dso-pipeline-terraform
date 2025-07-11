DevSecOps CI/CD Pipeline for Spring Boot on AWS EC2
This repository implements a robust DevSecOps CI/CD pipeline to automate the build, security scanning, and deployment of a Spring Boot application to Amazon EC2 instances using Terraform for infrastructure provisioning.

Table of Contents
1. Introduction

2. Architecture Overview

3. Features

4. Prerequisites

5. Project Structure

6. CI/CD Workflow (.github/workflows/deploy.yml)

7. Security Scanning (OWASP Dependency-Check)

8. Terraform Provisioning

8.1. main.tf

8.2. variables.tf

8.3. providers.tf

8.4. dev.tfvars & prod.tfvars

8.5. outputs.tf

9. AWS IAM Configuration

10. Spring Boot Application Environment Variables

11. Getting Started

12. Automation Benefits

1. Introduction
This project demonstrates a fully automated DevSecOps pipeline for a Spring Boot application. It leverages GitHub Actions for Continuous Integration and Continuous Deployment (CI/CD) and Terraform for Infrastructure as Code (IaC) to provision and manage AWS resources. A key aspect of this pipeline is the integration of security scanning using OWASP Dependency-Check early in the development lifecycle.

2. Architecture Overview
The pipeline automates the following steps:

Code Push: Developers push code changes to the main branch.

CI Trigger: A GitHub Actions workflow (deploy.yml) is automatically triggered.

Build & Artifact Creation: The Spring Boot application is built, and a JAR artifact is generated.

Security Scan: OWASP Dependency-Check scans the application's dependencies for known vulnerabilities.

Terraform Provisioning: The generated JAR file is used by Terraform to provision and deploy the application on an Amazon EC2 instance.

Automated Deployment: The entire process, from code commit to application deployment on AWS EC2, is fully automated, eliminating the need for manual intervention via the AWS console.

3. Features
Automated CI/CD: Seamless build, security scan, and deployment of Spring Boot applications on push to main.

Infrastructure as Code (IaC): Terraform manages all AWS infrastructure, ensuring consistency and repeatability.

DevSecOps Integration: Early vulnerability detection with OWASP Dependency-Check during the CI phase.

AWS EC2 Deployment: Deploys the Spring Boot application as a JAR on Amazon EC2.

Secure Credential Management: AWS access keys and secret keys for Terraform are securely stored in GitHub Repository Secrets.

Environment-Specific Deployments: Support for dev and prod environments using .tfvars files.

Actionable Outputs: Terraform outputs provide crucial deployment information like EC2 public IP and S3 log file names.

4. Prerequisites
An AWS Account with programmatic access.

A GitHub account.

AWS Access Key ID and AWS Secret Access Key stored as repository secrets in your GitHub repository (e.g., AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). These are used by Terraform in the CI/CD pipeline.

Basic understanding of Spring Boot, GitHub Actions, Terraform, and AWS.

5. Project Structure
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions workflow for CI/CD
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── example/
│                   └── springbootapp/ # Your Spring Boot application code
├── terraform/
│   ├── main.tf                   # Defines AWS resources (VPC, EC2, S3, IAM)
│   ├── variables.tf              # Input variables for Terraform
│   ├── providers.tf              # AWS provider configuration
│   ├── outputs.tf                # Defines outputs for key deployment information
│   ├── dev.tfvars                # Variables for development environment
│   └── prod.tfvars               # Variables for production environment
├── .env.example                  # Example .env file for local Spring Boot app environment variables
├── pom.xml                       # Maven build file for Spring Boot app
└── README.md                     # This Readme file
6. CI/CD Workflow (.github/workflows/deploy.yml)
The deploy.yml workflow orchestrates the entire pipeline. It is configured to:

Trigger: Initiate on push events to the main branch.

Build: Compile the Spring Boot application and package it into a JAR file.

Artifact: Create a JAR artifact ready for deployment.

OWASP Dependency-Check: Run a scan on the project dependencies to identify security vulnerabilities.

Terraform Apply: Execute Terraform commands to provision AWS infrastructure and deploy the application.

7. Security Scanning (OWASP Dependency-Check)
OWASP Dependency-Check is integrated into the CI pipeline to ensure application security. This tool automatically scans the project's dependencies for publicly disclosed vulnerabilities, providing an early warning system for potential security risks. Scan results are included in the workflow output, facilitating proactive vulnerability remediation.

8. Terraform Provisioning
The terraform/ directory contains all Infrastructure as Code (IaC) definitions for AWS resources.

8.1. main.tf
Defines the AWS region as ap-south-1.

Provisions an AWS S3 bucket for storing application artifacts (e.g., logs).

Creates an AWS EC2 instance to host the Spring Boot application.

Generates a random ID for a unique security group, ensuring isolated network access for the EC2 instance.

Filters existing VPCs by the ap-south-1 region and selects a specific vpc_id and its subnet_id for resource deployment.

8.2. variables.tf
Declares input variables for main.tf, making the configuration flexible and reusable.

8.3. providers.tf
Configures the AWS provider for Terraform.

8.4. dev.tfvars & prod.tfvars
Provide environment-specific variable values, allowing for tailored deployments to development and production environments.

8.5. outputs.tf
The outputs.tf file retrieves crucial information about the deployed infrastructure. After a successful terraform apply, these outputs are visible in the GitHub Actions run logs and can also be queried locally.

Example terraform/outputs.tf:

Terraform

output "ec2_public_ip" {
  description = "The public IP address of the EC2 instance."
  value       = aws_instance.your_ec2_instance_resource_name.public_ip
}

output "s3_log_file_name" {
  description = "The name of the log file/artifact stored in S3."
  value       = aws_s3_bucket_object.your_s3_object_resource_name.key
}
Note: Replace aws_instance.your_ec2_instance_resource_name and aws_s3_bucket_object.your_s3_object_resource_name with the actual resource names defined in your main.tf.

9. AWS IAM Configuration
For secure and granular access, the following AWS IAM setup is configured:

IAM Policy (terraform-ec2-s3-iam-access): A custom IAM policy with the following AWS managed policy attachments:

AmazonEC2FullAccess

AmazonS3FullAccess

IAMFullAccess (for EC2 roles/instance profiles)

AWSResourceGroupsandTagEditorFullAccess

IAM User (terraform-deployer): An IAM user named "terraform-deployer" is attached to the terraform-ec2-s3-iam-access policy. This user possesses the necessary permissions to perform all AWS operations declared within the GitHub Actions workflow, adhering to the principle of least privilege.

10. Spring Boot Application Environment Variables
While AWS access keys and secret keys for Terraform are securely managed via GitHub repository secrets, your Spring Boot application may require its own environment-specific configurations (e.g., database credentials, API keys).

It is strongly recommended NOT to store sensitive application secrets directly in .env files within the repository or commit them to version control.

For local development, a .env.example file is provided to demonstrate the structure for non-sensitive or dummy environment variables. A .env file (which should be added to .gitignore) can be created from this example for local testing.

Example .env.example:

Bash

# .env.example
# This file demonstrates the structure for Spring Boot application environment variables.
# DO NOT store actual sensitive credentials here or commit this file.

SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/mydb
SPRING_DATASOURCE_USERNAME=devuser
SPRING_DATASOURCE_PASSWORD=devpass
MY_APP_API_KEY=local_dev_api_key_123
For production deployments, sensitive configurations should be fetched dynamically at application startup using services like AWS Secrets Manager or AWS Parameter Store. Environment variables can also be injected into the EC2 instance environment during deployment via user data scripts or instance profiles.

11. Getting Started
Clone the Repository:

Bash

git clone <your-repository-url>
cd <your-repository-name>
Configure AWS Secrets for Terraform (GitHub):

Navigate to your GitHub repository Settings -> Secrets and variables -> Actions.

Add two new repository secrets:

AWS_ACCESS_KEY_ID: Your AWS Access Key ID.

AWS_SECRET_ACCESS_KEY: Your AWS Secret Access Key.

Create Local .env file (Optional for Spring Boot local development):

Create a .env file in the project root (next to pom.xml).

Add non-sensitive environment variables your Spring Boot application needs for local testing, following the .env.example format.

Ensure .env is in your .gitignore file to prevent accidental commits.

Customize Terraform (Optional):

Review and modify terraform/*.tf files to suit your specific AWS infrastructure requirements (e.g., EC2 instance type, region if different from ap-south-1, VPC/subnet selection logic).

Adjust dev.tfvars or prod.tfvars for environment-specific configurations.

Crucially, update terraform/outputs.tf with the correct resource names from main.tf to output the EC2 public IP and S3 log file name.

Push to main:

Make a change to your Spring Boot application code or a Terraform file.

Commit and push your changes to the main branch:

Bash

git add .
git commit -m "Initial pipeline setup"
git push origin main
This action will automatically trigger the GitHub Actions workflow. After the workflow completes, the EC2 public IP and S3 log file name will be available in the GitHub Actions run logs under the "Terraform Apply" step.

12. Automation Benefits
This fully automated pipeline streamlines the deployment process. Developers can concentrate on coding, confident that every push to the main branch will trigger a secure and efficient deployment to AWS, eliminating manual AWS console interactions. This significantly reduces deployment time, minimizes human error, and enhances overall development velocity.
