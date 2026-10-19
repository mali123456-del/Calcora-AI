# Phase 3B: Controlled Web Research and Crawler Architecture

## 1. Overview and Core Philosophy

Calcora AI Controlled Web Research connects the mathematical assistant to external reference data while enforcing strict network boundaries. It is designed around three principles:
1. **SSRF Immune:** Prevents any access to internal private networks, cloud metadata endpoints, loopback, or non-standard ports.
2. **Deterministic & Bounded:** Strictly caps request concurrency, depth, page sizes, and timeouts.
3. **No Hallucinated Citations:** All citations must correspond to real crawled content with verifiable hashes, canonical URLs, and retrieval timestamps.

## 2. Server-Side Request Forgery (SSRF) Defenses

Before establishing any connection or executing HTTP requests, target URLs must pass multi-stage validation:

### 2.1 Protocol and Port Policy
- Permitted protocols: `http:` and `https:` only.
- Rejected protocols: `file:`, `ftp:`, `data:`, `gopher:`, `blob:`, etc.
- Permitted ports: `80`, `443`, `8080`, `8443`. All other ports are blocked.

### 2.2 Network Address Filtering
Every resolved IP address is verified against private, loopback, and cloud metadata CIDR ranges:
- `0.0.0.0/8` (Local identification)
- `127.0.0.0/8` & `::1` (Loopback)
- `10.0.0.0/8` (RFC 1918 Private)
- `172.16.0.0/12` (RFC 1918 Private)
- `192.168.0.0/16` (RFC 1918 Private)
- `169.254.0.0/16` & `fe80::/10` (Link-local & Cloud Metadata endpoint, e.g. `169.254.169.254`)
- `100.64.0.0/10` (Carrier-grade NAT)
- `224.0.0.0/4` & `240.0.0.0/4` (Multicast / Reserved)
- Hostnames `localhost`, `metadata.google.internal`, and `.localhost` are blocked by rule.

### 2.3 Re-validation on Redirects
HTTP 3xx redirects are configured as `redirect: 'manual'`. Every subsequent `Location` target is re-validated through the full SSRF pipeline before continuing.

## 3. Crawler Bounds and Limits

- **Maximum Pages per Query:** 5 pages
- **Maximum Crawl Depth:** 2 hops
- **Maximum Page Size:** 512 KB
- **Network Timeout:** 6,000 ms per request
- **User Agent:** `CalcoraAI-ResearchBot/1.0 (+https://calcora.app/bot)`

## 4. Robots.txt Compliance

The crawler inspects `robots.txt` at the target origin root. Any paths matching `Disallow` rules for `User-agent: *` or `CalcoraAI-ResearchBot` are skipped and recorded in the diagnostic warnings.

## 5. Verified Citation Format

All citations derived from web research follow the verifiable format:
```text
[Web: <Page Title> | <Canonical URL> | Retr: YYYY-MM-DD]
```
If research returns insufficient or blocked data, the system yields an explicit uncertainty report rather than generating synthetic information.
