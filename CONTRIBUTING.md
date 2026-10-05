# Contributing

Lilt is an early GNOME 50 preview. Small, explainable changes with native evidence are welcome. First describe the behavior or reproducible problem in an issue; avoid broad feature bundles.

Run `npm test`, package the extension, and use the isolated Shell harness when touching native behavior. For motion changes, provide a short actual native capture and state whether reduced motion was checked. Keep platform-free behavior in `core.js`, release all owned resources on disable, and preserve the normal GNOME OSD fallback.

Do not add telemetry, notification-content collection, or network artwork downloads without an explicit project design discussion. Avoid logging private metadata. Dependency or reference code must have a compatible license and preserved attribution.

AI-assisted contributions are welcome only with human review and an explanation of the implementation. Disclose material assistance in the pull request. Generated text, an AI review, or a passing screenshot alone does not establish correctness or GNOME review eligibility.

Include OS, Shell version, display protocol, monitor scale, test commands, results, and remaining gaps. Keep personal file paths, access tokens, accounts, and unreviewed system logs out of commits and issues.
