# ICSI 418Y - Programming Assignment 4

This is my PA3 project with user stories and a project backlog added. It uses React, Express, and MongoDB.

## Features

- Signup and login
- Create and view projects
- Add and remove project members
- Create user stories for a project (title, description, priority, assigned member)
- New stories start as To Do
- View a project's backlog
- Edit stories (including status) and delete stories
- Stories can only be assigned to members of that project
- A member can't be removed if they still have stories assigned in that project

## How to Run

1. Clone the repo and open it in VS Code.
2. In a terminal:

   cd server
   npm install

3. Make a `.env` file in the `server` folder with:

   MONGO_URI=your_mongodb_connection_string

4. Start the backend:

   node server.js

5. In another terminal:

   cd client
   npm install
   npm run dev

6. Open http://localhost:5173

## Database

MongoDB Atlas, database `pa2`, with these collections:

- `users`
- `projects`
- `projectMemberships`
- `UserStories`

Each story has `_id`, `project_id`, `title`, `description`, `priority`, `status`, and `assigned_user_id`. `project_id` and `assigned_user_id` are ObjectIds, and `assigned_user_id` is null if the story is unassigned.

## Test Data

1. Sign up three users: `ahmet`, `test`, and `ahmettest`.
2. Create Test Project 1 (lead `ahmet`) and Test project 2 (lead `test`).
3. Add `ahmettest` to Test project 2.
4. On the Backlog page, create these stories. Stories start as To Do, so use Edit to change the status.

| Project | Title | Priority | Status | Assigned |
|---|---|---|---|---|
| Test Project 1 | View campus event details | High | To Do | ahmet |
| Test Project 1 | RSVP to an event | Medium | In Progress | Unassigned |
| Test Project 1 | Get event reminders | Low | To Do | ahmet |
| Test project 2 | Search for events | Low | Done | ahmettest |
| Test project 2 | Create an event | High | In Progress | test |
| Test project 2 | Edit event details | Medium | To Do | Unassigned |

5. Try removing `ahmettest` from Test project 2. It should be blocked because they have a story assigned.