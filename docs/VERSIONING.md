# RhythmCoach Versioning

RhythmCoach uses Semantic Versioning from version `1.0.0` onward.

## Version format

Versions use `MAJOR.MINOR.PATCH`:

- **MAJOR**: incompatible changes to persisted data, core rehearsal behavior, or supported workflows.
- **MINOR**: backward-compatible features or meaningful product capability additions.
- **PATCH**: backward-compatible fixes, visual refinements, documentation updates, and maintenance changes.

## Authoritative version

`web/package.json` is the single authoritative application version.

The in-product help dialog imports that value directly. The following references must remain synchronized:

- Root and workspace package metadata in `web/package-lock.json`.
- `web/public/sw.js` cache name.
- `README.md` current-version label.
- `CHANGELOG.md` release heading.
- `PRIVACY.md` implementation scope.

Run the consistency check with:

```bash
cd web
npm run version:check
```

The check also runs as part of `npm test`, so pull requests fail when package metadata or version references drift.

## Release checklist

1. Choose the next SemVer version.
2. Update `web/package.json` and regenerate or synchronize `web/package-lock.json`.
3. Update the Service Worker cache name to `rhythmcoach-vX.Y.Z`.
4. Add a dated release entry to `CHANGELOG.md` and return `Unreleased` to a clean state.
5. Update the README and any version-specific policy text.
6. Run `npm run version:check`, `npm test`, and `npm run build`.
7. Merge the release pull request after CI passes.
8. Create the Git tag `vX.Y.Z` on the merge commit.

## Release branches

Use `release/vX.Y.Z` for a planned stable release. Routine feature and fix branches should continue to use descriptive names and should not change the version unless they are part of an approved release.
