import { useState, useEffect } from "react";

const API = "http://localhost:9000";

// Fetches a URL and returns the JSON data.
// Throws an error with the server's message if the request failed.
async function getJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

function Backlog() {
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);
    const [message, setMessage] = useState("");

    // Create form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("");
    const [assignedId, setAssignedId] = useState("");

    // Load all projects once
    useEffect(() => {
        async function loadProjects() {
            try {
                const data = await getJson(`${API}/projects`);
                setProjects(data);
            } catch (error) {
                setMessage("Could not load projects");
            }
        }

        loadProjects();
    }, []);

    // Load members and stories whenever the selected project changes
    useEffect(() => {
        if (!projectId) {
            return;
        }

        // Stops an older request from showing the wrong project's data
        let ignore = false;

        async function loadProjectData() {
            try {
                const memberData = await getJson(`${API}/projects/${projectId}/members`);
                const storyData = await getJson(`${API}/projects/${projectId}/stories`);

                if (!ignore) {
                    setMembers(memberData);
                    setStories(storyData);
                }
            } catch (error) {
                if (!ignore) {
                    setMessage(error.message);
                }
            }
        }

        loadProjectData();

        return () => {
            ignore = true;
        };
    }, [projectId]);

    async function refreshStories() {
        try {
            const data = await getJson(`${API}/projects/${projectId}/stories`);
            setStories(data);
        } catch (error) {
            setMessage(error.message);
        }
    }

    function clearCreateForm() {
        setTitle("");
        setDescription("");
        setPriority("");
        setAssignedId("");
    }

    function handleProjectChange(event) {
        setProjectId(event.target.value);
        setMembers([]);
        setStories([]);
        setMessage("");
        clearCreateForm();
    }

    async function handleCreate(event) {
        event.preventDefault();

        if (!projectId) {
            setMessage("Select a project first");
            return;
        }

        if (title.trim() === "" || description.trim() === "" || priority === "") {
            setMessage("Title, description, and priority are required");
            return;
        }

        try {
            const response = await fetch(`${API}/projects/${projectId}/stories`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    priority: priority,
                    assigned_user_id: assignedId === "" ? null : assignedId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Could not create story");
                return;
            }

            setMessage(data.message);
            clearCreateForm();
            refreshStories();
        } catch (error) {
            setMessage("Could not connect to server");
        }
    }

    return (
        <div>
            <h2>Project Backlog</h2>

            <select value={projectId} onChange={handleProjectChange}>
                <option value="">Select Project</option>
                {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {!projectId && <p>Select a project to see its backlog.</p>}

            {projectId && (
                <>
                    <h3>Create Story</h3>

                    <form onSubmit={handleCreate}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                        />

                        <textarea
                            placeholder="As a [type of user], I want [goal], so that [benefit]."
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />

                        <select
                            value={priority}
                            onChange={(event) => setPriority(event.target.value)}
                        >
                            <option value="">Select Priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>

                        <select
                            value={assignedId}
                            onChange={(event) => setAssignedId(event.target.value)}
                        >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                                <option key={member._id} value={member._id}>
                                    {member.username}
                                    {member.isLead && " (Project Lead)"}
                                </option>
                            ))}
                        </select>

                        <button type="submit">Create Story</button>
                    </form>

                    {message && <p>{message}</p>}

                    <h3>Backlog</h3>

                    {stories.length === 0 && <p>This project has no stories yet.</p>}

                    {stories.map((story) => (
                        <div key={story._id} className="story-item">
                            <h4>{story.title}</h4>
                            <p>{story.description}</p>
                            <p>
                                <strong>Priority:</strong> {story.priority} |{" "}
                                <strong>Status:</strong> {story.status} |{" "}
                                <strong>Assigned:</strong> {story.assigned_username}
                            </p>
                        </div>
                    ))}
                </>
            )}

            {!projectId && message && <p>{message}</p>}
        </div>
    );
}

export default Backlog;