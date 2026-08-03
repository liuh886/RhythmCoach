# CI and release governance

RhythmCoach intentionally keeps one small validation baseline rather than adding a broad device, network, or service matrix to every pull request.

## Required pull-request baseline

Every pull request runs:

1. `npm ci` against the committed lockfile;
2. the project test suite, including session-metric and training-domain contracts;
3. the production Web/PWA build.

A failure is blocking when it is reproducible from the repository checkout and directly concerns the product source, tests, build, or release metadata changed by the pull request.

Pull-request validation has read-only repository permissions. `pages: write` and `id-token: write` are granted only to the deployment job after validation succeeds on `main` or manual dispatch.

## Version and release contract

`web/scripts/check-version.mjs` owns the synchronized release-version contract. The following files intentionally participate:

- `web/package.json` and `web/package-lock.json`;
- `web/public/sw.js` cache version;
- `README.md` current stable version;
- `CHANGELOG.md` release heading;
- `PRIVACY.md` version reference.

Version failures should report metadata drift in these files. Ordinary product wording outside this explicit list is not a release API and must not become an exact-string CI gate.

## Main and deployment integration

After the same validation succeeds on `main`, the workflow uploads the Pages artifact and deploys it. Deployment permissions are not available during pull-request execution.

## Deliberate exclusions

The core rehearsal gate does not depend on live authentication, payment services, third-party availability, microphone permission prompts, or a full cross-browser/device matrix. Those checks may be added as focused path-aware, scheduled, or manually dispatched diagnostics when evidence shows they are needed.

Recording, session metrics, annotation, theme, training content, and production-build regressions remain blocking in the repository-local test suite.
