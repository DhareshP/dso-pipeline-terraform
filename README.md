git workflow :

🔨 Job 1: build
Step	What It Does
✅ Checkout code	Clones your repo in GitHub runner
☕ Set up Java	Installs JDK 17
⚙️ Build with Maven	Runs ./mvnw clean verify to compile + test
🔒 OWASP Check	Scans dependencies for known vulnerabilities
📦 Upload JAR	Saves the built .jar file to be reused later

This job just builds and prepares the application.

🚀 Job 2: deploy (Depends on build)
Step	What It Does
🔽 Downloads JAR	Gets the .jar from the build job
📦 Sets up Terraform	Installs Terraform CLI
🧱 Terraform Init	Prepares Terraform (reads backend, provider, etc.)
⚙️ Terraform Apply	Provisions AWS resources automatically

Terraform :

Terraform is an open-source Infrastructure as Code (IaC) tool created by HashiCorp.

Instead of creating AWS resources manually (via the AWS Console), you declare your infrastructure in code (written in HCL – HashiCorp Configuration Language).
Terraform talks to AWS via the API using your credentials.

🚀 Why use Terraform?
✅ Version-controlled infrastructure (just like your code)
✅ Repeatable (create dev/test/prod environments consistently)
✅ Auditable (you can see what changed and why)
✅ Automated (runs inside CI/CD like GitHub Actions)

terraform/
├── main.tf          # Core resources (EC2, IAM, SG, S3)
├── variables.tf     # Input variables (region, instance type, etc.)
├── outputs.tf       # Output values (public IP, etc.)
├── terraform.tfvars # Actual values for variables (optional)

Role of Each File in terraform/
providers.tf
Tells Terraform “I’m talking to AWS in this region,” plus backend config if you’re storing state in S3/DynamoDB.

variables.tf
Lists all the knobs you can turn—region, bucket name, instance type, AMI ID, subnet IDs, etc.

main.tf
The meat of your infra: EC2 instance, S3 bucket, Security Group, IAM role & policy, instance profile, user‑data script.

outputs.tf
Anything you’ll need downstream (for example, in your CD pipeline): EC2 public IP, bucket name, etc.

(Optional) terraform.tfvars
A way to supply concrete values for all those variables without passing -var flags on the CLI.


What the HCL “Keywords” Mean
Every .tf file is just HCL (HashiCorp Configuration Language). Here are the core block types you saw:

Keyword	What it Does:
provider	Configures which cloud and how to connect (e.g. AWS).
terraform	Settings for Terraform itself (required versions, backends).
resource	Declares a real cloud object you want to create/manage.
data	Reads an existing object (e.g. default VPC or AMI).
variable	Defines an input parameter you can override per environment.
output	Exposes a value after apply (e.g. EC2 public IP).
jsonencode()	Converts a Terraform map/list into a JSON string (for IAM policies).

Example Directory for Multiple Environments
One common pattern is to give each environment its own folder, sharing modules under modules/. Your tree might look like:

terraform/
├── modules/
│   └── app_ec2/            # contains main.tf, variables.tf, outputs.tf for your app
├── dev/
│   └── terraform.tfvars    # dev‑specific values
├── prod/
│   └── terraform.tfvars    # prod‑specific values
└── backend.tf              # remote‑state backend config (shared)
Then you run:

How to Deploy

# For dev
cd terraform/dev
terraform init ../       # points to shared providers.tf
terraform apply -var-file=terraform.tfvars

# For prod
cd terraform/prod
terraform init ../
terraform apply -var-file=terraform.tfvars

To add a new stage (e.g. staging), simply copy one of the environment folders, give it its own terraform.tfvars, and run the same commands. No AWS console clicks required—everything is driven by Terraform.