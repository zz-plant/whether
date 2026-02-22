# Domain recommendation for public launch

## Final decision

The production domain is **`whether.work`**.

Use **`whetherhq.com`** only as a defensive redirect domain (buy it if available and 301 it to the primary).

## Why this choice is strong

- **Best semantic fit:** the product is operational guidance for leadership teams, so `.work` maps directly to positioning.
- **Cleaner brand:** `whether.work` is shorter and less corporate-sounding than `whetherhq.com`.
- **High memorability:** easier to remember in conversations, decks, podcasts, and outbound.

## Tradeoff to acknowledge

- `.com` can feel more "standard" for some buyers. That is why buying `whetherhq.com` and redirecting it is still recommended.

## Suggested domain layout

- **Primary marketing + app:** `whether.work`
- **Optional app subdomain (if separating later):** `app.whether.work`
- **API surface (if externally consumed):** `api.whether.work`
- **Docs (if moved out of repo):** `docs.whether.work`
- **Defensive redirect:** `whetherhq.com` -> `https://whether.work`

## Canonical URL guidance

Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin and keep redirects strict:
- `http` -> `https`
- `www` -> apex (or vice versa; pick one and enforce)
- all secondary domains -> canonical primary domain

## Availability check (repeat before purchase)

Check both domains immediately before buying:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://rdap.identitydigital.services/rdap/domain/whether.work
curl -s -o /dev/null -w "%{http_code}\n" https://rdap.verisign.com/com/v1/domain/whetherhq.com
```

- `404` typically means no registration record found at query time.
- `200` typically means registered.

## Rollout checklist

1. Buy `whether.work` + defensive domains (`whetherhq.com`, key typos if available).
2. Configure TLS + HSTS on the primary domain.
3. Set `NEXT_PUBLIC_SITE_URL=https://whether.work`.
4. Configure 301 redirects from secondary domains to canonical.
5. Verify canonical tags + sitemap use only the primary origin.
