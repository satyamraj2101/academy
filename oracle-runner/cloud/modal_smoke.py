# Smoke test: proves the Modal account works and shows what a small CPU container looks like. Costs a few cents of credit at most.
import modal

app = modal.App("academy-smoke")
image = modal.Image.debian_slim(python_version="3.12")


@app.function(image=image, cpu=2, memory=2048, timeout=120)
def probe():
    import os, platform, time
    t0 = time.perf_counter()
    n = 0
    while time.perf_counter() - t0 < 1.0:  # one second of single-core integer work, to compare machines
        n += 1
    with open("/proc/cpuinfo") as f:
        model = next((l.split(":", 1)[1].strip() for l in f if l.startswith("model name")), "unknown")
    return {"cpu_count": os.cpu_count(), "arch": platform.machine(), "model": model, "loops_per_sec": n}


@app.local_entrypoint()
def main():
    print(probe.remote())
