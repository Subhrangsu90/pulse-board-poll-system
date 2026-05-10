## Auth Routes

```
GET /user-info
GET /logout
```

## Poll routes

```
POST /polls
GET /polls
GET /polls/:id
PUT /polls/:id
DELETE /polls/:id
POST /polls/:id/publish
```

## Question routes

```
POST /polls/:id/questions
PUT /questions/:id
DELETE /questions/:id
```

## Public routes

```
GET /public/poll/:slug
POST /public/poll/:slug/respond
```

## Analytics routes

```
GET /polls/:id/analytics
```

## Frontend Pages

### Auth pages

- Login
- Logout

### Creator pages

- Dashboard
- Create Poll
- Edit Poll
- Analytics
- Publish Results

### Public pages

- Public Poll Form
- Public Results Page
