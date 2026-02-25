#!/usr/bin/env python3
"""Network-level page-load audit for whether.work routes.

Collects curl timing fields and selected response headers, then prints
JSON that can be pasted into docs.
"""
from __future__ import annotations

import json
import statistics
import subprocess
from dataclasses import dataclass
from typing import Any

URLS = [
    "https://whether.work/",
    "https://whether.work/signals",
    "https://whether.work/operations",
    "https://whether.work/operations/decisions",
    "https://whether.work/operations/briefings",
    "https://whether.work/methodology",
    "https://whether.work/guides",
    "https://whether.work/solutions",
]
RUNS_PER_URL = 7


@dataclass
class Sample:
    dns_s: float
    connect_s: float
    tls_s: float
    ttfb_s: float
    total_s: float
    bytes_downloaded: int
    http_code: int
    upstream_service_time_ms: int | None


def parse_curl_response(raw: str) -> Sample:
    raw = raw.strip()
    metrics_line = raw.splitlines()[-1]
    metrics = metrics_line.split()

    upstream_service_time_ms = None
    for line in raw.splitlines():
        if line.lower().startswith("x-envoy-upstream-service-time:"):
            try:
                upstream_service_time_ms = int(line.split(":", 1)[1].strip())
            except ValueError:
                upstream_service_time_ms = None

    return Sample(
        dns_s=float(metrics[0]),
        connect_s=float(metrics[1]),
        tls_s=float(metrics[2]),
        ttfb_s=float(metrics[3]),
        total_s=float(metrics[4]),
        bytes_downloaded=int(metrics[5]),
        http_code=int(metrics[6]),
        upstream_service_time_ms=upstream_service_time_ms,
    )


def run_sample(url: str) -> Sample:
    cmd = [
        "curl",
        "-sS",
        "-D",
        "-",
        "-o",
        "/dev/null",
        "-w",
        "\n\n%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total} %{size_download} %{http_code}",
        url,
    ]
    output = subprocess.check_output(cmd, text=True)
    return parse_curl_response(output)


def percentile(values: list[float], pct: int) -> float:
    # nearest-rank percentile; simple/reproducible for small samples
    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = max(0, min(len(sorted_values) - 1, round((pct / 100) * len(sorted_values) + 0.5) - 1))
    return sorted_values[idx]


def summarize(samples: list[Sample]) -> dict[str, Any]:
    ttfb = [s.ttfb_s for s in samples]
    total = [s.total_s for s in samples]
    upstream = [s.upstream_service_time_ms for s in samples if s.upstream_service_time_ms is not None]

    summary = {
        "http_codes": sorted({s.http_code for s in samples}),
        "avg_ttfb_s": round(statistics.mean(ttfb), 3),
        "p50_ttfb_s": round(percentile(ttfb, 50), 3),
        "p90_ttfb_s": round(percentile(ttfb, 90), 3),
        "min_ttfb_s": round(min(ttfb), 3),
        "max_ttfb_s": round(max(ttfb), 3),
        "avg_total_s": round(statistics.mean(total), 3),
        "avg_bytes": int(statistics.mean([s.bytes_downloaded for s in samples])),
        "avg_dns_s": round(statistics.mean([s.dns_s for s in samples]), 3),
        "avg_connect_s": round(statistics.mean([s.connect_s for s in samples]), 3),
        "avg_tls_s": round(statistics.mean([s.tls_s for s in samples]), 3),
    }

    if upstream:
        summary["avg_upstream_service_time_ms"] = round(statistics.mean(upstream), 1)
        summary["p90_upstream_service_time_ms"] = round(percentile([float(v) for v in upstream], 90), 1)

    return summary


def main() -> None:
    report: dict[str, Any] = {
        "runs_per_url": RUNS_PER_URL,
        "urls": {},
    }

    for url in URLS:
        samples = [run_sample(url) for _ in range(RUNS_PER_URL)]
        report["urls"][url] = {
            "summary": summarize(samples),
            "samples": [s.__dict__ for s in samples],
        }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
