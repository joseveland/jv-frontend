## Summary and Setup

* This is a frontend project based on `S3` and `Cloudfront` (written in
Angular) which will be the UI core of my personal API.
<br></br>

  * Infrastructure deployable into AWS, so I installed
  [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  * Via Terraform code, so I also installed (as admin in Windows)
  [that tool](https://learn.hashicorp.com/tutorials/terraform/install-cli)
<br></br>

* At AWS console:
<br></br>

  * I had to create a baseline AWS policy named `terraform-deployer`
  with enough permissions to create IAM users, roles, policies, lambdas,
  cloudwatch logs, etc.
  <br></br>

    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "ecr:*",
                  "lambda:*",
                  "apigateway:*",
                  "cloudfront:*",
                  "s3:*",
                  "iam:*",
                  "logs:*",
                  "cloudwatch:*"
              ],
              "Resource": "*"
          }
      ]
    }
    ```
    **NOTE:** and maybe more stuff in the future
  <br></br>

  * Then I created an AWS user named `terraform-deployer` (so same than the policy)
  associated to that `terraform-deployer` policy
  <br></br>

  * On terraform I'll be using a backend state stored in an S3 bucket
  named `Xxxx-terraform-states` where `Xxxx` relates to the project's nickname
  or account ID, that is because S3 bucket names must be globally unique
  <br></br>
    * To be used with all the `env/*/backend.tfvars` files that I'll be using for
    this and many other repositories
  <br></br>

  * I added an access key to that user to be able to have
  `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables
  useful for both local development and GitHub Actions when using
  AWS CLI and Terraform commands
  <br></br>
  
    * Rotation advisable every 90 days (Among other security best practices)
      ```bash
      # Check credential age
      aws iam list-access-keys --user-name terraform-deployer
    
      # Generate new access key while removing the old one
      aws iam create-access-key --user-name terraform-deployer
      aws iam delete-access-key --user-name terraform-deployer --access-key-id OLD_KEY
      ```

* At GitHub repository settings, I added a grouped set of `Environments`
(similar to Bitbucket's deployments) one for `dev`, `staging`, etc.,
each carrying the following:
<br></br>

    * Repository environment-secrets:
      * `AWS_ACCESS_KEY_ID` - From the AWS user created above
      * `AWS_SECRET_ACCESS_KEY` - From the AWS user created above
      * `AWS_REGION` - e.g., `us-east-1`
    
    * Repository environment-variables:
      * ...

    * The goal is being able to use `${{ secrets.AWS_ACCESS_KEY_ID }}`,
    `${{ secrets.AWS_SECRET_ACCESS_KEY }}`, `${{ vars.AWS_REGION }}`
    and `${{ env.DEPLOYMENT }}` in GitHub Actions workflows (see
    `.github/workflows/terraform-xxx.yml`)

## Docs

* GitHub Actions for CI/CD [here](https://docs.github.com/en/actions)
  * `.yml` reference [here](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
* Terraform docs [here](https://developer.hashicorp.com/terraform/docs)
  * AWS provider docs [here](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
* AWS docs for:
  * [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  * [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
  * [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
  * [ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)
  * [Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
  * [API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
  * [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
  * [CloudFront](https://docs.aws.amazon.com/cloudfront/)


## Project Structure

```
jv-frontend/
├── angular/                        # Angular main directory
│   ├── src/                        # Angular src directory
│   │   ├── app/                    # Angular app directory
│   │   │   ├── components/         # Desired angular structure...
│   │   │   ├── pipes/
│   │   │   ├── services/
│   │   │   ├── ...                 # Other modular dependencies
│   │   │   └── app.xxx             # Main component `app` definition files
│   │   ├── index.html              # Index HTML
│   │   ├── styles.scss             # Index CSS (SCSS)
│   │   └── main.ts                 # Index JS (Typescript)
│   └── *.json                      # Angular `.json` config files
├── terraform/                      # Terraform infrastructure code
│   ├── main.tf                     # Main Terraform configuration
│   ├── **.tf                       # Secondary Terraform configurations to avoid large main.tf
│   ├── variables.tf                # Variable definitions
│   ├── outputs.tf                  # Output definitions
│   └── env/                        # Deployment environments
│       ├── dev/                    # Development environment
│       │   ├── backend.tfvars      # Backend config for remote state
│       │   ├── default.tfvars      # Default variables for dev
│       │   └── policies/           # Template files for inline policies
│       │       └── **.json         # JSON policy files
│       ├── staging/                # Staging environment (Similar to dev)
│       │   └── ...
│       └── prod/                   # Production environment (Similar to dev)
│           └── ...
└── .github/
    └── workflows/                  # GitHub Actions workflows
        ├── code-quality.yml        # unit testing, linters, etc workflow
        └── terraform-xxx.yml       # Terraform for automated deployments workflows
```


## Angular Basics

* Pre-requisites in your local (or remote pipeline) machine:

  - Node.js (v20 or above)
  - Angular CLI (v11 or above)
  ```bash
  npm install -g @angular/cli
  ```

* Angular app creation using Angular CLI, `--routing` flag to add routing module,
`--style=scss` flag to use `SCSS` as CSS preprocessor and `angular/` folder
is just to have a readable structure

  ```bash
  ng new jv-frontend --routing --style=scss
  mv jv-frontend/ angular/
  cd angular/
  ```
  **NOTE:** . When asked for `SSR/SSG` choose `No` for simplicity.
<br><br/>


## Angular Running and Testing

* Ensure dependencies (`node_modules` folder) created within
the project (The framework takes care of the whole structure
and a `package.json` file is created for you):

  ```bash
  cd angular/
  npm install
  ```

* Run the app (`start` is a special built-in in Node.js that translates
to `npm run start` so the `start` target) by running the `start` target
that is defined as `ng serve` command (Inside `package.json` under `scripts`
section):

  ```bash
  cd angular/
  npm start
  ```
  **NOTE:** default angular configuration for `ng serve` is `development`
  (or `--configuration development` when it comes to `angular.json`
  details of `ng`-like commands). Development configuration is not
  optimized for production, but it is faster to compile, and it has
  live reloading enabled by default (You edit the file and the server
  re-launches with the mods).
<br><br/>

* Run the app (`test` is a special built-in in Node.js that translates
to `npm run test` so the `test` target) by running the `test` target
that is defined as `ng test` command (Inside `package.json` under `scripts`
section):

  ```bash
  cd angular/
  npm test
  ```



## Angular Building

* Compile the app this time there is no built-in target so `run` is needed,
and the target is `build` that is defined as `ng build` command
(Inside `package.json` under `scripts` section):

  ```bash
  cd angular/
  npm run build
  ```
  **NOTE:** default angular configuration for `ng build` is `production`
  (or `--configuration production` when it comes to `angular.json`
  details of `ng`-like commands). Production configuration is optimized
  for code size, performance, etc., but it is slower to compile.
<br><br/>
  **RESULTANT:** a `dist/` folder followed by the project name
   (e.g., `jv-frontent/`) and target platform (e.g., `browser/`)
  as angular is agnostic remember, so the full path would be
  `angular/dist/jv-frontend/browser/` which contains the static files
  to be uploaded/served to the S3 bucket (see Terraform section).
<br><br/>


## Terraform and Deployment dynamics

1. IaC definitions and relationship between resources

   * S3 as Origin:
      * CloudFront uses the S3 bucket as its origin source
      * Versioning: enabled for better management of objects
      * Bucket Policy:
         * Publicly available as read-only for direct (but
         HTTP only) access
         * OAI allowance for CloudFront to access the bucket
<br><br/>

   * Origin Access Identity (OAI):
      * CloudFront uses OAI to securely (Through policy allowance) access
      the S3 bucket
      * Another advantage is being a CDN so quicker for static content
      while globally available
<br><br/>

   * SPA Routing: Error pages (403/404/etc) redirect back to home (index.html)
<br><br/>

   * Caching: CloudFront caches content at edge locations for better performance
<br><br/>

   * HTTPS: CloudFront provides HTTPS access to the content
<br><br/>

   * Logging: CloudFront distribution logging to monitoring accesses patterns
<br><br/>

2. Once everything is deployed, the app needs to be compiled and uploaded
to the S3 bucket, this can be done using Angular CLI and AWS CLI
commands:

    ```bash
    cd angular/
    npm run build     # Compiles into static files at `dist/ANGULAR_PROJECT_NAME/PLATFORM_NAME` folder
    aws s3 sync \
      --content-type "MANUAL_MIME_TYPE" --delete \
      "dist/jv-frontend/browser/" \
      "s3://APP-BUCKET-NAME""
    ```
    **NOTE:** `--delete` flag to remove files in the bucket (a cleanup
    basically), and `--content-type ` doesn't work too well as I need
    to identify each mime-type and manually set that for CloudFront to
    handle the client retrieval in the right way, so I better created a
    python script to do this automatically while aware of caching (see below)
<br><br/>

    ```bash
    cd angular/
    npm run build
    pip install -r ../scripts/requirements.txt
    python ../scripts/sync_to_s3.py "dist/jv-frontend/browser/" \
      "APP-BUCKET-NAME" \
      "CLOUDFRONT-DISTRIBUTION-ID" \
      --force "custom.html"
    ```

    * If already uploaded, and you want to assign mime-types manually you
   could do something like this with AWS CLI:
      ```shell
      BUCKET="APP-BUCKET-NAME"    # Linux/MacOS
      $BUCKET="APP-BUCKET-NAME"   # Windows (Powershell)
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "text/html" \
        --exclude  "*" --include "*.html"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "text/css" \
        --exclude  "*" --include "*.css"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "application/javascript" \
        --exclude  "*" --include "*.js"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "application/json" \
        --exclude  "*" --include "*.json"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "image/jpeg" \
        --exclude  "*" --include "*.jpg" --include "*.jpeg"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "image/png" \
        --exclude  "*" --include "*.png"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "image/svg+xml" \
        --exclude  "*" --include "*.svg"
      
      aws s3 cp "s3://${BUCKET}/" "s3://${BUCKET}/" --recursive \
        --metadata-directive REPLACE --content-type "image/x-icon" \
        --exclude  "*" --include "*.ico"
      ```


## Troubleshooting and Useful Commands

1. To access the front end you could do it:

   * Via direct public HTTP web configuration within the S3 bucket. Go for the
   `http://APP-BUCKET-NAME.s3-website-REGION.amazonaws.com` URL (for example
   http://jv-frontend-angular-app.s3-website-us-east-1.amazonaws.com)
   
     * **[I end up blocking the public permissions to the bucket in terraform code,
     so avoiding that public access which can be verified through the bucket's
     "Permission" tab, therefore no direct HTTP will be available after this commit]**
<br><br/>

   * Via CloudFront distribution URL (HTTPS), go for the distribution URL
   `https://DOMAIN-ID.cloudfront.net` (For example
   https://dn3n5gin3l7sq.cloudfront.net/). Here be aware of the fact that
   a cache matter can re-send the same old content even after re-uploading
   to S3 (for example a change in metadata for `content-type` or so).
<br><br/>

   * I have Terraform **_outputs_** for both URLs anyway
   (`s3_bucket_website_endpoint` and `cloud_front_domain_name` ones)
   for you to copy-paste the URL then
<br><br/>

2. To clean cache from CloudFront (if needed):

   * Via AWS Console is easier, you need to create `Invalidations`
   pointing to a CloudFront distribution and file paths
   (E.g. `/*` path invalidates everything, so cleaning all cache)

     ```shell
     aws cloudfront create-invalidation \
        --distribution-id "DEPLOYED-DISTRIBUTION-ID" \
        --paths "/*"
     
     aws cloudfront create-invalidation \
        --distribution-id "DEPLOYED-DISTRIBUTION-ID" \
        --paths "/component/demo/*" "/component/other/*"
     
     etc...
     ```
     **NOTE:** wilcard patterns like `"/*.css"`, `"/*.js"`, `"/*.html"` 
     are not allowed, so make sure to structure well your code logic
