
# ICSI 418Y - Programming Assignment 3

A project management application built using React, Express, and MongoDB.

## Features

- User signup and login
- Create projects with a name, description, status, and Project Lead
- View existing projects
- Add and remove project members
- Prevent duplicate memberships
- Prevent removal of the Project Lead
- Store users, projects, and memberships in MongoDB

## How to Run

1. Install Node.js.
2. Clone the repository.
3. Open the project folder in VS Code.
4. Open a terminal and run:

   cd server
   npm install

5. Create a `.env` file inside the `server` folder containing:

   MONGO_URI=your_mongodb_connection_string

6. Start the backend:

   node server.js

7. Open another terminal and run:

   cd client
   npm install
   npm run dev

8. Open http://localhost:5173 in your browser.

## Database

The application uses MongoDB Atlas with three collections:

- `users`
- `projects`
- `projectMemberships`

Projects reference their Project Lead using a MongoDB ObjectId. Membership records connect users to projects using ObjectId references.
