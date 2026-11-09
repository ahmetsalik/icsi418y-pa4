
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);

let users;
let projects;
let projectMemberships;

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("pa2");

        users = db.collection("users");
        projects = db.collection("projects");
        projectMemberships = db.collection("projectMemberships");

        await projectMemberships.createIndex(
            { project_id: 1, user_id: 1 },
            { unique: true }
        );

        app.listen(9000, () => {
            console.log("Server running on port 9000");
        });
    } catch (error) {
        console.error("MongoDB connection failed");
        console.error(error);
    }
}

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

app.get("/users", async (req, res) => {
    try {
        const allUsers = await users.find({}, {
            projection: { password: 0 }
        }).toArray();

        res.json(allUsers);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    try {
        const existingUser = await users.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        await users.insertOne({ username, password });

        res.status(201).json({ message: "Signup successful" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    try {
        const user = await users.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        res.status(200).json({ message: "Login successful" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/projects", async (req, res) => {
    const { name, description, status, project_lead_id } = req.body;

    if (!name || !description || !status || !project_lead_id) {
        return res.status(400).json({
            message: "All project fields are required"
        });
    }

    if (!["Planning", "Active", "Completed"].includes(status)) {
        return res.status(400).json({
            message: "Invalid project status"
        });
    }

    if (!ObjectId.isValid(project_lead_id)) {
        return res.status(400).json({
            message: "Invalid Project Lead"
        });
    }

    try {
        const leadId = new ObjectId(project_lead_id);
        const lead = await users.findOne({ _id: leadId });

        if (!lead) {
            return res.status(404).json({
                message: "Project Lead does not exist"
            });
        }

        const result = await projects.insertOne({
            name,
            description,
            status,
            project_lead_id: leadId
        });

        await projectMemberships.insertOne({
            project_id: result.insertedId,
            user_id: leadId
        });

        res.status(201).json({
            message: "Project created successfully"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/projects", async (req, res) => {
    try {
        const allProjects = await projects.find().toArray();

        for (const project of allProjects) {
            const lead = await users.findOne({
                _id: project.project_lead_id
            });

            project.project_lead = lead ? lead.username : "Unknown";
        }

        res.json(allProjects);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// View members of a project
app.get("/projects/:projectId/members", async (req, res) => {
    const { projectId } = req.params;

    if (!ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
    }

    try {
        const project = await projects.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const memberships = await projectMemberships.find({
            project_id: project._id
        }).toArray();

        const members = [];

        for (const membership of memberships) {
            const user = await users.findOne({
                _id: membership.user_id
            });

            if (user) {
                members.push({
                    _id: user._id,
                    username: user.username,
                    isLead: user._id.equals(project.project_lead_id)
                });
            }
        }

        res.json(members);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Add a member
app.post("/projects/:projectId/members", async (req, res) => {
    const { projectId } = req.params;
    const { user_id } = req.body;

    if (!user_id || !ObjectId.isValid(projectId) || !ObjectId.isValid(user_id)) {
        return res.status(400).json({ message: "Invalid project or user" });
    }

    try {
        const projectObjectId = new ObjectId(projectId);
        const userObjectId = new ObjectId(user_id);

        const project = await projects.findOne({ _id: projectObjectId });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const user = await users.findOne({ _id: userObjectId });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        const existingMembership = await projectMemberships.findOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "User is already a member"
            });
        }

        await projectMemberships.insertOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        res.status(201).json({ message: "Member added successfully" });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User is already a member"
            });
        }

        res.status(500).json({ message: "Server error" });
    }
});

// Remove a member
app.delete("/projects/:projectId/members/:userId", async (req, res) => {
    const { projectId, userId } = req.params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid project or user" });
    }

    try {
        const projectObjectId = new ObjectId(projectId);
        const userObjectId = new ObjectId(userId);

        const project = await projects.findOne({ _id: projectObjectId });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const user = await users.findOne({ _id: userObjectId });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        if (project.project_lead_id.equals(userObjectId)) {
            return res.status(400).json({
                message: "Cannot remove the Project Lead"
            });
        }

        const result = await projectMemberships.deleteOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "User is not a member of this project"
            });
        }

        res.json({ message: "Member removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

startServer();
