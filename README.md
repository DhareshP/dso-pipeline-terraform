DevSecOps CI/CD Pipeline for Spring Boot on AWS EC2

This repository hosts a robust DevSecOps CI/CD pipeline designed to automate the build, security scanning, and deployment of a Spring Boot application to Amazon EC2 instances using Terraform for infrastructure provisioning.

Table of Contents
Introduction

Architecture Overview

Features

Prerequisites

Project Structure

CI/CD Workflow (deploy.yml)

Security Scanning (OWASP Dependency-Check)

Terraform Provisioning

Terraform Outputs (outputs.tf)

AWS IAM Configuration

Spring Boot Application Environment Variables

Getting Started

Automation Benefits

Introduction
This project demonstrates a fully automated DevSecOps pipeline for a Spring Boot application. It leverages GitHub Actions for Continuous Integration and Continuous Deployment (CI/CD) and Terraform for Infrastructure as Code (IaC) to provision and manage AWS resources. A key aspect of this pipeline is the integration of security scanning early in the development lifecycle using OWASP Dependency-Check.

Architecture Overview
The pipeline automates the following steps:

Code Push: Developers push code changes to the main branch.

CI Trigger: A GitHub Actions workflow (deploy.yml) is automatically triggered.

Build & Artifact Creation: The Spring Boot application is built, and a JAR artifact is generated.

Security Scan: OWASP Dependency-Check scans the application's dependencies for known vulnerabilities.

Terraform Provisioning: The generated JAR file is used by Terraform to provision and deploy the application on an Amazon EC2 instance.

Automated Deployment: The entire process, from code commit to application deployment on AWS EC2, is fully automated, eliminating the need for manual intervention via the AWS console.

Features
Automated CI/CD: Seamless build, test, and deployment of Spring Boot applications on push to main.

Infrastructure as Code (IaC): Terraform manages all AWS infrastructure, ensuring consistency and repeatability.

DevSecOps Integration: Early vulnerability detection with OWASP Dependency-Check during the CI phase.

AWS EC2 Deployment: Deploys the Spring Boot application as a JAR on Amazon EC2.

Secure Credential Management: AWS access keys and secret keys for Terraform are securely stored in GitHub Repository Secrets.

Environment-Specific Deployments: Support for dev and prod environments using .tfvars files.

Actionable Outputs: Terraform outputs provide crucial deployment information like EC2 public IP and S3 log file names.

Prerequisites
Before setting up this pipeline, ensure you have:

An AWS Account with programmatic access.

A GitHub account.

AWS Access Key ID and AWS Secret Access Key stored as repository secrets in your GitHub repository (e.g., AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). These are used by Terraform in the CI/CD pipeline.

Basic understanding of Spring Boot, GitHub Actions, Terraform, and AWS.

Project Structure
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
CI/CD Workflow (deploy.yml)
The deploy.yml workflow orchestrates the entire pipeline:

Trigger: Initiates on push events to the main branch.

Build: Compiles the Spring Boot application and packages it into a JAR file.

Artifact: Creates a JAR artifact ready for deployment.

OWASP Dependency-Check: Runs a scan on the project dependencies to identify security vulnerabilities.

Terraform Apply: Executes Terraform commands to provision AWS infrastructure and deploy the application.

Security Scanning (OWASP Dependency-Check)
To ensure the security of our application, OWASP Dependency-Check is integrated into the CI pipeline. This tool automatically scans the project's dependencies for publicly disclosed vulnerabilities, providing an early warning system for potential security risks. The scan results are part of the workflow output, allowing developers to address issues before deployment.

Terraform Provisioning
The terraform/ directory contains all the Infrastructure as Code (IaC) definitions:

main.tf:

Defines the AWS region as ap-south-1.

Provisions an AWS S3 bucket for storing application artifacts (like logs) or other data.

Creates an AWS EC2 instance to host the Spring Boot application.

Generates a random ID for a unique security group, ensuring isolated network access for the EC2 instance.

Filters existing VPCs by the ap-south-1 region and selects a specific vpc_id and its subnet_id for resource deployment.

variables.tf: Declares variables used in main.tf, making the configuration flexible and reusable.

providers.tf: Configures the AWS provider for Terraform.

dev.tfvars and prod.tfvars: Provide environment-specific variable values, allowing for tailored deployments to development and production environments.

Terraform Outputs (outputs.tf)
The outputs.tf file is crucial for easily retrieving important information about the deployed infrastructure. After a successful terraform apply, you can view these outputs, which will include:

EC2 Public IP Address: The public IP address of the newly provisioned EC2 instance, allowing you to access your deployed Spring Boot application.

S3 Log File Name: The name of the log file or artifact stored in the S3 bucket, useful for debugging or monitoring.

An example outputs.tf would look something like this:

Terraform

# terraform/outputs.tf

output "ec2_public_ip" {
  description = "The public IP address of the EC2 instance."
  value       = aws_instance.your_ec2_instance_name.public_ip
}

output "s3_log_file_name" {
  description = "The name of the log file/artifact stored in S3."
  value       = aws_s3_bucket_object.your_log_file_object_name.key # Replace with your actual S3 object resource name
}
Note: You will need to adjust aws_instance.your_ec2_instance_name and aws_s3_bucket_object.your_log_file_object_name to match the actual names of your EC2 instance and S3 object resources defined in main.tf.

AWS IAM Configuration
For secure and granular access, the following AWS IAM (Identity and Access Management) setup is in place:

IAM Policy (terraform-ec2-s3-iam-access): A custom IAM policy has been created with the following AWS managed policy attachments:

AmazonEC2FullAccess: Allows full access to EC2 resources.

AmazonS3FullAccess (or similar granular S3 access): Grants administrative access to S3.

IAMFullAccess (or similar granular IAM access for EC2 roles): Allows management of IAM resources specifically for EC2.

AWSResourceGroupsandTagEditorFullAccess (or similar granular EC2 management access): Provides permissions for EC2 management operations.

IAM User (terraform-deployer): An IAM user named "terraform-deployer" has been created and is attached to the terraform-ec2-s3-iam-access policy. This user has the necessary permissions to perform all AWS operations declared within the GitHub Actions workflow, including provisioning EC2, S3, and managing related IAM roles and security groups.

This configuration ensures that the automated pipeline operates with the principle of least privilege, with specific permissions granted only for the required tasks.

Spring Boot Application Environment Variables
While AWS access keys and secret keys for Terraform are stored in GitHub repository secrets, your Spring Boot application might also require its own environment-specific configurations (e.g., database credentials, API keys).

It is strongly recommended NOT to store sensitive application secrets directly in .env files within the repository or commit them to version control.

For local development, you can use a .env file (which should be added to .gitignore) to manage non-sensitive or dummy environment variables for your Spring Boot application. For sensitive credentials, consider the following best practices:

AWS Secrets Manager / AWS Parameter Store: For production deployments, fetch sensitive configurations dynamically at application startup from AWS Secrets Manager or Parameter Store.

Environment Variables (during deployment): Inject sensitive environment variables directly into the EC2 instance environment during the deployment process via user data scripts or instance profiles, rather than hardcoding them.

Spring Cloud Config Server / HashiCorp Vault: For more advanced setups, use a dedicated configuration server.

An .env.example file is provided in the project root to demonstrate how you might structure environment variables for your Spring Boot application during local development, but remember not to add actual sensitive values here or commit it.

Bash

# .env.example
# This file is for demonstrating structure of environment variables for your Spring Boot app.
# DO NOT store actual sensitive credentials here or commit this file.

# Example for local development
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/mydb
SPRING_DATASOURCE_USERNAME=devuser
SPRING_DATASOURCE_PASSWORD=devpass

# Example of an API Key (for local testing)
MY_APP_API_KEY=local_dev_api_key_123
Your Spring Boot application can then access these variables using @Value("${MY_VAR_NAME}") annotations or by injecting the Environment object.

Getting Started
Clone the Repository:

Bash

git clone <your-repository-url>
cd <your-repository-name>
Configure AWS Secrets for Terraform:

Go to your GitHub repository Settings -> Secrets and variables -> Actions.

Add two new repository secrets:

AWS_ACCESS_KEY_ID: Your AWS Access Key ID.

AWS_SECRET_ACCESS_KEY: Your AWS Secret Access Key.

Create Local .env file (Optional for local Spring Boot app development):

Create a .env file in the project root (next to pom.xml).

Add any non-sensitive environment variables your Spring Boot application needs for local testing, following the .env.example format.

Ensure .env is in your .gitignore file to prevent accidental commits of local configurations.

Customize Terraform (Optional):

Review and modify the terraform/*.tf files to suit your specific AWS infrastructure requirements (e.g., EC2 instance type, region if different from ap-south-1, VPC/subnet selection logic).

Adjust dev.tfvars or prod.tfvars for environment-specific configurations.

Crucially, update outputs.tf with the correct resource names from main.tf to output the EC2 public IP and S3 log file name.

Push to main:

Make a change to your Spring Boot application code or a Terraform file.

Commit and push your changes to the main branch:

Bash

git add .
git commit -m "Initial pipeline setup"
git push origin main
This will automatically trigger the GitHub Actions workflow, building your application, scanning for vulnerabilities, and deploying it to AWS EC2. After the workflow completes, you can view the EC2 public IP and S3 log file name in the GitHub Actions run logs under the "Terraform Apply" step, or by running terraform output if you have local Terraform access to the state.

Automation Benefits
With this pipeline, the entire deployment process is fully automated. Developers can focus on writing code, knowing that every push to the main branch will trigger a secure and efficient deployment to AWS, without the need for manual AWS console interactions. This significantly reduces deployment time, minimizes human error, and enhances overall development velocity.
