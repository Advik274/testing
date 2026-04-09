# DOMINANCE — Official Game Rules
### Ebulliance Tech Fest | Reboot Club × CSI × NCC

---

## OVERVIEW

**Dominance** is a 3-phase elimination tech event that combines speed, strategy, and software development. Teams compete through increasingly intense challenges — from individual logic puzzles to campus-wide territory battles to live product building.

**Teams:** 3–5 members per team
**Duration:** ~5.5 hours (full event)
**Eligible:** 1st, 2nd, and 3rd year students

---

## PHASE 1 — THE GAUNTLET
**Duration:** ~50 minutes | **Location:** Lab / Hall

### Objective
Score the highest points across 5 rapid-fire rounds. The bottom teams are cut after each round.

### How It Works
1. All registered teams participate simultaneously on their phones/laptops.
2. The admin starts each round. A question appears on every team member's screen.
3. Teams have a **time limit** (20–40 seconds) to submit their answer.
4. Scoring: **Base points + Speed Bonus**. Faster correct answers score more.
5. At the end of each round, the admin **decides how many teams to eliminate** based on standings.
6. After Round 5, the surviving teams advance to Phase 2.

### Question Types
| Round | Type | Difficulty | Time Limit | Base Points |
|-------|------|-----------|------------|-------------|
| 1 | MCQ | Easy | 20s | 10 |
| 2 | MCQ | Easy-Medium | 20s | 10 |
| 3 | MCQ | Medium | 35s | 18 |
| 4 | Text Input | Medium | 40s | 20 |
| 5 | Text Input | Medium | 40s | 20 |

### Scoring Formula
`Score = Base Points + (Time Limit − Time Taken in seconds)`
*Example: 20pt question answered in 5s out of 40s = 20 + 35 = 55 points*

### Rules
- One answer per team per round (first submission counts).
- No searching the internet. No communication between teams.
- Admin has override power to eliminate any team at any point.
- Tie in scores → faster average response time wins.

---

## PHASE 2 — CAMPUS CONQUEST
**Duration:** 90 minutes | **Location:** Entire Campus

### Objective
Capture the most **Strategic Nodes (Zones)** before the timer runs out. Your battery drains constantly — capture zones to recharge.

### Setup
- The campus is divided into **6 Zones** (e.g., CS Lab, Auditorium, Library, Cafeteria, Sports Ground, Admin Block).
- Each zone has **one of our team members** stationed with a laptop (Zone Operator).
- Every team starts with **100% Battery Life**.

### Battery Rules
- Battery drains **2% per minute** automatically.
- Battery hits **0%** → **team eliminated instantly**.
- Capture a zone → **+30% battery** (one-time per zone capture).
- **Warning alerts** sent at 20% and 10%.

### How to Capture a Zone
1. Your team **physically walks** to a campus zone.
2. One member enters your **4-digit team passcode** on the zone's laptop.
3. A **challenge appears** — the entire team collaborates to solve it.
4. Zone Operator enters your answer.
5. **Correct** → Zone captured! +30% battery. Zone is now **permanently yours**.
6. **Wrong** → No penalty, but you've wasted time.

### Zone Rules
- **Once captured, a zone is LOCKED** — no other team can take it.
- Only **one team** can attempt a zone at a time (queue if another team is there).
- If you see another team at a zone, wait your turn or go to a different zone.
- Zone Operators are neutral — they only enter answers, they do not help.

### Zone Challenge Types
- **Debugging:** Find and fix the bug in a code snippet
- **Team Logic:** Solve a logic/math puzzle collaboratively
- **Pattern/Cipher:** Decode or find the pattern

### Advancement
Top **4–5 teams** (based on zones captured, then battery% as tiebreaker) advance to Phase 3.

### Rules
- Team members must physically visit zones together (at least 2 members must be present).
- Zone Marshals (your zone operators) have final say on attempts.
- Admin can reset a zone or override battery if technical issues occur.
- No sharing zone answers with other teams.

---

## PHASE 3 — FINAL BUILD
**Duration:** 2.5 hours | **Location:** Labs / Main Hall

### Objective
Build a **working web application** that solves the given problem statement. Best product wins.

### How It Works
1. Admin reveals the **problem statement** — each team may receive a different problem, or all teams may get the same one.
2. Teams have **2.5 hours** to build a functional web app.
3. Submit your project link (deployed URL or GitHub) via the team dashboard.
4. **Judges** score each submission.
5. You may **resubmit** before the timer ends (last submission counts).

### Judging Criteria
| Criterion | Weight | What Judges Look For |
|-----------|--------|----------------------|
| UI Design | 30% | Visual quality, responsiveness, intuitiveness |
| Functionality | 40% | Core features work, no crashes, edge cases handled |
| Problem Fit | 30% | How well the app actually solves the stated problem |

### Scoring Formula
`Final Score = (UI × 0.3 + Functionality × 0.4 + Problem Fit × 0.3) × 10`
**Maximum: 100 points**

### Rules
- Any tech stack allowed (HTML/CSS/JS, React, Django, Flask, Node, etc.).
- Internet access allowed for documentation and resources.
- No copy-pasting full project templates — original work only.
- All team members must contribute.
- Judges' decisions are final.

---

## RESULTS

Results are revealed **dramatically** on the spectator screen — from last place to 1st place — one at a time, controlled by the admin.

---

## GENERAL RULES

1. **Fair Play:** No sharing answers, no external help, no cheating of any kind.
2. **Respect:** Treat all participants, operators, and volunteers with respect.
3. **Devices:** Teams may use phones and laptops. No pre-downloaded answer banks.
4. **Disqualification:** Cheating, misconduct, or disrupting other teams results in immediate disqualification.
5. **Admin is Final:** All admin and judge decisions are final. No appeals after announcement.
6. **Connectivity:** If your device loses connection, rejoin using your passcode at `[URL]`.
7. **Team Integrity:** All members of a team must be from the same college year (1st, 2nd, or 3rd).

---

## QUICK REFERENCE

| Screen | URL |
|--------|-----|
| Team Join | `http://[IP]:5173/` |
| Zone Laptop | `http://[IP]:5173/zone/[ZONE_ID]` |
| Admin Panel | `http://[IP]:5173/admin` (token: dominance2024) |
| Spectator | `http://[IP]:5173/spectator` |

---

## PRIZES

🥇 **1st Place** — [To be announced]
---

*Organised by Reboot Club × CSI Chapter × NCC Club | Ebulliance Tech Fest*
*Questions? Contact your nearest event volunteer.*
