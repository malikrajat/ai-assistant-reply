# GitHub Actions — how this repo's workflow is wired

This document explains the CI workflow that ships with this project and, more importantly,
**exactly what to change and where** if you ever want it to run on a different branch, a
different tag pattern, or for pull requests.

There is one workflow file: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 1. What runs today

| Trigger | Does the workflow start? | Does the build run? |
| --- | --- | --- |
| Push to `main` | Yes | Yes |
| Push to `develop`, `feature/*`, any other branch | **No** — the workflow cannot start | No |
| Tag created from a commit on `main` | Yes | Yes |
| Tag created from a commit that is **not** on `main` | Yes (GitHub limitation) | **No** — the `guard` job rejects it and the build job is skipped |
| Pull request | No — there is no `pull_request` trigger | No |
| Manual run from the Actions tab | No — there is no `workflow_dispatch` trigger | No |

**Nothing is stored.** The workflow never calls `actions/upload-artifact` and never uses
`actions/cache`, so no artifacts and no caches are kept after a run. `dist/` is built on the
runner, summarised in the log, and discarded when the job ends.

The build job runs, in order: `npm ci` → `npm run type-check` → both Vite bundle passes →
`npm run verify` → `npm run smoke` (UI/insert behaviour) → `npm run test:prompt`
(prompt quality + provider request shapes). Any failure fails the workflow.

---

## 2. Why there is a `guard` job

GitHub Actions can filter **which branches** trigger a workflow (`on.push.branches`), but it
cannot express *"only run for tags created from `main`"* — a tag is just a pointer to a commit,
and GitHub does not record which branch it was created from.

So the workflow does two things:

1. `on.push.branches: [main]` — no other branch can even start a run.
2. A `guard` job runs for tag pushes and asks git whether the tagged commit is contained in
   `main` (`git merge-base --is-ancestor <commit> origin/main`). If it is not, the guard writes
   `allowed=false`, the build job is skipped, and the log shows a warning:

   ```
   ::warning::Tag 'v1.2.0' points at 4f9c1ab..., which is not on main. Build skipped; nothing was stored.
   ```

A tag pushed from another branch therefore produces a **run that exists but does no work**.
If you want to prevent those runs from appearing at all, see
[§6 Hard enforcement with repository rulesets](#6-hard-enforcement-with-repository-rulesets).

---

## 3. Change the branch it runs on

Two places must agree. Both are in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

**a) The trigger** (top of the file):

```yaml
on:
  push:
    branches:
      - main        # <-- add/remove branches here
```

**b) The guard's reference branch** (the `env:` block):

```yaml
env:
  BASE_BRANCH: main   # <-- keep this in sync with the list above
```

> Why two places? GitHub does not allow the `env` context inside the `on:` block, so the trigger
> filter and the ancestry check cannot share one variable. `BASE_BRANCH` is what the guard job
> compares tags against; `on.push.branches` is what stops other branches from starting a run.

**c) Optional, cosmetic** — the `guard` job's `name:` is only a label in the Actions UI
(`name: Verify the ref belongs to main`). The `env` context is not available there either, so if
you switch branches, edit that word by hand.

### Examples

Only `main` (the default, no change needed):

```yaml
on:
  push:
    branches: [main]
env:
  BASE_BRANCH: main
```

`main` **and** `develop`:

```yaml
on:
  push:
    branches: [main, develop]
env:
  BASE_BRANCH: main        # tags are still only accepted from main
```

Only `release` (ignore `main` entirely):

```yaml
on:
  push:
    branches: [release]
env:
  BASE_BRANCH: release
```

> If you allow several branches, decide what a *tag* means. With `BASE_BRANCH: main` a tag is
> accepted only when its commit is on `main`; builds triggered by a `develop` push still run,
> because branch pushes skip the ancestry check.

---

## 4. Change the tags it runs on

The `tags:` list under `on.push` controls which tag names trigger the workflow:

```yaml
on:
  push:
    tags:
      - "*"        # every tag (default)
```

Common alternatives:

```yaml
    tags: ["v*"]            # only v1.2.0, v2.0.0-beta, ...
    tags: ["v*.*.*"]        # strict semantic versions
    tags: ["release-*"]     # release-2026-05
```

You can also stop running on tags altogether by deleting the whole `tags:` block — then only
pushes to `main` trigger the workflow, and the `guard` job always takes the "branch" path.

---

## 5. Other common changes

### Run on pull requests that target `main`

Add a `pull_request` block. Note that this starts a run for PRs opened **from any branch**, but
only when the PR's *base* branch is `main`:

```yaml
on:
  push:
    branches: [main]
    tags: ["*"]
  pull_request:
    branches: [main]
```

If your rule is "no other branch may run CI at all", leave this out — that is why it is not
enabled by default.

### Allow manual runs from the Actions tab

```yaml
on:
  push:
    branches: [main]
    tags: ["*"]
  workflow_dispatch:
```

`workflow_dispatch` lets a human pick the branch, which would bypass the branch rule. If you add
it, also extend the `guard` job so a manual run on another branch is rejected, for example:

```yaml
      - name: Reject manual runs outside the base branch
        if: github.event_name == 'workflow_dispatch'
        run: |
          if [ "${GITHUB_REF_NAME}" != "$BASE_BRANCH" ]; then
            echo "allowed=false" >> "$GITHUB_OUTPUT"
            echo "::warning::Manual runs are only allowed on $BASE_BRANCH."
          fi
```

### Change the Node.js version

```yaml
env:
  NODE_VERSION: "20"    # bump to "22", "24", ...
```

### Use pnpm instead of npm

The repo contains both `package-lock.json` (used by CI) and `pnpm-lock.yaml`. To switch CI to
pnpm, replace the install step:

```yaml
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
```

### Keep storage at zero

Do **not** add any of these steps; every one of them stores data:

- `actions/upload-artifact`
- `actions/cache` (or `cache: npm` under `actions/setup-node`)
- `actions/upload-pages-artifact`

If you add caching to speed up installs, that is a deliberate trade-off — it stores a cache, not
an artifact, and can be deleted from the Actions tab at any time.

---

## 6. Hard enforcement with repository rulesets

The workflow guard covers the branch and tag rules, but if you want GitHub itself to refuse the
bad ref in the first place:

1. Repo → **Settings → Rules → Rulesets → New ruleset → Tag**
2. Target tags with a pattern such as `v*`
3. Under **Restrictions**, restrict who may create or update those tags
4. Optionally add a **branch** ruleset for `main` (require PRs, block force pushes)

That combination prevents stray tags from being pushed at all, which is stronger than skipping
the build afterwards.

---

## 7. Verifying that the rules work

1. Push a commit to `main` → a run appears, the `guard` job logs
   `Branch push to 'main' - allowed (only main can reach this job).`
2. Push a commit to another branch → **no run appears** in the Actions tab.
3. Tag a commit on `main` and push the tag → run appears and builds, with
   `Tag 'v1.2.0' -> <sha> is on main - allowed.`
4. Tag a commit that only exists on another branch and push it → run appears, shows a warning,
   and the build job is skipped:
   `Tag '...' points at <sha>, which is not on <branch>. Build skipped; nothing was stored.`

---

## 8. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `npm ci can only install packages when your package.json and package-lock.json are in sync` | Run `npm install` locally, commit the updated `package-lock.json`, or change the CI step to `npm install --no-audit --no-fund`. |
| Guard fails with `couldn't find remote ref main` | The base branch has a different name. Update `BASE_BRANCH` **and** `on.push.branches` to match (`master`, `trunk`, ...). |
| A tag run shows "Build, verify and test — skipped" | Working as intended: that tag is not on `main`. |
| Workflow never appears for a branch push | The branch is not in `on.push.branches` — that is the intended behaviour. |
| Tests fail only in CI | The suite runs the same commands locally: `npm run build` reproduces it. |

---

## 9. No secrets required

CI needs no API keys: the provider tests stub the HTTP layer, and the extension's Gemini/OpenAI/
Claude/DeepSeek keys are supplied by each user in the extension's own settings, never in the
repository or in CI.
