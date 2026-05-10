# 1) High Level Design (HLD)

This shows major components only.

```txt id="hy7v8q"
                    ┌────────────────────┐
                    │   Poll Creator     │
                    │   (Authenticated)  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ React Frontend UI  │
                    │ Dashboard/Create   │
                    │ Analytics/Public   │
                    └─────────┬──────────┘
                              │ REST APIs
                              ▼
                    ┌────────────────────┐
                    │ Express Backend    │
                    │ Authentication     │
                    │ Poll APIs          │
                    │ Response APIs      │
                    │ Analytics APIs     │
                    └───────┬─────┬──────┘
                            │     │
             Socket Events  │     │ DB Queries
                            ▼     ▼
                 ┌──────────────┐ ┌──────────────┐
                 │ Socket.IO    │ │ PostgreSQL   │
                 │ Real-time    │ │ + Drizzle ORM│
                 └──────────────┘ └──────────────┘
                            ▲
                            │
                    ┌───────┴────────┐
                    │ Public Users    │
                    │ Respond to Poll │
                    └─────────────────┘
```

---

## HLD Flow

### Poll Creator

- Logs in via OIDC
- Creates poll
- Adds questions/options
- Shares public link
- Watches analytics
- Publishes results

---

### Public User

- Opens shared poll link
- Submits response
- Sees final results after publish

---

### Backend

Handles:

- auth validation
- poll CRUD
- response validation
- analytics
- publish result

---

### Socket.IO

Handles:

- live response count
- analytics updates

---

# 2) Low Level Design (LLD)

This shows internal backend modules.

```txt id="vszc6k"
                    ┌────────────────────┐
                    │ React Frontend     │
                    └─────────┬──────────┘
                              │
                              ▼
                ┌────────────────────────────┐
                │ Express API Gateway        │
                └───────┬─────────┬──────────┘
                        │         │
        ┌───────────────┘         └────────────────┐
        ▼                                          ▼

┌─────────────────┐                    ┌──────────────────┐
│ Auth Module     │                    │ Poll Module      │
│ OIDC Session    │                    │ Create/Edit Poll │
│ Protected APIs  │                    │ Questions/Options│
└─────────────────┘                    └──────────────────┘

        ▼                                          ▼

┌─────────────────┐                    ┌──────────────────┐
│ Response Module │                    │ Analytics Module │
│ Submit Answers  │                    │ Count Votes      │
│ Validate Poll   │                    │ Summaries        │
│ Prevent Duplicate│                   │ Publish Results  │
└─────────────────┘                    └──────────────────┘

                        ▼
              ┌────────────────────┐
              │ Socket Module      │
              │ Emit Live Updates  │
              └────────────────────┘

                        ▼
              ┌────────────────────┐
              │ PostgreSQL DB      │
              │ Drizzle ORM        │
              └────────────────────┘
```

---

# 3) Poll Submission Sequence Diagram

Very useful for interviews/demo.

```txt id="k4rnqp"
Public User
    |
    | Open Poll Link
    v
Frontend
    |
    | GET /public/poll/:slug
    v
Backend
    |
    | fetch poll/questions/options
    v
Database

User submits answers
    |
    v
Frontend
    |
    | POST /responses
    v
Backend
    |
    | validate poll
    | validate expiry
    | validate duplicate
    | save response
    | save answers
    v
Database
    |
    | emit socket event
    v
Creator Dashboard updates live
```

---

# 4) Analytics Flow Diagram

```txt id="qj34ba"
Response Submitted
       |
       v
Save in DB
       |
       v
Aggregate analytics query
       |
       v
Socket emit
       |
       v
Creator dashboard updates
```
