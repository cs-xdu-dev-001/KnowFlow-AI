# Frontend Professional Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the KnowFlow AI frontend into a polished AI workbench while keeping the existing FastAPI static hosting and backend API contract.

**Architecture:** Keep `frontend/index.html`, `frontend/styles.css`, and `frontend/app.js` as the deployable static app. Add focused static verification tests so the redesign has regression coverage without adding a build pipeline.

**Tech Stack:** FastAPI static files, HTML, CSS, vanilla JavaScript, Python static tests, Node syntax check.

---

### Task 1: Add Frontend Structure Test

**Files:**
- Create: `tests/check_frontend_professional.py`

- [ ] **Step 1: Write the failing test**

Create a Python test that reads frontend files as UTF-8 and checks for the professional app shell, Chinese copy, provider presets, MiMo support, and absence of old manual chat-mode buttons.

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/check_frontend_professional.py`

Expected: FAIL because the old frontend structure and copy do not match the redesigned shell.

### Task 2: Rewrite Frontend Markup

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Replace old markup**

Create a clean app shell with sidebar, chat page, knowledge page, settings page, and evidence drawer. Use Chinese copy throughout and keep asset paths `/assets/styles.css` and `/assets/app.js`.

- [ ] **Step 2: Run static structure test**

Run: `python tests/check_frontend_professional.py`

Expected: still FAIL until CSS/JS tokens are in place.

### Task 3: Rewrite Visual System

**Files:**
- Modify: `frontend/styles.css`

- [ ] **Step 1: Replace old CSS**

Define the professional visual system: compact sidebar, elevated work panels, dense cards, responsive layout, polished chat bubbles, drawer behavior, settings grid, and upload/drop states.

- [ ] **Step 2: Run static structure test**

Run: `python tests/check_frontend_professional.py`

Expected: progress toward PASS, with JS-related checks still failing if not implemented.

### Task 4: Rewrite Frontend Behavior

**Files:**
- Modify: `frontend/app.js`

- [ ] **Step 1: Replace old JavaScript**

Implement state management, API helpers, navigation, sidebar/drawer toggles, provider preset behavior, knowledge-base-aware chat submission, document management, retrieval debug, settings actions, and copy/send/loading feedback.

- [ ] **Step 2: Run syntax and static tests**

Run: `node --check frontend/app.js`

Expected: PASS.

Run: `python tests/check_frontend_professional.py`

Expected: PASS.

### Task 5: Verify Existing Docs Tests

**Files:**
- Modify if needed: `tests/check_api_docs.py`

- [ ] **Step 1: Fix encoding-sensitive assertions if needed**

Make sure API docs tests check real UTF-8 Chinese strings instead of mojibake.

- [ ] **Step 2: Run verification**

Run: `python tests/check_api_docs.py`

Expected: PASS.

### Task 6: Sync Desktop Copy

**Files:**
- Copy workspace project changes to `C:\Users\z2986\Desktop\KnowFlow AI`

- [ ] **Step 1: Copy changed folders**

Copy `frontend`, `docs`, `tests`, and `README.md` to the desktop project.

- [ ] **Step 2: Run tests in desktop copy**

Run frontend and docs checks from `C:\Users\z2986\Desktop\KnowFlow AI`.

Expected: PASS.
