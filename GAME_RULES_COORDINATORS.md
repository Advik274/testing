# 🎮 DOMINANCE — COORDINATOR GUIDE
> Full operational handbook for event coordinators. Keep this confidential.

---

## EVENT OVERVIEW

**Dominance** is a 3-phase tech elimination event designed for ~200 participants split into teams.

| Phase | Name | Duration | Format |
|-------|------|----------|--------|
| Phase 1 | Gauntlet | ~30 min | All teams answer live MCQ/logic rounds simultaneously |
| Phase 2 | Zone Wars | 90 min | Physical zone capture — teams move around campus |
| Phase 3 | Build Sprint | 150 min | Surviving teams build a web app from a problem statement |

---

## ROLES

| Role | Access | Responsibility |
|------|--------|---------------|
| **Head Admin** | Admin dashboard (`/admin`) | Controls all phases, reveals results |
| **Zone Operator** | Zone laptop (`/zone/:id`) | Manages zone challenges on-site |
| **Spectator Screen** | Spectator view (`/spectator`) | Projected for audience |
| **Team Members** | Team dashboard (`/team/:id`) | Submit answers, view status |

---

## PRE-EVENT SETUP

### 1. Server Setup
- Deploy the server on Railway (see `README.md`)
- Set `CLIENT_URL` env variable to the Vercel frontend URL
- Share `/admin` URL only with Head Admin
- Share `/spectator` URL for projection screens

### 2. Register Teams (Admin Dashboard → Setup tab)
- Enter team name, year, and member names
- System auto-assigns a **4-digit passcode** and **color**
- Give each team their passcode — they use it to log in AND at zone laptops
- **Do not share passcodes publicly** — teams should guard them

### 3. Create Zones (Admin Dashboard → Zones tab)
- Create one zone per physical location (e.g., "Zone Alpha — Library Entrance")
- Note each zone's auto-generated ID (e.g., `zone_a3f2b1`)
- Set up zone laptops: navigate each to `/zone/:zone_id`
- Token for zone operators: `dominance2024`

---

## PHASE 1 — THE GAUNTLET

**Goal:** Eliminate low-scoring teams before Zone Wars.

### How it works:
1. Admin clicks **Start Phase 1** in Control tab
2. All team dashboards switch to Gauntlet mode
3. Admin clicks **Next Round** — a question appears on all team screens simultaneously
4. Teams submit their answer within the time limit (20–45 sec depending on difficulty)
5. Admin clicks **End Round** and sets how many teams to eliminate (bottom scorers)
6. Repeat for up to 5 rounds

### Scoring:
- Correct answer = base points + speed bonus
- Faster answers score more
- Wrong/no answer = 0 points

### Elimination:
- After each round, select how many bottom teams to eliminate
- Eliminated teams see an overlay and are directed to spectator view
- You can manually eliminate or restore teams any time

### Tips:
- Run 3–5 rounds. Eliminate aggressively in early rounds.
- Aim to keep 8–12 teams for Zone Wars
- Use the broadcast button to announce "30 seconds to Phase 2!" etc.

---

## PHASE 2 — ZONE WARS

**Goal:** Teams physically move around campus, capturing zones by solving challenges.

### Battery System:
| Action | Battery Change |
|--------|---------------|
| Start of phase | 100% |
| Join a zone challenge | **−5%** |
| Capture a zone | **+20%** |
| Battery drain (auto) | −2% per minute |
| Battery hits 0% | Team is eliminated |

### Zone Capture Flow:
1. **Team arrives** at a physical zone laptop
2. **Operator enters** the team's 4-digit passcode into the zone laptop
3. System deducts 5% battery and checks:
   - **Neutral zone** → Operator sees 5 problem options → selects one → challenge begins
   - **Captured zone (defender has set a trap)** → Challenge loads automatically
   - **Captured zone (no trap set yet)** → Battery refunded, team must wait

4. **Team types their answer** directly on the zone laptop (operator steps aside)
5. **Submit** → Correct = zone captured, Wrong = attempt failed (battery spent)

### After Capture:
- New owner gets +20% battery
- ALL screens show zone status update (live sync)
- New owner is prompted on their team dashboard to **set a defense problem**
- They pick 1 of 5 options — this becomes the challenge for the next team that arrives

### Zone Conflict Prevention:
- Only ONE team can attempt a zone at a time
- If a zone is being attempted, the screen shows "🔴 Zone X — being attempted by [Team]"
- Operator sees an error if they try to start another attempt
- Admin can force-cancel any attempt and refund battery

### Operator Instructions (share with zone operators):
1. Open your zone URL on the laptop — keep it open all phase
2. Wait for a team to arrive and ask to attempt
3. Ask them: "What's your team passcode?"
4. Type their passcode into the "Team Arrive" field and submit
5. If it's a neutral zone, select one of the 5 problems shown
6. Step aside — let the TEAM read and type their answer
7. Hit Submit when they're ready
8. Show them the result screen
9. Click "Back to Zone" to reset for the next team

### Admin Controls During Phase 2:
- **Override battery** — manually set any team's battery %
- **Reset zone** — clears ownership and pending attempts
- **Eliminate team** — manual elimination (if battery hits 0 or violation)
- **Broadcast** — send a message toast to all screens

---

## PHASE 3 — BUILD SPRINT

**Goal:** Surviving teams build a working web app in 2.5 hours.

### Flow:
1. Admin clicks **Start Phase 3** — 150-min countdown starts on all screens
2. Admin selects and reveals the **problem statement** (from dropdown or custom)
   - Can assign same problem to all teams, or different problems per team
3. Teams build their project and submit via their team dashboard:
   - **Deployment URL** (required — must be live)
   - **GitHub Repository URL**
   - Notes to judges
4. Admin dashboard (Phase 3 tab) shows all submissions as they come in

### Judging (Admin Dashboard → Phase 3 tab):
- Each submitted team has a judge card
- Score 3 criteria, each out of 10:
  - **UI Design** (30% weight)
  - **Functionality** (40% weight)
  - **Problem Fit** (30% weight)
- Total = weighted score out of 100
- Scores are **editable** — you can update them anytime before results reveal

---

## RESULTS REVEAL

1. Admin clicks **Start Results** phase
2. Go to **Results tab**
3. Click **▶ Reveal Next** — each click reveals one team on **ALL screens simultaneously**
   - Worst to best order
   - Full-screen dramatic overlay with medal, score, and confetti for the winner
4. Click **Reset** to restart the reveal sequence if needed

---

## ADMIN TOKEN
```
dominance2024
```
**Never share this publicly.** It controls the entire event.

---

## EMERGENCY PROCEDURES

| Problem | Fix |
|---------|-----|
| Team lost passcode | Admin Dashboard → Teams tab → find team, passcode is listed |
| Zone laptop disconnected | Refresh page — it auto-reconnects |
| Wrong score entered | Phase 3 tab → JudgeCard → scores are pre-filled and re-submittable |
| Team stuck at zone | Admin → Zones tab → Reset Zone (refunds battery) |
| Server crashes | Railway auto-restarts. DB is persisted to `db.json`. |
| Two teams at same zone | First come, first served — second team gets an error and must wait |

---

## TIMING GUIDE

| Time | Action |
|------|--------|
| T-30 min | Register all teams, set up zone laptops, test connections |
| T-10 min | Open spectator screen on projector |
| 0:00 | Start Phase 1 |
| ~0:30 | End Phase 1, start Phase 2 |
| ~2:00 | End Phase 2, start Phase 3 |
| ~4:30 | End Phase 3, begin judging |
| ~5:30 | Start results reveal |
