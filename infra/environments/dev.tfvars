# ── PLAYOFFE Dev Environment ───────────────────────────────────────────────────
# Persistent shared dev environment — deployed from the `develop` branch.
# Smallest possible resources to keep costs low.

environment = "dev"
aws_region  = "ap-southeast-1"

vpc_id     = "vpc-XXXXXXXXXXXXXXXXX"
subnet_ids = ["subnet-XXXXXXXXXXXXXXXXX", "subnet-XXXXXXXXXXXXXXXXX"]

# ECS Workers — minimum viable
ecs_desired_count = 1
ecs_cpu           = 256   # 0.25 vCPU
ecs_memory        = 512   # 0.5 GB
workers_image_tag = "latest"

# ElastiCache Redis — smallest node
redis_node_type = "cache.t3.micro"

# Alerts — lower thresholds, dev team email only
alert_email = "dev@playoffe.com"

supabase_storage_url = "https://XXXXXXXXXXXXXXXX.supabase.co/storage/v1/object/public/social-graphics"

# ── Sensitive vars — set via TF_VAR_* env variables ──────────────────────────
# Point to your Supabase DEV project (separate from staging/prod)
