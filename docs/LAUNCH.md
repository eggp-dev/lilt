# Early-preview launch plan

This is a review draft. No community posts, external messages, telemetry, scheduled campaigns, or GNOME submissions have been made by this workflow. Repository visibility is a separate owner decision. The position is simple: **A floating pill for volume and media on GNOME.** Avoid claiming to be first, universally compatible, or production-proven.

## Readiness gates

| Gate | Current evidence / remaining action |
| --- | --- |
| License | MIT chosen by the project owner |
| Explainable native source | GJS implementation and architecture documentation; maintainer review required |
| Test evidence | 13 pure checks + 28 isolated native checks + 7 virtual-monitor checks |
| Installable package | ZIP loaded by disposable GNOME test tool; clean real-account install/disable/uninstall/re-login still pending |
| Core devices | Physical keyboard, audio device, and standard OSD path still pending |
| Environment | Real lock/unlock and physical mixed-DPI still pending; isolated fullscreen fixture passed |
| Review assets | 24-second native-based video, 9-second loop, PNG and original mark |
| Public access | Confirm owner approval, public visibility, and signed-out access before inviting external users |
| GNOME extensions site | Separate review; not submitted or approved |

A GitHub preview can openly communicate gaps. A stable release and broader distribution require the relevant hardware and recovery gates. Current [GNOME review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) must be checked before submission, including readable minimal code, cleanup, privacy, and the rules on AI-generated extensions versus explainable assistance.

## Presentation

README order: native motion loop, one-line purpose, preview environment and gaps, installation, limitations, focused feedback. Primary CTA: **Try the preview**. The native recording uses internal test inputs and synthetic MPRIS media. Its 18 seconds play once at recorded speed within the 24-second video. Cropping and framing are editorial; the UI is actual capture. There is no soundtrack. Repetition is a demonstration, not stability evidence.

## Channels, in order

Recheck each community's current rules immediately before posting. A human should review and publish each message; do not duplicate promotions across threads.

1. **GitHub early preview** after the public-access gate. Collect reproducible issues and improve the installation path.
2. **GNOME Discourse:** one technical feedback topic, according to the [community guidelines](https://discourse.gnome.org/guidelines). Ask for specific compatibility feedback rather than stars.
3. **r/gnome:** only after four weeks of real, documented development history, with the required LLM Assisted flair and honest description of assistance under the [community rules](https://www.reddit.com/r/gnome/). Do not fabricate backdated history to qualify. This is not an immediate launch channel.
4. **r/unixporn:** only when the submission demonstrates original behavior/functionality and meets the current [OC rules](https://www.reddit.com/r/unixporn/about/rules.json).
5. **This Week in GNOME:** after an installable release, a maintainer can manually suggest it in `#thisweek:gnome.org`, following the [submission process](https://thisweek.gnome.org/about/).

Exclude r/opensource's AI-content restrictions, r/linux's self-promotion limits, and Hacker News's restrictions on generated text/automated submissions from this campaign. Do not use alternate accounts or conceal assistance to work around a community rule.

## Human-review draft

Update the actual release state before use:

> I’m sharing an early preview of Lilt, a GNOME Shell extension that brings volume, mute, and now-playing feedback into a floating pill. The clip shows its spring-like transitions and how repeated volume changes stay in one display. Current testing covers isolated GNOME Shell 50.1 sessions on Ubuntu 26.04.1 with Wayland. Physical keyboard, audio-device, and mixed-DPI testing is still in progress. AI tools were used during development and to prepare this draft. The repository documents what has been tested and what still needs checking. The demo was recorded in a test GNOME session using test inputs and media. Source: https://github.com/eggp-dev/lilt

## Learning goals, not predictions

- First seven days after public launch: aim for 5–10 voluntary testers and five useful installation reports.
- First 30 days: aim for 20 cumulative installation reports and ten voluntary replies from people who used it for at least seven days.
- Establish a first-week baseline before setting any star-growth target. No particular star count is promised; any broader account-wide goal must be measured separately.

Downloads do not equal active users. Retention among respondents cannot be generalized to everyone. GitHub repository traffic has a limited [14-day reporting window](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository); an owner can review it manually. No automated collection or scheduled reporting is configured.

Ask only for OS, GNOME version, Wayland/X11, monitor scaling, reproducible steps, and a short expected/actual result. Avoid sensitive full logs and personal media history.
