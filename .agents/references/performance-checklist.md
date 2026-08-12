# Performance Checklist

General-purpose reference for `performance-optimization`. Use only sections
relevant to the measured bottleneck.

## Measurement

- [ ] User-visible metric and required threshold are explicit
- [ ] Workload and inputs are representative
- [ ] Environment, runtime, hardware, cache state, concurrency, and resource limits are fixed
- [ ] Baseline and result use the same command and conditions
- [ ] Sample count is fixed and sufficient to measure variance
- [ ] Distribution and tail behavior are measured where relevant, not only the mean
- [ ] Benchmark harness overhead is measured or insignificant
- [ ] Correctness tests run alongside performance measurements
- [ ] Relevant secondary metrics are captured

## Diagnosis

- [ ] Profiling identifies the actual bottleneck before optimization
- [ ] One independently measurable variable changes at a time
- [ ] CPU time, allocations, retained memory, I/O waits, locks, queues, pools, serialization, and external dependencies are considered
- [ ] Startup and steady-state behavior are separated where relevant
- [ ] Local measurements are checked against representative operational data when available

## Acceptance

- [ ] Improvement exceeds run-to-run variance
- [ ] Project-specific threshold is met
- [ ] Correctness and regression tests remain green
- [ ] Tail latency and resource use do not materially regress
- [ ] Neutral, harmful, or correctness-breaking changes are reverted

## CLI and Library Workloads

- [ ] Startup, initialization, imports, and dependency loading are measured
- [ ] Representative commands or public APIs are benchmarked
- [ ] Output, exit status, errors, and side effects remain unchanged
- [ ] CPU profiles identify algorithmic hot paths
- [ ] Allocation profiles identify unnecessary copying or retention
- [ ] Filesystem, serialization, and subprocess costs are isolated

## Services and Daemons

- [ ] Latency percentiles are measured under fixed concurrency
- [ ] Throughput is measured without hiding tail-latency or memory regressions
- [ ] Warm-up, connection pools, caches, and runtime compilation are controlled
- [ ] Request stages and external dependencies are traced separately
- [ ] Lock contention, queue depth, retries, timeouts, and backpressure are checked
- [ ] Sustained runs detect leaks and resource exhaustion

## Batch and Data Workloads

- [ ] Representative data size and distribution are fixed
- [ ] Processing rate, elapsed time, peak memory, and I/O volume are measured
- [ ] Scaling behavior is measured across multiple input sizes
- [ ] Backfills and bulk operations are tested under realistic load
- [ ] Parallelism does not violate ordering, consistency, or resource limits

## Database Workloads

- [ ] Query plans are inspected
- [ ] N+1 and unbounded query patterns are absent
- [ ] Indexes support measured access patterns
- [ ] Connection-pool behavior is measured under load
- [ ] Lock duration and contention are checked
- [ ] Result size, serialization, and network transfer are included

## Browser Workloads

- [ ] Field data is preferred when available
- [ ] LCP, INP, CLS, TTFB, bundle size, and long tasks are measured as relevant
- [ ] Images have appropriate formats, dimensions, responsive sources, and loading priority
- [ ] Rendering, layout, JavaScript, fonts, and network waterfalls are profiled
- [ ] Changes are verified on representative devices and network conditions

## Measurement Commands

Prefer repository-native benchmark and profiler commands. Examples:

```bash
# Repeated wall-clock benchmark
hyperfine --warmup 3 --runs 20 '<command>'

# Elapsed time and peak resources
/usr/bin/time -v <command>

# Linux CPU profiling
perf record --call-graph dwarf <command>
perf report

# Linux syscall summary
strace -c <command>
```

Use language-native tools where available: JMH, Criterion, `go test -bench`,
`pytest-benchmark`, `cargo bench`, profilers, heap analyzers, and runtime traces.

## Common Anti-Patterns

| Anti-pattern | Impact | Correction |
|---|---|---|
| No baseline | Improvement cannot be established | Measure before changing |
| Different conditions | Comparison is invalid | Re-run identically |
| Single-run benchmark | Noise looks like improvement | Repeat and measure variance |
| Mean only | Tail regressions stay hidden | Compare distributions and percentiles |
| Bundled optimizations | Result cannot be attributed | Measure changes independently |
| Throughput only | Latency or memory may regress | Track secondary metrics |
| Microbenchmark only | Real workload may differ | Validate representative scenarios |
| Correctness weakened | Performance gain is a regression | Revert |
| Neutral change retained | Complexity increases without value | Revert |
| Unbounded work | Degrades with scale | Bound, batch, paginate, or stream |
| Excess copying | CPU and memory waste | Profile allocations and ownership |
| Hidden I/O | Latency attributed to computation | Trace boundaries separately |
