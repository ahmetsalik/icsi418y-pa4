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

    // Messages: one for the create form, one for the backlog (edit/delete)
    const [message, setMessage] = useState("");
    const [backlogMessage, setBacklogMessage] = useState("");

    // Create form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("");
    const [assignedId, setAssignedId] = useState("");

    // Edit form (separate from the saved story until Save is clicked)
    const [editingId, setEditingId] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editPriority, setEditPriority] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [editAssignedId, setEditAssignedId] = useState("");

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
                    setBacklogMessage(error.message);
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
            setBacklogMessage(error.message);
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
        setBacklogMessage("");
        clearCreateForm();
        setEditingId("");
    }

    // ---------- Create ----------

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

    // ---------- Edit ----------

    // Load the story's saved values into the edit form
    function startEdit(story) {
        setEditingId(story._id);
        setEditTitle(story.title);
        setEditDescription(story.description);
        setEditPriority(story.priority);
        setEditStatus(story.status);
        setEditAssignedId(story.assigned_user_id ? story.assigned_user_id : "");
        setBacklogMessage("");
    }

    // Cancel closes the form without sending anything
    function cancelEdit() {
        setEditingId("");
        setBacklogMessage("");
    }

    async function handleSave(event) {
        event.preventDefault();

        if (editTitle.trim() === "" || editDescription.trim() === "") {
            setBacklogMessage("Title and description are required");
            return;
        }

        try {
            const response = await fetch(
                `${API}/projects/${projectId}/stories/${editingId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: editTitle,
                        description: editDescription,
                        priority: editPriority,
                        status: editStatus,
                        assigned_user_id: editAssignedId === "" ? null : editAssignedId
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setBacklogMessage(data.message || "Could not update story");
                return;
            }

            setBacklogMessage(data.message);
            setEditingId("");
            refreshStories();
        } catch (error) {
            setBacklogMessage("Could not connect to server");
        }
    }

    // ---------- Delete ----------

    async function handleDelete(story) {
        const confirmed = window.confirm(`Delete the story "${story.title}"?`);

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API}/projects/${projectId}/stories/${story._id}`,
                { method: "DELETE" }
            );

            const data = await response.json();

            if (!response.ok) {
                setBacklogMessage(data.message || "Could not delete story");
                return;
            }

            if (editingId === story._id) {
                setEditingId("");
            }

            setBacklogMessage(data.message);
            refreshStories();
        } catch (error) {
            setBacklogMessage("Could not connect to server");
        }
    }

    // Member dropdown options (used by both forms)
    const memberOptions = members.map((member) => (
        <option key={member._id} value={member._id}>
            {member.username}
            {member.isLead && " (Project Lead)"}
        </option>
    ));

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
                            {memberOptions}
                        </select>

                        <button type="submit">Create Story</button>
                    </form>

                    {message && <p>{message}</p>}

                    <h3>Backlog</h3>

                    {backlogMessage && <p>{backlogMessage}</p>}

                    {stories.length === 0 && <p>This project has no stories yet.</p>}

                    {stories.map((story) => (
                        <div key={story._id} className="story-item">
                            {editingId === story._id ? (
                                <form onSubmit={handleSave}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(event) => setEditTitle(event.target.value)}
                                    />

                                    <textarea
                                        value={editDescription}
                                        onChange={(event) => setEditDescription(event.target.value)}
                                    />

                                    <select
                                        value={editPriority}
                                        onChange={(event) => setEditPriority(event.target.value)}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>

                                    <select
                                        value={editStatus}
                                        onChange={(event) => setEditStatus(event.target.value)}
                                    >
                                        <option value="To Do">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                    </select>

                                    <select
                                        value={editAssignedId}
                                        onChange={(event) => setEditAssignedId(event.target.value)}
                                    >
                                        <option value="">Unassigned</option>
                                        {memberOptions}
                                    </select>

                                    <div className="story-buttons">
                                        <button type="submit">Save</button>
                                        <button type="button" onClick={cancelEdit}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <h4>{story.title}</h4>
                                    <p>{story.description}</p>
                                    <p>
                                        <strong>Priority:</strong> {story.priority} |{" "}
                                        <strong>Status:</strong> {story.status} |{" "}
                                        <strong>Assigned:</strong> {story.assigned_username}
                                    </p>

                                    <div className="story-buttons">
                                        <button onClick={() => startEdit(story)}>Edit</button>
                                        <button onClick={() => handleDelete(story)}>Delete</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </>
            )}

            {!projectId && message && <p>{message}</p>}
        </div>
    );
}

export default Backlog;