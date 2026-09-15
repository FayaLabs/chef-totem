# chef-totem — how work reaches the glass

This panel is a physical machine that stands in front of customers. Code that
is merged and not deployed is code nobody can see, and at a fair that is the
same as not having written it.

## Every change that touches the panel ends the same way

1. **Bump the release.** `TOTEM_RELEASE` in `src/config/totem.config.ts` —
   `v1.5` → `v1.6`. The number shows in the corner label and in the service
   panel, and it is the ONLY way someone standing at the totem can tell whether
   what they are looking at includes the change. No console, no bundle hash: a
   number they can read across a counter.
2. **Merge to `main`.** PR, green tests, merge. Nothing ships from a branch.
3. **Deploy.** `npm run panel` — build plus copy plus restart, about forty
   seconds. Use `npm run panel:shell` whenever anything under `electron/`
   changed: the default command ships only the web bundle, and a shell change
   that stays behind looks exactly like a feature that does not work (the PIN
   menu went missing that way).
4. **Verify on the machine, not on your own build.** Over SSH, check that the
   deployed bundle carries the new version:

   ```sh
   ssh totem 'powershell -NoProfile -Command "if (Select-String -Path C:\fayz-shell\dist\assets\index-*.js -Pattern \"Totem v1.6\" -SimpleMatch -Quiet) { \"ok\" } else { \"NAO\" }; (Get-Process electron | Measure-Object).Count"'
   ```

   Four electron processes is one panel. Eight is two instances stacked, which
   happens when a restart raced the old one — stop them and run the scheduled
   task `FayzShell` again.
5. **Say the version out loud** in the report. "Deployed" is not an answer
   anyone can check; "the glass says v1.6" is.

## Things that look like bugs and are not

- **The panel is unreachable.** It travels. `tailscale status | grep win-frqk`
  says whether it is online and whether the connection is direct or by relay.
- **A dev server on `kierkegaard:5310` needs HTTPS** for the microphone:
  `TOTEM_HTTPS=1 npm run dev -- --host 0.0.0.0`. `getUserMedia` does not exist
  on a plain-HTTP origin that is not localhost, and the voice waiter then fails
  in a way that reads as a broken assistant.
- **Orders from a dev server are real.** `.env` points the order backend at a
  live tenant; `VITE_TOTEM_ORDER_BACKEND=pool` keeps a test lap out of someone's
  Fechamento do Dia.
- **The suite's environment is pinned** in `vitest.config.ts`, because a
  machine's `.env.local` used to fail twelve tests that pass on a clean
  checkout. If tests fail only for you, check that first.
