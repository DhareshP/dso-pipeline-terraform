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

🚀 Why use Terraform?
✅ Version-controlled infrastructure (just like your code)
✅ Repeatable (create dev/test/prod environments consistently)
✅ Auditable (you can see what changed and why)
✅ Automated (runs inside CI/CD like GitHub Actions)