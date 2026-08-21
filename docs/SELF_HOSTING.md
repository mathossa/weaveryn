# Self-hosting Weaveryn with Portainer

This guide describes the current supported self-hosting shape for a single Weaveryn instance using Portainer, PostgreSQL, and an existing reverse proxy such as Nginx Proxy Manager.

Weaveryn is still in early development. A deployment that tracks `main` is an **edge/development deployment**, not a stable release. See [Release and Versioning Policy](development/RELEASES.md).

## Architecture

The production stack adds two containers:

- `app` — Weaveryn / Next.js
- `postgres` — PostgreSQL 17

An existing reverse proxy terminates HTTPS and forwards traffic to the Weaveryn app over a dedicated Docker network.

```text
client
  |
  | HTTPS
  v
Nginx Proxy Manager
  |
  | HTTP on dedicated Docker proxy network
  v
Weaveryn app :3000
  |
  | internal-only Docker backend network
  v
PostgreSQL :5432
```

The app and database do not publish host ports. PostgreSQL is not attached to the proxy network.

No Redis, worker, or separate web-server container is currently required.

## Container image policy

Validated `main` builds are published as:

```text
ghcr.io/mathossa/weaveryn:edge
```

The same build is also published with an immutable short-SHA tag, for example:

```text
ghcr.io/mathossa/weaveryn:sha-1a2b3c4
```

Use `edge` when intentionally tracking `main`. Use an immutable SHA tag when reproducibility or rollback is more important.

Stable releases will use versioned image tags according to `docs/development/RELEASES.md`; `edge` must not be treated as a stable release.

## 1. Create a dedicated proxy network

In Portainer, create a bridge network named:

```text
weaveryn-proxy
```

Attach the existing Nginx Proxy Manager container to this network. It may remain attached to its existing networks as well.

Only Nginx Proxy Manager and the Weaveryn app should normally need this network. Keeping it dedicated reduces the number of containers that can directly reach Weaveryn while proxy headers are trusted for admin-network checks.

## 2. Configure GHCR access

If the Weaveryn GHCR package is public, no registry credentials are required.

If it is private, add `ghcr.io` as a Portainer registry using a GitHub token that has permission to read the package.

## 3. Create the Portainer stack

Create a stack from the Git repository:

```text
Repository: https://github.com/mathossa/weaveryn
Reference:  refs/heads/main
Compose:    compose.production.yml
```

For a deployment that should remain pinned to a reviewed source revision, prefer an immutable image tag in the environment table even if the stack definition itself is read from `main`.

## 4. Portainer environment table

Do not create a production `.env` file. Enter the values in the Portainer stack environment-variable table.

Required values:

| Variable                      | Example                       | Purpose                                                 |
| ----------------------------- | ----------------------------- | ------------------------------------------------------- |
| `PROXY_NETWORK`               | `weaveryn-proxy`              | Existing Docker network shared with Nginx Proxy Manager |
| `POSTGRES_DB`                 | `weaveryn`                    | Production database name                                |
| `POSTGRES_USER`               | `weaveryn`                    | Production database user                                |
| `POSTGRES_PASSWORD`           | generated value               | PostgreSQL password                                     |
| `BETTER_AUTH_SECRET`          | generated value               | Better Auth signing/encryption secret                   |
| `BETTER_AUTH_URL`             | `https://weaveryn.example.nl` | Public browser-facing URL                               |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://weaveryn.example.nl` | Allowed browser origin                                  |

Optional values:

| Variable                    | Default           | Purpose                                                   |
| --------------------------- | ----------------- | --------------------------------------------------------- |
| `WEAVERYN_IMAGE_TAG`        | `edge`            | Image tag to deploy, such as `edge` or `sha-1a2b3c4`      |
| `ADMIN_ALLOWED_CIDRS`       | empty             | Client networks allowed to access instance administration |
| `ADMIN_TRUST_PROXY_HEADERS` | `false`           | Trust the configured proxy client-IP header               |
| `ADMIN_CLIENT_IP_HEADER`    | `x-forwarded-for` | Header used to determine the original client IP           |

### Generate the database password

Use a URL-safe value because the Compose stack constructs `DATABASE_URL` from the database variables:

```bash
openssl rand -hex 32
```

### Generate the Better Auth secret

```bash
openssl rand -base64 32
```

Use a different Better Auth secret for every deployment and do not commit it.

## 5. Admin network access

Instance administration fails closed when `ADMIN_ALLOWED_CIDRS` is empty.

If admin access is required through Nginx Proxy Manager, configure the allowed client network and enable proxy-header trust, for example:

```text
ADMIN_ALLOWED_CIDRS=192.168.10.0/24
ADMIN_TRUST_PROXY_HEADERS=true
ADMIN_CLIENT_IP_HEADER=x-forwarded-for
```

Only enable proxy-header trust when the app cannot be reached directly by untrusted clients and the reverse proxy overwrites the forwarded client-IP header. The production Compose stack therefore does not publish application port `3000` to the host and uses the dedicated proxy network described above.

## 6. Configure Nginx Proxy Manager

Create a Proxy Host with approximately these values:

```text
Domain:           weaveryn.example.nl
Scheme:           http
Forward hostname: weaveryn-app
Forward port:     3000
WebSocket support: enabled
```

The hostname `weaveryn-app` is a network alias supplied by `compose.production.yml` on the proxy network.

Terminate TLS at Nginx Proxy Manager. The connection from the proxy to the app can remain HTTP on the private Docker network.

For an internal/self-signed certificate, ensure all client devices trust the issuing certificate authority. Prefer a private CA that signs the Weaveryn certificate over distributing trust for an individual self-signed leaf certificate.

`BETTER_AUTH_URL` must still use the public HTTPS URL seen by the browser.

## 7. Deploy

Deploy the Portainer stack.

Expected startup order:

1. PostgreSQL starts.
2. PostgreSQL passes `pg_isready`.
3. The app container starts.
4. `prisma migrate deploy` applies committed pending migrations.
5. Next.js starts on port `3000`.

The PostgreSQL data lives in the named volume `weaveryn-postgres-data` managed under the stack namespace.

## Updating an edge deployment

After a change is merged into `main`:

1. The normal `CI` workflow validates the commit.
2. If CI succeeds, the publish workflow builds that exact commit.
3. GHCR receives `edge` and `sha-<short-sha>` tags for that image.
4. In Portainer, pull/redeploy the stack to consume the new `edge` image.

The app runs `prisma migrate deploy` before starting, so committed pending migrations are applied during the container restart.

## Rollback

For an application rollback, change:

```text
WEAVERYN_IMAGE_TAG=edge
```

to a known-good immutable tag, for example:

```text
WEAVERYN_IMAGE_TAG=sha-1a2b3c4
```

and redeploy the stack.

Application rollback does **not** automatically reverse a database migration. Schema migrations therefore need to remain backwards-compatible when rollback is expected.

## Backups

The first production hardening addition should be automated PostgreSQL backups stored outside the database volume. A backup process is deliberately not bundled into the initial two-container stack so backup destination, encryption, retention, and restore testing can be chosen explicitly for the host environment.

Do not treat the Docker volume itself as a backup.
