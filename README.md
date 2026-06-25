# Projects workspace layout
All GitHub repos for `jen-the-dev` are organized by purpose, with dedicated ANZSCO 261312 presentation views.

## Job-hunting presentation workspace
- Open `workspaces/developer-programmer-jobhunt.code-workspace` for the complete non-fork presentation set.
- This workspace includes all active repositories except `forks/nvm`, plus `clerk-nextjs-starter`.

## Categories
- `buildathons`: Hackathon and contest submissions (`NeuroShell`, `focus-guard`)
- `nz-aewv`: Visa + Developer Programmer portfolio evidence:
  - Existing: `wellington-fintech-rails-api`, `wellington-api-static`, `nz-immigration-application-tracker`, `accessibility-rails-components`, `mystic-bytes`
  - New showcase samples: `cloud-native-task-management-api`, `multi-platform-ecommerce-web-app`, `realtime-data-streaming-dashboard`, `cicd-automated-infrastructure`
- `automation`: Scripted workflow tooling (`playlist-curator`)
- `sandbox`: Experiments (`metalmenders`)
- `drivers`: macOS driver work (`apple-bce-drv`, `apple-ib-drv`)
- `cursor-themes`: Cursor extension theming (`cursor-themes`)
- `zed-themes`: Editor theming (`zed-mtg-themes`, `cyberpunk-zed-themes`)
- `forks`: Upstream forks (`nvm`)
- external active repo: `clerk-nextjs-starter`

## Opening in Cursor

### Single repo
```bash
cursor ~/Projects/nz-aewv/cloud-native-task-management-api
cursor ~/Projects/workspaces/repos/cloud-native-task-management-api.code-workspace
```

### Job-hunt presentation set (all non-fork repos)
```bash
cursor ~/Projects/workspaces/developer-programmer-jobhunt.code-workspace
```

### Full local set (includes forks)
```bash
cursor ~/Projects/workspaces/all-projects.code-workspace
```

### Full NZ category
```bash
cursor ~/Projects/workspaces/nz-aewv.code-workspace
```

## Adding a new repo
1. Choose the category based on the portfolio objective.
2. Clone with:
   ```bash
   gh repo clone jen-the-dev/new-repo ~/Projects/<category>/new-repo
   ```
3. Add `workspaces/repos/<repo>.code-workspace`.
4. Update `workspaces/developer-programmer-jobhunt.code-workspace` and relevant category workspace files.
