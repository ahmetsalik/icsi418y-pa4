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
let userStories;

// Allowed values for stories (PA4)
const priorities = ["High", "Medium", "Low"];
const storyStatuses = ["To Do", "In Progress", "Done"];

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("pa2");

        users = db.collection("users");
        projects = db.collection("projects");
        projectMemberships = db.collection("projectMemberships");
        userStories = db.collection("UserStories");

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

// ---------- Helper functions (PA4) ----------

// True if the value is a string that can be turned into an ObjectId
function isValidId(id) {
    return typeof id === "string" && ObjectId.isValid(id);
}

// True if the value is a string that is not empty after trimming
function isNonBlank(value) {
    return typeof value === "string" && value.trim() !== "";
}

// Checks the "As a ..., I want ..., so that ..." format
function hasStoryFormat(description) {
    const text = description.trim().toLowerCase();

    return (
        text.startsWith("as a") &&
        text.includes("i want") &&
        text.includes("so that")
    );
}

// Checks title, description, and priority. Returns an error message or null.
function checkStoryFields(title, description, priority) {
    if (!isNonBlank(title)) {
        return "Title is required";
    }

    if (!isNonBlank(description)) {
        return "Description is required";
    }

    if (!hasStoryFormat(description)) {
        return 'Description must follow the format "As a [type of user], I want [goal], so that [benefit]."';
    }

    if (!priorities.includes(priority)) {
        return "Priority must be High, Medium, or Low";
    }

    return null;
}

// Checks the assigned member for a story.
// Returns { userId } if valid (userId is null for Unassigned),
// or { status, message } if invalid.
async function checkAssignee(projectObjectId, assignedUserId) {
    if (assignedUserId === null || assignedUserId === undefined || assignedUserId === "") {
        return { userId: null };
    }

    if (!isValidId(assignedUserId)) {
        return { status: 400, message: "Invalid assigned member" };
    }

    const userId = new ObjectId(assignedUserId);

    const user = await users.findOne({ _id: userId });

    if (!user) {
        return { status: 404, message: "Assigned user does not exist" };
    }

    const membership = await projectMemberships.findOne({
        project_id: projectObjectId,
        user_id: userId
    });

    if (!membership) {
        return {
            status: 400,
            message: "Assigned user is not a member of this project"
        };
    }

    return { userId: userId };
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
            return res.status(409).json({
                message: "Cannot remove the Project Lead"
            });
        }

        // PA4: block removal if this member has any story in this project
        // (any status, including Done)
        const assignedStory = await userStories.findOne({
            project_id: projectObjectId,
            assigned_user_id: userObjectId
        });

        if (assignedStory) {
            return res.status(409).json({
                message: "Reassign, unassign, or delete this member's stories before removing them from the project."
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

// ---------- User Stories (PA4) ----------

// List a project's stories
app.get("/projects/:projectId/stories", async (req, res) => {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
        return res.status(400).json({ message: "Invalid project identifier." });
    }

    try {
        const projectObjectId = new ObjectId(projectId);

        const project = await projects.findOne({ _id: projectObjectId });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const stories = await userStories.find({
            project_id: projectObjectId
        }).toArray();

        // Add the assigned member's username for display
        for (const story of stories) {
            if (story.assigned_user_id) {
                const user = await users.findOne({ _id: story.assigned_user_id });
                story.assigned_username = user ? user.username : "Unknown";
            } else {
                story.assigned_username = "Unassigned";
            }
        }

        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Create a story
app.post("/projects/:projectId/stories", async (req, res) => {
    const { projectId } = req.params;
    const { title, description, priority, assigned_user_id } = req.body;

    if (!isValidId(projectId)) {
        return res.status(400).json({ message: "Invalid project identifier." });
    }

    try {
        const projectObjectId = new ObjectId(projectId);

        const project = await projects.findOne({ _id: projectObjectId });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const fieldError = checkStoryFields(title, description, priority);

        if (fieldError) {
            return res.status(400).json({ message: fieldError });
        }

        const assignee = await checkAssignee(projectObjectId, assigned_user_id);

        if (assignee.message) {
            return res.status(assignee.status).json({ message: assignee.message });
        }

        // Build the document explicitly (never insert req.body directly)
        const newStory = {
            project_id: projectObjectId,
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            status: "To Do",
            assigned_user_id: assignee.userId
        };

        const result = await userStories.insertOne(newStory);
        newStory._id = result.insertedId;

        res.status(201).json({
            message: "Story created successfully",
            story: newStory
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Edit a story
app.put("/projects/:projectId/stories/:storyId", async (req, res) => {
    const { projectId, storyId } = req.params;
    const { title, description, priority, status, assigned_user_id } = req.body;

    if (!isValidId(projectId)) {
        return res.status(400).json({ message: "Invalid project identifier." });
    }

    if (!isValidId(storyId)) {
        return res.status(400).json({ message: "Invalid story identifier." });
    }

    try {
        const projectObjectId = new ObjectId(projectId);
        const storyObjectId = new ObjectId(storyId);

        const project = await projects.findOne({ _id: projectObjectId });

        if (!project) {
            return res.status(404).json({ message: "Project does not exist" });
        }

        const fieldError = checkStoryFields(title, description, priority);

        if (fieldError) {
            return res.status(400).json({ message: fieldError });
        }

        if (!storyStatuses.includes(status)) {
            return res.status(400).json({
                message: "Status must be To Do, In Progress, or Done"
            });
        }

        const assignee = await checkAssignee(projectObjectId, assigned_user_id);

        if (assignee.message) {
            return res.status(assignee.status).json({ message: assignee.message });
        }

        // project_id is never changed
        const updates = {
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            status: status,
            assigned_user_id: assignee.userId
        };

        const result = await userStories.updateOne(
            { _id: storyObjectId, project_id: projectObjectId },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Story does not exist in this project"
            });
        }

        res.json({ message: "Story updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a story
app.delete("/projects/:projectId/stories/:storyId", async (req, res) => {
    const { projectId, storyId } = req.params;

    if (!isValidId(projectId)) {
        return res.status(400).json({ message: "Invalid project identifier." });
    }

    if (!isValidId(storyId)) {
        return res.status(400).json({ message: "Invalid story identifier." });
    }

    try {
        const result = await userStories.deleteOne({
            _id: new ObjectId(storyId),
            project_id: new ObjectId(projectId)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Story does not exist in this project"
            });
        }

        res.json({ message: "Story deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

startServer();