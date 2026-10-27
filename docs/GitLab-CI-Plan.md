# แผน GitLab CI/CD — `FORTH/dtrs-app`

> **สถานะ:** ✅ **implement แล้ว** — [`.gitlab-ci.yml`](../.gitlab-ci.yml) (UAT `staging` + PRD `main`/`master`, manual deploy)  
> **อ้างอิงแบบ:** GitLab CI ของ **EAS/EMS** (Expense and Allowance System)  
> **Migration รวม:** [`DTRS-Migration-Checklist.md`](./DTRS-Migration-Checklist.md) · Variables: [`GitLab-CI-Variables-Checklist.md`](./GitLab-CI-Variables-Checklist.md)  
> **Pipeline ปัจจุบัน:** [`.gitlab-ci.yml`](../.gitlab-ci.yml)

**วันที่ตกลงแผน:** 2026-08-05 · **Grilling ปิดแล้ว:** 2026-08-05 (คำถามเปิด 6/6 ✅) · **Hardening CI:** 2026-08-05 · **UAT Variables:** กลุ่ม A + MinIO กลุ่ม B + SSH/path `.115` ✅ (2026-08-06) · **PRD prep (2026-10-26):** UAT smoke ✅ · กลุ่ม A/MinIO production กำลังตั้ง · SSH PRD เลื่อน · NPM/DNS ยังไม่พร้อม

---

## สรุปสั้น

| หัวข้อ | ปัจจุบัน (ใน repo) | เป้าหมาย (แผนนี้) |
|--------|-------------------|-------------------|
| Environment | **UAT + PRD** ✅ | **UAT + PRD** |
| Branch | **`staging`** + **`main`/`master`** ✅ | **`staging`** (UAT), **`main`/`master`** (PRD) |
| Deploy | **UAT:** `docker run` · **PRD:** `docker compose` (`docker-compose.prod.yml`) ✅ | UAT คง `docker run`; PRD ใช้ compose (2026-10-26) |
| Build image PRD | Build **`.115`** → **push registry** → deploy **`.128` pull** ✅ | ไม่ใช้ `save`/`scp`/`load` |
| Build image UAT | Build **`.115`** → **push** → deploy **`.115` pull+retag** ✅ | Build บน **`.115`**, deploy **`nurdin@192.168.0.115`** |
| Test stage | **`test:frontend` + `test:backend`** ✅ | **`test:frontend` (lint)** + **`test:backend` (eslint ห้าม `--fix` + jest)** — fail = pipeline หยุด |
| Deploy env gate | **`.deploy_ssh_and_validate`** ✅ | ตรวจกลุ่ม A + **กลุ่ม E (`REGISTRY_URL`)** ก่อน manual deploy |
| Deploy health | **`docker inspect` Running** ✅ | หลัง `docker run -d` ถ้า container ตาย → job fail + `docker logs` |
| Registry | **`REGISTRY_URL`** + [`scripts/ci-registry.sh`](../scripts/ci-registry.sh) ✅ | push ตอน build · pull+retag ตอน deploy · USER/PASSWORD optional |
| Cleanup `needs` | **ไม่รอ manual deploy** ✅ | UAT/PRD `needs: docker_build:*` |
| Runner tags | `docker` + `forth` ✅ | **`docker` + `forth`** |
| Rollback / Slack | ไม่มี | **ยังไม่เอารอบแรก** |

**ข้อจำกัดจาก migration (ห้ามละเมิด):** ดู [`DTRS-Migration-Checklist.md` § P0](./DTRS-Migration-Checklist.md#p0--ต้องทำก่อน-deploy-ครั้งแรกชนกับ-cctv-app_ticket) — ชื่อ container/image/network แยกจาก `cctv-app_ticket`, **ห้าม** `docker rm` container ของ production เก่า

---

## ความต่างโครงสร้าง: EAS vs dtrs-app

| | EAS/EMS | dtrs-app |
|--|---------|----------|
| สถาปัตยกรรม | Frontend 1 container | **Backend + Frontend** 2 containers |
| Deploy | `docker compose` + ไฟล์แยก env | **UAT:** `docker run` · **PRD:** `docker-compose.prod.yml` (image จาก registry pull+retag) |
| Env ใน CI | DEV + UAT + PROD | **UAT + PRD** (ไม่มี DEV) |
| Image ต่อ deploy | 1 image | **2 images** (`dtrs-app-backend`, `dtrs-app-frontend`) |
| Backend env ใน deploy | ไม่มี (เรียก Portal API ภายนอก) | `DATABASE_URL`, JWT, MinIO, CORS, … ผ่าน `-e` |

---

## Topology ที่ตกลงแล้ว

### UAT (`staging` branch)

| รายการ | ค่า |
|--------|-----|
| GitLab Environment | **`staging`** (ตรง scope Variables) |
| Deploy path | **`/home/nurdin/dtrs-app`** ✅ สร้างบน server แล้ว (2026-08-05) |
| Deploy SSH | **`nurdin@192.168.0.115`** — SSH ด้วย key `dtrs-app-uat` จากเครื่อง dev **ผ่านแล้ว** |
| MySQL | host **`192.168.0.11`**, db **`dtrs_app`** (grilling #3) |
| MinIO bucket | **`dtrs-app-uat`** (grilling #4) |
| Docker build host | `tcp://192.168.0.115:2375` |
| Host ports | **8404→3000** (frontend), **8405→4100** (backend) — **เหมือน PRD** (คนละเครื่องจึงไม่ชน) |
| Container names | `dtrs-app-backend`, `dtrs-app-frontend` |
| Network | `dtrs-app-net` |
| Image tags | `dtrs-app-backend:uat-latest`, `dtrs-app-frontend:uat-latest`, `*-{sha}-uat` |
| URL (ชั่วคราว) | **`http://192.168.0.115:8404`** — domain UAT ยังไม่ตัดสิน |

### PRD (`main` / `master`)

| รายการ | ค่า |
|--------|-----|
| GitLab Environment | `production` |
| Deploy SSH | **`nurdin@192.168.0.128`** |
| Deploy path | **`/home/nurdin/dtrs-app`** ✅ |
| Docker build host | **`tcp://192.168.0.115:2375`** (build+push) → deploy pull บน `.128` (`DOCKER_HOST_PRD`) |
| Host ports | **8404→3000**, **8405→4100** ✅ ([Migration P0 #9–10](./DTRS-Migration-Checklist.md#พอร์ต-host-ถ้ารันคู่กับ-prd-เดิมบนเครื่องเดียวกัน)) |
| Domain | **`https://dtrs-app.forth.co.th`** ✅ |
| MySQL | host **`192.168.0.126`**, db **`dtrs_app`** (grilling #3) |
| MinIO bucket | **`dtrs-app`** — Variables กลุ่ม B ✅ · แยกจาก UAT `dtrs-app-uat` เมื่อทำ PRD ([P2](./DTRS-Migration-Checklist.md#p2--environment--env-local--prd)) |
| NPM | `dtrs-app.forth.co.th` → 8404/8405 — ⏸️ **pending** ([Migration P0 #11](./DTRS-Migration-Checklist.md#พอร์ต-host-ถ้ารันคู่กับ-prd-เดิมบนเครื่องเดียวกัน)) |

### พอร์ตและชื่อ resource (sync กับ migration)

อ้างอิง [DTRS-Migration-Checklist.md § P0](./DTRS-Migration-Checklist.md#docker--ci--ชื่อ-image-container-network):

| Resource | ค่า dtrs-app | แยกจาก cctv-app_ticket |
|----------|--------------|------------------------|
| Image backend | `dtrs-app-backend` | ✅ |
| Image frontend | `dtrs-app-frontend` | ✅ |
| Container backend | `dtrs-app-backend` | ✅ (cctv ใช้ `8309→3000` / `8310→4000`) |
| Container frontend | `dtrs-app-frontend` | ✅ |
| Network | `dtrs-app-net` | ✅ |
| `API_INTERNAL_BASE_URL` | `http://dtrs-app-backend:4100/api` | ✅ |

---

## Pipeline เป้าหมาย

### Stages

```text
test → build → deploy → deploy_docker → cleanup
```

*(ไม่มี `rollback` รอบแรก — ตามที่ตัดสินใจ)*

### Workflow rules (จาก EAS)

```yaml
workflow:
  rules:
    - if: '$CI_COMMIT_BRANCH =~ /^feat\/.*$/'
      when: never
    - when: always
```

### แผนภาพ flow

```mermaid
flowchart TD
  subgraph staging [branch staging]
    T1[test:frontend + test:backend]
    B1[build:frontend + build:backend]
    DB1["docker_build:uat (push registry)"]
    D1["deploy:uat:docker pull+retag (MANUAL)"]
    T1 --> B1 --> DB1 --> D1
  end

  subgraph main [branch main/master]
    T2[test:frontend + test:backend]
    B2[build:frontend + build:backend]
    DB2["docker_build:prd (push registry)"]
    D2["deploy:prd:docker pull+retag + compose (MANUAL)"]
    T2 --> B2 --> DB2 --> D2
  end
```

### Jobs ที่คาดว่าจะเพิ่ม/เปลี่ยน

| Job | Stage | Branch | Manual? | หมายเหตุ |
|-----|-------|--------|---------|----------|
| `test:frontend` | test | `staging`, `main`, `master` | ไม่ | `npm ci` → **`npm run lint`** — fail = หยุด |
| `test:backend` | test | `staging`, `main`, `master` | ไม่ | `npm ci` → `npx prisma generate` → **`npx eslint …` (ห้าม `--fix`)** → **`npm test`** — fail = หยุด |
| `build:frontend` | build | `staging`, `main`, `master` | ไม่ | artifacts = `.next/standalone` + `.next/static` + `public` (ไม่ส่ง `.next/cache`) |
| `build:backend` | build | `staging`, `main`, `master` | ไม่ | ขยายจาก PRD-only ปัจจุบัน |
| `deploy:summary` | deploy | ทั้งสองกลุ่ม branch | ไม่ | รายงานสั้น ๆ (optional) |
| `docker_build:uat` | deploy_docker | `staging` | **ใช่** | build 2 images บน `.115` + **push registry** — **manual** |
| `deploy:uat:docker` | deploy_docker | `staging` | **ใช่** | **pull+retag** แล้ว `docker run` บน `.115` — **manual** · กลุ่ม A+E · ตรวจ Running |
| `docker_build:prd` | deploy_docker | `main`, `master` | **ใช่** | build 2 images บน `.115` + **push registry** — **manual** |
| `deploy:prd:docker` | deploy_docker | `main`, `master` | **ใช่** | **pull+retag** + scp compose + `compose up` บน `.128` — **manual** · `needs: docker_build:prd` |
| `cleanup:docker:uat` | cleanup | `staging` | ใช่ | `needs: docker_build:uat` — local `.115` เฉพาะแท็ก UAT ของ `dtrs-app-*` (KEEP=2) · **ไม่** `prune` ทั้ง host · **ไม่** ลบ tag บน registry |
| `cleanup:docker:prd` | cleanup | `main`, `master` | ใช่ | `needs: docker_build:prd` — `.115` ผ่าน `DOCKER_HOST_BUILD` + `.128` ผ่าน SSH · เฉพาะแท็ก PRD · registry ลบมือ |

> **Removed (2026-10-27):** job `transfer:prd:images` (`docker save` / scp / `docker load`) — แทนด้วย registry push/pull

### Deploy script pattern (คงจาก CI ปัจจุบัน)

UAT และ PRD ใช้รูปแบบเดียวกับ [`deploy:prd:docker`](../.gitlab-ci.yml) ปัจจุบัน:

1. SSH ไป deploy server
2. `docker network create dtrs-app-net` (ถ้ายังไม่มี)
3. `docker rm -f dtrs-app dtrs-app-backend dtrs-app-frontend` — **เฉพาะ prefix `dtrs-app-*`** (ไม่แตะ `cctv-app-ticket-*`)
4. `docker run` backend พร้อม env จาก GitLab Variables (+ cpus/memory/pids/tmpfs)
5. `docker run` frontend พร้อม `NEXTAUTH_*`, `API_INTERNAL_BASE_URL`
6. **sleep 5s** → `docker inspect` ทั้งสอง container ต้อง `Running=true` — ไม่งั้น fail + `docker logs`

**Backend env ที่ส่งเข้า container** — sync กับ [GitLab-CI-Variables-Checklist.md § Mapping](./GitLab-CI-Variables-Checklist.md#mapping-variable--container)

**Frontend build-arg:** `NEXT_PUBLIC_API_BASE_URL` (bake ตอน build — ต้องแยกค่า UAT vs PRD) · optional GlitchTip: `NEXT_PUBLIC_SENTRY_DSN` (bake) + `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (bake, optional) + `SENTRY_DSN` / `SENTRY_URL` (`-e` ตอน docker run) — `SENTRY_DSN` กับ `NEXT_PUBLIC_SENTRY_DSN` ต้องเป็นโปรเจกต์เดียวกัน; โฮสต์ frontend (UAT `.115` / PRD `.128`) ต้องถึง `SENTRY_URL:8700`

### Deploy env validation (ก่อน manual deploy)

Template **`.validate_deploy_env`** + **`.deploy_ssh_and_validate`** (extends `.ssh_setup`):

| ตรวจก่อน deploy | หมายเหตุ |
|-----------------|----------|
| `DATABASE_URL` | scope `staging` / `production` |
| `JWT_SECRET` | |
| `NEXTAUTH_SECRET` | |
| `NEXTAUTH_URL` | |
| `FRONTEND_BASE_URL` | ใช้เป็น GitLab Environment URL ด้วย |
| `ALLOWED_ORIGINS` | |
| `SSH_PRIVATE_KEY` | เช็กใน `.ssh_setup` (ก่อน validation ชุดนี้) |

**ไม่ validate รอบนี้:** `MINIO_*` (กลุ่ม B ตั้งแล้วแต่ไม่บังคับใน gate) · `NEXT_PUBLIC_API_BASE_URL` (build time)

รายละเอียดตัวแปร: [`GitLab-CI-Variables-Checklist.md` § กลุ่ม A](./GitLab-CI-Variables-Checklist.md#กลุ่ม-a--บังคับก่อน-deploy-ตั้งได้เลย)

---

## PRD / UAT: Private registry (แทน transfer)

```text
Runner → DOCKER_HOST_BUILD (.115)
  → docker build + tag ชื่อสั้นแค่ 2 ต่อ image (`{sha}-uat|prd` + `uat-latest`|`latest-prd`) · push แล้ว untag ชื่อ registry บน host
  → optional manual `cleanup:docker:*` — ลบ local เก่า/legacy ของ `dtrs-app-*` ต่อ env (PRD ทั้ง build+deploy host); registry UI ลบมือ
  → docker tag/push ${REGISTRY_URL}/dtrs-app/dtrs-app-*:…
deploy:* → DOCKER_HOST_UAT|PRD
  → docker pull registry… → docker tag ชื่อสั้น
  → SSH: docker run (UAT) / compose up (PRD)
```

**Host gate:** `insecure-registries` รวมค่าใน `REGISTRY_URL` บน `.115` และ `.128`  
**Auth:** `REGISTRY_USER`/`PASSWORD` optional — ว่าง = anonymous · 401 → ตั้ง credential  
**Rollback:** revert commit CI ที่ตัด `transfer:prd:images` (ไม่มี dual-path ใน YAML)

**หมายเหตุ sync migration:** [P0 #14](./DTRS-Migration-Checklist.md#deploy-path--ssh) — registry push/pull ✅ (ตัด transfer 2026-10-27)

---

## GitLab CI/CD Variables — scope ตาม environment

ใช้ **Environment scope** ใน GitLab สำหรับค่าที่ต่างกันระหว่าง UAT กับ PRD:

| Variable | Scope `staging` (UAT) | Scope `production` (PRD) |
|----------|----------------------|---------------------------|
| `DATABASE_URL` | `mysql://USER:***@192.168.0.11:3306/dtrs_app` | `mysql://USER:***@192.168.0.126:3306/dtrs_app` |
| `NEXTAUTH_URL` | `http://192.168.0.115:8404` (ชั่วคราว) | `https://dtrs-app.forth.co.th` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://192.168.0.115:8405/api` (ชั่วคราว) | `https://dtrs-app.forth.co.th/api` |
| `FRONTEND_BASE_URL` | `http://192.168.0.115:8404` | `https://dtrs-app.forth.co.th` |
| `ALLOWED_ORIGINS` | `http://192.168.0.115:8404` | `https://dtrs-app.forth.co.th` |
| `MINIO_BUCKET_NAME` | **`dtrs-app-uat`** ✅ (GitLab) | **`dtrs-app`** — ⏸️ pending แยกค่าตอนทำ PRD ถ้ายัง scope all ค่า UAT |
| `JWT_SECRET` / `NEXTAUTH_SECRET` | rotate แยก UAT | rotate แยก PRD — [Migration P8 #67](./DTRS-Migration-Checklist.md#p8--security-แนะนำเมื่อ-fork) |
| `SSH_PRIVATE_KEY` | key สำหรับ `nurdin@115` | key สำหรับ `nurdin@128` — **ชื่อตัวแปรเดียว แยก scope** (grilling #2) |

รายละเอียด PRD + UAT: [`GitLab-CI-Variables-Checklist.md`](./GitLab-CI-Variables-Checklist.md)

### Deploy host/path — ตั้งใน **GitLab CI/CD Variables** (ไม่ hardcode ใน YAML)

| Variable | UAT (`staging`) | PRD (`production`) |
|----------|-----------------|---------------------|
| `DOCKER_HOST_BUILD` | `tcp://192.168.0.115:2375` (scope all หรือทั้งสอง env) | เหมือนกัน — build บน `.115` |
| `DOCKER_HOST_UAT` / `DOCKER_HOST_PRD` | `tcp://192.168.0.115:2375` | `tcp://192.168.0.128:2375` |
| `DEPLOY_SERVER_UAT` / `DEPLOY_SERVER_PRD` | `nurdin@192.168.0.115` | `nurdin@192.168.0.128` |
| `DEPLOY_PATH_UAT` / `DEPLOY_PATH_PRD` | `/home/nurdin/dtrs-app` | `/home/nurdin/dtrs-app` |
| `API_INTERNAL_BASE_URL` | default ใน YAML: `http://dtrs-app-backend:4100/api` | เหมือนกัน |

---

## สิ่งที่นำจาก EAS แล้ว (ตัดสินใจ)

- [x] **Manual deploy** — build อัตโนมัติ, deploy กดยืนยัน
- [x] **Test stage** ก่อน build
- [x] **Workflow** ข้าม branch `feat/*`
- [x] **Runner tags** `docker` + `forth`
- [x] **UAT + PRD** (ไม่มี DEV)
- [x] **Branch UAT** = `staging`
- [x] **Port mapping เหมือนกัน** 8404/8405 ทั้ง UAT (.115) และ PRD (.128)
- [x] **PRD image transfer** build `.115` → deploy `.128`
- [x] **UAT คง `docker run`** · **PRD ใช้ `docker-compose.prod.yml`** (2026-10-26)

- [x] **`docker_build:uat` / `deploy:uat:docker` / PRD build+transfer — manual ทั้ง stage `deploy_docker`** (ปรับ 2026-08-06; เดิม grilling #5 เป็น build auto)
- [x] **Test gate:** frontend lint + backend eslint (ห้าม `--fix`) + `npm test` — fail หยุด pipeline (grilling #6)

- [x] **Deploy env validation** — `.deploy_ssh_and_validate` ก่อน manual deploy (2026-08-05)
- [x] **PRD `docker load` ใช้ `DOCKER_HOST_PRD`** — sync กับ deploy daemon (2026-08-05)
- [x] **Deploy health check** — container Running หลัง `docker run -d` (2026-08-06)
- [x] **transfer verify images** — `export DOCKER_HOST` ทั้ง session (2026-08-06)
- [x] **cleanup `needs`** — ไม่ติดคิวรอ manual deploy (2026-08-06)

## สิ่งที่ยังไม่เอารอบแรก

- [ ] Rollback stage + `ROLLBACK_*_COMMIT_SHA`
- [ ] Slack notifications
- [ ] Playwright E2E ใน CI (EAS มี manual optional)

---

## การตัดสินใจจาก Grilling (2026-08-05) ✅

| # | หัวข้อ | การตัดสินใจ |
|---|--------|-------------|
| 1 | Deploy path UAT | **`/home/nurdin/dtrs-app`** บน `.115` |
| 2 | SSH key | **`SSH_PRIVATE_KEY`** ชื่อเดียว — **แยกค่าด้วย GitLab environment scope** (`staging` / `production`) |
| 3 | Database | **UAT:** `192.168.0.11` / `dtrs_app` · **PRD:** `192.168.0.126` / `dtrs_app` |
| 4 | MinIO bucket | **UAT:** `dtrs-app-uat` · **PRD:** `dtrs-app` · Variables กลุ่ม B ✅ 2026-08-06 |
| 5 | `docker_build:uat` | **Manual** ทั้ง `docker_build` + deploy (stage `deploy_docker`) |
| 6 | Test stage | **`test:frontend`** = lint · **`test:backend`** = prisma generate + **eslint (ห้าม `--fix`)** + jest · **fail = pipeline หยุด** |

---

## Blockers (จาก migration — ไม่เกี่ยวแต่ block deploy)

| Blocker | อ้างอิง migration | สถานะ |
|---------|-------------------|--------|
| MinIO bucket PRD `dtrs-app` + UAT `dtrs-app-uat` | [P2 MinIO](./DTRS-Migration-Checklist.md#p2--environment--env-local--prd) | ✅ Variables ตั้งแล้ว · 🟡 ตรวจ bucket บน server หลัง deploy |
| GitLab Variables UAT (`staging` กลุ่ม A) | [P1 #16](./DTRS-Migration-Checklist.md#p1--gitlab-project-settings-ทำบน-gitlab-ui) | ✅ 2026-08-05 |
| GitLab Variables MinIO (กลุ่ม B) | [GitLab-CI-Variables-Checklist](./GitLab-CI-Variables-Checklist.md) | ✅ 2026-08-06 |
| GitLab Variables PRD (`production`) | [P1 #16](./DTRS-Migration-Checklist.md#p1--gitlab-project-settings-ทำบน-gitlab-ui) | 🟡 **กำลังตั้ง** (2026-10-26) — ดู Variables checklist §1c; SSH เลื่อน |
| SSH + path UAT `.115` | [P0 #12b–13c](./DTRS-Migration-Checklist.md#deploy-path--ssh) | ✅ append `authorized_keys` + `/home/nurdin/dtrs-app` |
| SSH + path PRD `.128` | [P0 #13](./DTRS-Migration-Checklist.md#deploy-path--ssh) | ⏸️ **เลื่อน** — รอ `SSH_PRIVATE_KEY` production |
| NPM `dtrs-app.forth.co.th` | [P0 #11](./DTRS-Migration-Checklist.md#พอร์ต-host-ถ้ารันคู่กับ-prd-เดิมบนเครื่องเดียวกัน) | ⏸️ **pending** — DNS ยัง resolve ไม่ได้ (2026-10-26) |
| MinIO host UAT=PRD แยก bucket | [GitLab-CI-Variables-Checklist](./GitLab-CI-Variables-Checklist.md) | ✅ ตกลง · รอ infra ค่า keys/`dtrs-app` |
| Runner `docker` + `forth` | [P1 #18](./DTRS-Migration-Checklist.md#p1--gitlab-project-settings-ทำบน-gitlab-ui) | ☐ (จำเป็นก่อน pipeline) |

---

## Verification หลัง implement (sync P9)

จาก [DTRS-Migration-Checklist.md § P9](./DTRS-Migration-Checklist.md#p9--การตรวจหลังแก้-verification):

### UAT (`staging`)

- [x] GitLab Variables กลุ่ม A scope `staging`
- [x] GitLab Variables กลุ่ม B MinIO (2026-08-06)
- [x] SSH `nurdin@192.168.0.115` + path `/home/nurdin/dtrs-app` (key `dtrs-app-uat`, ไม่ทับ `authorized_keys` ของโปรเจกต์อื่น)
- [ ] ยืนยัน Docker TCP `:2375` บน `.115` (`DOCKER_HOST=tcp://127.0.0.1:2375 docker ps`)
- [x] `http://192.168.0.115:8404` — smoke script ผ่าน (2026-10-26): login / redirect / font / backend API
- [ ] ไม่กระทบ container อื่นบน `.115` (เช่น EAS UAT port 8401) — ตรวจด้วยตาเมื่อ deploy รอบถัดไป

### PRD (`main`)

- [ ] กลุ่ม A scope `production` ครบ (ยกเว้น SSH ที่เลื่อน) — [`GitLab-CI-Variables-Checklist.md`](./GitLab-CI-Variables-Checklist.md) §1c
- [ ] MinIO `MINIO_BUCKET_NAME=dtrs-app` + keys จาก infra
- [ ] NPM + DNS `dtrs-app.forth.co.th` → `.128:8404/8405`
- [ ] `SSH_PRIVATE_KEY` production + path/Docker บน `.128`
- [ ] `prisma migrate deploy` หลัง `YES, MIGRATE production @192.168.0.126/dtrs_app`
- [ ] Image transfer 2 ไฟล์สำเร็จ — ยืนยัน `docker images` บน `.128` หลัง load (ผ่าน `DOCKER_HOST_PRD`)
- [ ] Manual deploy PRD หลัง `YES, DEPLOY production @192.168.0.128`
- [ ] `https://dtrs-app.forth.co.th` smoke หลัง NPM
- [ ] **`cctv-app-ticket-*` ยังทำงาน** — [P9 ไม่กระทบโปรเจกต์เก่า](./DTRS-Migration-Checklist.md#ไม่กระทบโปรเจกต์เก่า-บังคับ)

---

## ลำดับ implement

1. ~~อัปเดต [`.gitlab-ci.yml`](../.gitlab-ci.yml) ตามแผน job ด้านบน~~ ✅
2. ~~ขยาย [`GitLab-CI-Variables-Checklist.md`](./GitLab-CI-Variables-Checklist.md) — กลุ่ม UAT + environment scope~~ ✅
3. ~~Hardening: validate env ก่อน deploy + `DOCKER_HOST` ใน PRD transfer~~ ✅ (2026-08-05)
4. ~~ตั้ง GitLab Variables กลุ่ม A scope `staging` + SSH/path `.115`~~ ✅ (2026-08-05)
5. ~~UAT smoke HTTP~~ ✅ (2026-10-26)
6. **ถัดไป (PRD prep):** ใส่ Variables กลุ่ม A production ให้ครบ → รอ infra MinIO → NPM/DNS → SSH PRD → migrate+YES → manual deploy+YES

---

## เอกสารที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|------|--------|
| [`.gitlab-ci.yml`](../.gitlab-ci.yml) | Pipeline UAT+PRD (implement + hardening 2026-08-05) |
| [`DTRS-Migration-Checklist.md`](./DTRS-Migration-Checklist.md) | Checklist ย้ายจาก `cctv-app_ticket` — พอร์ต, ชื่อ container, MinIO, P9 |
| [`GitLab-CI-Variables-Checklist.md`](./GitLab-CI-Variables-Checklist.md) | ตัวแปร GitLab UI |
| [`docker-compose.yml`](../docker-compose.yml) | ทดสอบ local (ไม่ใช่ deploy CI) |
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Deploy PRD ผ่าน `deploy:prd:docker` (image pre-built) |
| [`backend/docs/Reverse-Proxy-Nginx-Proxy-Manager.md`](../backend/docs/Reverse-Proxy-Nginx-Proxy-Manager.md) | NPM 8404/8405 |
