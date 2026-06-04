# PLAYOFFE — Daily Handoff
**Date:** 4 June 2026
**Branch:** `master`
**Last Commit:** `1e4c0c1` — chore: daily handoff (keep-alive workflow + cost decisions pending push)

---

## Project Summary

**PLAYOFFE** is a full-stack pickleball tournament management platform covering the complete tournament lifecycle: club management, registration, draw generation, live scoring, venue display, player network, social media automation, and AI-powered scheduling.

**Repo:** `C:\Projects\Repositories\pratik\pickleball-platform`
**GitHub:** https://github.com/pratikpbhagat/playoffe

### Technology Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js Server Actions, Supabase (Postgres + Auth + Storage + Realtime) |
| Workers | @pickleball/workers — BullMQ + Redis (Node.js ESM, ECS Fargate) |
| AI | Anthropic Claude API (claude-3-5-sonnet-20241022) |
| Graphics | Satori + @resvg/resvg-js (1080×1080 PNG rendering) |
| IaC | Terraform (AWS) |
| Hosting | Vercel (frontend) + AWS ECS Fargate (workers) |
| Package Manager | pnpm 10 (workspace monorepo) |

---

## Phase Status

| Phase | Status |
|---|---|
| Phases 1–11 | ✅ Complete |
| Phase 12 — Infrastructure code | ✅ Complete |
| Phase 12 — Real-world provisioning | ⏳ Not started |

---

## Infrastructure Decision (agreed this session)

**Deploy staging only** until full manual + automated + load testing is complete. Add prod only when ready to launch. Skip dev AWS infrastructure — use local dev instead.

### Cost Plan

| Phase | Setup | Monthly |
|---|---|---|
| **Now — testing** | Staging only, Supabase free tier | **~$64/month** |
| **Launch** | Add prod + Supabase Pro for prod | **~$155/month** |
| **Scale** | Add dev environment | **~$185/month** |

### Staging cost breakdown

| Service | Monthly |
|---|---|
| AWS ECS Fargate (0.5 vCPU, 1 GB, 1 task) | $21 |
| AWS ElastiCache Redis (cache.t3.micro) | $13 |
| AWS Secrets Manager (14 secrets) | $6 |
| AWS CloudWatch (alarms + logs) | $3 |
| AWS ECR (image registry) | $1 |
| Supabase staging (free tier) | $0 |
| Vercel Pro | $20 |
| **Total** | **~$64/month** |

### Supabase Free Tier — why it works for staging
- 500 MB DB, 1 GB storage — test data won't come close
- Only risk: projects **pause after 7 days of inactivity**
- Mitigation: `keep-alive.yml` workflow pings staging every Monday → project stays active
- Upgrade to Pro only when creating the prod project at launch

---

## What Phase 12 Code Was Built (all on master)

### Terraform (`infra/`)
```
infra/
  terraform.tf              — provider + state backend (S3 or Terraform Cloud)
  variables.tf              — all variables (dev/staging/prod valid environments)
  main.tf                   — composes all 6 modules
  outputs.tf                — ECR URL, ECS names, Redis endpoint, CloudFront domain
  environments/
    dev.tfvars              — defer until needed
    staging.tfvars          — fill VPC/subnet IDs here before first deploy
    prod.tfvars             — defer until launch
  modules/
    ecr/                    — image registry, lifecycle policies
    secrets/                — Secrets Manager /playoffe/{env}/* (14 secrets)
    elasticache/            — Redis cluster + security group
    ecs/                    — Fargate cluster + task def + service + auto-scaling
    cloudwatch/             — 5 alarms + dashboard
    cloudfront/             — CDN for social-graphics storage bucket
  README.md                 — full provisioning guide
```

### GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | Active now? |
|---|---|---|
| `pr-checks.yml` | PR opened | ✅ Yes |
| `staging-deploy.yml` | Push to `master` | ✅ Yes |
| `dev-deploy.yml` | Push to `develop` branch | ⏳ Deferred |
| `prod-deploy.yml` | Push `v*.*.*` tag | ⏳ Deferred |
| `keep-alive.yml` | Every Monday 9am UTC | ✅ Yes |

### Security
- `apps/web/next.config.mjs` — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- `apps/web/src/middleware.ts` — sliding-window rate limiting (10/30/120 req/min by route)
- `supabase/audit/rls-audit.sql` — detects unprotected tables before launch

### Load Tests (`tests/load/`)
- `draw-generation.js` — p95 < 3s threshold, 20 concurrent users
- `scoring-concurrency.js` — 15 simultaneous referees, zero-conflict threshold
- `workers-throughput.js` — queue burst, measures jobs/sec + auto-scale response

---

## What Needs to Happen Next (staging provisioning)

**Estimated time: ~3 hours total**

### Step 1 — AWS IAM (~15 min)
- AWS Console → IAM → Users → Create user: `playoffe-deploy`
- Attach policy: `AdministratorAccess`
- Create Access Key → type: "Application running outside AWS"
- Save Access Key ID + Secret (shown once only)

### Step 2 — Supabase staging project (~15 min)
- supabase.com/dashboard → New project → name: `playoffe-staging`
- Region: ap-southeast-1 (Singapore)
- Save: **Project Ref**, **Anon key**, **Service role key**, **DB password**
- Create Personal Access Token: supabase.com/dashboard/account/tokens

### Step 3 — Vercel (~15 min)
- `cd apps/web && vercel login && vercel link`
- Create API token: vercel.com/account/tokens → name: `playoffe-github-actions`
- Add domain in Vercel: `staging.playoffe.com`
- Add DNS record at your registrar (Vercel will tell you what to add)

### Step 4 — Fill Terraform config (~20 min)
- AWS Console → VPC → copy default VPC ID
- AWS Console → VPC → Subnets → copy 2 subnet IDs (different availability zones)
- Fill into `infra/environments/staging.tfvars`:
  ```hcl
  vpc_id     = "vpc-XXXXXXXXXXXXXXXXX"
  subnet_ids = ["subnet-XXXXXXXX", "subnet-YYYYYYYY"]
  supabase_storage_url = "https://<staging-ref>.supabase.co/storage/v1/object/public/social-graphics"
  ```

### Step 5 — Terraform deploy (~15 min + 10 min wait)
```bash
cd infra
terraform init

# Set all secrets as env vars (never in tfvars files)
export TF_VAR_supabase_url="https://<staging-ref>.supabase.co"
export TF_VAR_supabase_anon_key="eyJ..."
export TF_VAR_supabase_service_role_key="eyJ..."
export TF_VAR_supabase_db_password="..."
export TF_VAR_anthropic_api_key="sk-ant-..."
export TF_VAR_instagram_app_id="..."
export TF_VAR_instagram_app_secret="..."
export TF_VAR_facebook_app_id="..."
export TF_VAR_facebook_app_secret="..."
export TF_VAR_x_api_key="..."
export TF_VAR_x_api_secret="..."
export TF_VAR_x_access_token="..."
export TF_VAR_x_access_token_secret="..."

terraform plan -var-file="environments/staging.tfvars"   # preview first
terraform apply -var-file="environments/staging.tfvars"  # ~10 min
terraform output                                          # note the outputs
```

### Step 6 — Supabase migrations + storage (~10 min)
```bash
# Push all 21 migrations to staging
supabase db push --project-ref <staging-ref>

# Create social-graphics bucket:
# Supabase Dashboard → Storage → New bucket
# Name: social-graphics  |  Public: yes  |  Max size: 10MB
```

### Step 7 — GitHub secrets (~15 min)
GitHub → repo → Settings → Secrets → Actions → add:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From Step 1 |
| `AWS_SECRET_ACCESS_KEY` | From Step 1 |
| `SUPABASE_ACCESS_TOKEN` | From Step 2 |
| `STAGING_SUPABASE_PROJECT_REF` | From Step 2 |
| `DEV_SUPABASE_URL` | `https://<staging-ref>.supabase.co` (reuse staging for PR tests) |
| `DEV_SUPABASE_ANON_KEY` | Staging anon key (for keep-alive workflow) |
| `DEV_SUPABASE_SERVICE_ROLE_KEY` | Staging service role key |
| `VERCEL_TOKEN` | From Step 3 |

### Step 8 — Validate end to end (~30 min)
```bash
# 1. Trigger staging deploy
git commit --allow-empty -m "chore: trigger staging pipeline validation"
git push origin master
# → Watch GitHub Actions → staging-deploy.yml → should complete green

# 2. Verify staging is live
curl -I https://staging.playoffe.com   # should return 200 with security headers

# 3. Verify workers are running
# AWS Console → ECS → playoffe-staging-workers → Tasks → 1 running task

# 4. Verify keep-alive runs
# GitHub Actions → Keep Supabase Staging Alive → Run workflow (manual trigger)
```

---

## When to Add Production

All three of these must be true before deploying prod:

- [ ] Full manual testing complete (happy path + edge cases)
- [ ] All k6 load test thresholds passing on staging
- [ ] `supabase/audit/rls-audit.sql` clean — zero unprotected tables

Then:
```bash
# Create Supabase prod project, add PROD_SUPABASE_PROJECT_REF secret
# Create GitHub 'production' environment with required reviewer
terraform apply -var-file="environments/prod.tfvars"
supabase db push --project-ref <prod-ref>
git tag v1.0.0 && git push origin v1.0.0
# → approve in GitHub → live
```

---

## Dev Setup (local — unchanged)
```bash
supabase start
docker start pickleball-redis
cd apps/web && (unset ANTHROPIC_API_KEY && npm run dev)
cd workers && pnpm dev
```

**Test accounts:**
- `alex@playoffe.dev` / `TestPass123!` — Super Admin
- `sam@playoffe.dev` / `TestPass123!` — Club Owner (Blue Bird Club)

**Gotchas:**
- `ANTHROPIC_API_KEY` — always unset before `npm run dev` (empty system var overrides `.env.local`)
- `pnpm approve-builds` required after fresh install (sharp + @resvg/resvg-js native builds)
- `supabase gen types` output needs first line (`Connecting to db...`) and last 2 lines (CLI update notice) stripped

---

## 🚀 Resume Prompt

> Copy everything from here to the end and paste into a new Claude Code session.

---

We are building **PLAYOFFE** — a full-stack pickleball tournament management platform.

**Repo:** `C:\Projects\Repositories\pratik\pickleball-platform`
**GitHub:** https://github.com/pratikpbhagat/playoffe
**Branch:** `master`

---

### Recent commits
```
d5cb787 feat: add dev environment — Terraform config + CI/CD workflow
17b5142 feat: Phase 12 — infrastructure, CI/CD, security, load tests
659c57d feat: merge feature/smart-scheduling — Phase 11 complete + pre-Phase 12 fixes
ffa2c7b fix: social_post_log platform field + regenerate Supabase types
```

---

### Phase status
- **Phases 1–11:** ✅ Complete
- **Phase 12 — Infrastructure code:** ✅ Complete (all on master)
- **Phase 12 — Real-world provisioning:** ⏳ Not started

---

### Agreed infrastructure decisions
- **Staging only** for now — skip dev and prod AWS infra until testing is complete
- **Supabase free tier** for staging (saves $25/month) — `keep-alive.yml` prevents project pausing
- **Target cost: ~$64/month** during testing phase
- **Add prod** only when manual + load + security testing passes on staging
- **Cost at launch: ~$155/month** (add Supabase Pro prod project + prod AWS stack)

---

### What's built (all committed to master)

**Terraform (`infra/`):** 6 modules — ECR, ECS Fargate + auto-scaling, ElastiCache Redis, Secrets Manager, CloudWatch, CloudFront. Three environment configs in `infra/environments/`. VPC/subnet IDs in `staging.tfvars` still need to be filled in before first deploy.

**GitHub Actions (`.github/workflows/`):**
- `pr-checks.yml` — TS + tests + Vercel preview on every PR
- `staging-deploy.yml` — push to master → full staging deploy
- `dev-deploy.yml` — deferred (triggers only on `develop` branch)
- `prod-deploy.yml` — deferred (triggers only on `v*.*.*` tags)
- `keep-alive.yml` — pings staging Supabase every Monday to prevent free-tier pausing

**Security:** CSP/HSTS headers (`next.config.mjs`), rate limiting (`middleware.ts`), RLS audit SQL (`supabase/audit/rls-audit.sql`)

**Load tests:** k6 scripts in `tests/load/`

---

### What needs to happen next — staging provisioning (~3 hours)

1. **AWS IAM** — create `playoffe-deploy` user, `AdministratorAccess` policy, generate Access Key
2. **Supabase** — create `playoffe-staging` project (ap-southeast-1), save ref + keys + DB password; create Personal Access Token
3. **Vercel** — `cd apps/web && vercel login && vercel link`; create API token; add `staging.playoffe.com` domain
4. **`staging.tfvars`** — fill `vpc_id`, `subnet_ids`, `supabase_storage_url`
5. **Terraform** — `cd infra && terraform init && terraform apply -var-file="environments/staging.tfvars"` (set all `TF_VAR_*` env vars first — see `infra/README.md` for full list)
6. **Supabase migrations** — `supabase db push --project-ref <ref>`; create `social-graphics` storage bucket (public)
7. **GitHub secrets** — add 8 secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SUPABASE_ACCESS_TOKEN`, `STAGING_SUPABASE_PROJECT_REF`, `DEV_SUPABASE_URL`, `DEV_SUPABASE_ANON_KEY`, `DEV_SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`
8. **Validate** — empty commit to master → watch `staging-deploy.yml` → verify `staging.playoffe.com` live

Full step-by-step commands are in `DAILY_HANDOFF.md` and `infra/README.md`.

---

### Local dev setup
```bash
supabase start
docker start pickleball-redis
cd apps/web && (unset ANTHROPIC_API_KEY && npm run dev)
cd workers && pnpm dev
```

**Test accounts:** `alex@playoffe.dev` / `TestPass123!` (Super Admin) · `sam@playoffe.dev` / `TestPass123!` (Club Owner)

Please read `DAILY_HANDOFF.md` in the repo root, confirm what you understand, then ask which provisioning step to start with.
