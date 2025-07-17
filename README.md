# DevSecOps CI/CD Pipeline for Spring Boot on AWS EC2

This repository implements a robust DevSecOps CI/CD pipeline to automate the build, security scanning, and deployment of a Spring Boot application to Amazon EC2 instances using Terraform for infrastructure provisioning.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Features](#3-features)
4. [Prerequisites](#4-prerequisites)
5. [Project Structure](#5-project-structure)
6. [CI/CD Workflow](#6-cicd-workflow-githubworkflowsdeployyml)
7. [Security Scanning](#7-security-scanning-owasp-dependency-check)
8. [Terraform Provisioning](#8-terraform-provisioning)
   - 8.1. main.tf
   - 8.2. variables.tf
   - 8.3. providers.tf
   - 8.4. dev.tfvars & prod.tfvars
   - 8.5. outputs.tf
9. [AWS IAM Configuration](#9-aws-iam-configuration)
10. [Spring Boot Application Environment Variables](#10-spring-boot-application-environment-variables)
11. [Getting Started](#11-getting-started)
12. [Automation Benefits](#12-automation-benefits)

---

## 1. Introduction

This project demonstrates a fully automated DevSecOps pipeline for a Spring Boot application. It leverages GitHub Actions for CI/CD and Terraform for Infrastructure as Code (IaC) to provision and manage AWS resources. A key aspect is the integration of security scanning using OWASP Dependency-Check early in the development lifecycle.

---

## 2. Architecture Overview

The pipeline automates the following steps:

- Code Push → CI Trigger (GitHub Actions) → Build & JAR Creation
- Security Scan (OWASP) → Terraform Infra Deployment → App Deployment on EC2

The entire process is automated, removing the need for manual AWS Console interaction.

---

## 3. Features

- **Automated CI/CD**: Seamless integration on push to `main`
- **IaC with Terraform**: Consistent and reproducible infra setup
- **DevSecOps**: Early vulnerability detection
- **EC2 Deployment**: Application hosted on AWS EC2
- **Secure Secrets**: GitHub repository secrets
- **Environment Support**: Dev & prod deployments
- **Outputs**: EC2 public IP and S3 log file names

---

## 4. Prerequisites

- AWS account with programmatic access
- GitHub repository
- AWS credentials stored in GitHub Secrets
- Basic understanding of Spring Boot, GitHub Actions, Terraform, and AWS

---

## 5. Project Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/main/java/com/example/springbootapp/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── providers.tf
│   ├── outputs.tf
│   ├── dev.tfvars
│   └── prod.tfvars
├── .env.example
├── pom.xml
└── README.md
```

---

## 6. CI/CD Workflow (.github/workflows/deploy.yml)

**Triggers**:
- On push to `main`

**Steps**:
- Build Spring Boot JAR
- OWASP Dependency-Check
- Terraform Apply (provision + deploy)

---

## 7. Security Scanning (OWASP Dependency-Check)

OWASP Dependency-Check scans for known vulnerabilities in dependencies. Scan results are included in the GitHub Actions run logs.

---

## 8. Terraform Provisioning

### 8.1 main.tf
- Sets AWS region (ap-south-1)
- Creates EC2, S3, and security groups
- Uses existing VPC and subnet

### 8.2 variables.tf
- Declares variables for flexibility

### 8.3 providers.tf
- Configures AWS provider

### 8.4 dev.tfvars & prod.tfvars
- Environment-specific values

### 8.5 outputs.tf
Example:
```hcl
output "ec2_public_ip" {
  description = "The public IP address of the EC2 instance."
  value       = aws_instance.ec2_instance.public_ip
}

output "s3_log_file_name" {
  description = "The name of the log file/artifact stored in S3."
  value       = aws_s3_bucket_object.log_object.key
}
```

---

## 9. AWS IAM Configuration

**Policy**: `terraform-ec2-s3-iam-access`
- Includes: AmazonEC2FullAccess, AmazonS3FullAccess, IAMFullAccess

**User**: `terraform-deployer`
- Least privilege principle for all actions

---

## 10. Spring Boot Application Environment Variables

Use `.env.example` as a reference. Do **not** commit actual secrets. Use AWS Secrets Manager or SSM for production secrets.

Example `.env.example`:
```
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/mydb
SPRING_DATASOURCE_USERNAME=devuser
SPRING_DATASOURCE_PASSWORD=devpass
MY_APP_API_KEY=local_dev_api_key_123
```

---

## 11. Getting Started

### Clone the Repository
```bash
git clone <your-repository-url>
cd <your-repository>
```

### Set GitHub Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Optional: Local .env
Create a `.env` file from `.env.example`. Add to `.gitignore`.

### Customize Terraform
- Adjust region, instance type, etc. in `.tf` and `.tfvars` files

### Deploy
```bash
git add .
git commit -m "Initial pipeline setup"
git push origin main
```

Outputs will be shown in the GitHub Actions logs.

---

## 12. Automation Benefits

This pipeline reduces manual deployment efforts, increases consistency, and integrates security early. Developers can focus on building features, knowing deployments are handled securely and efficiently....

---
