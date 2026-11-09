
import { useState, useEffect } from "react";

function ManageMembers() {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [userId, setUserId] = useState("");
    const [members, setMembers] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const projectResponse = await fetch("http://localhost:9000/projects");
                const userResponse = await fetch("http://localhost:9000/users");

                if (!projectResponse.ok || !userResponse.ok) {
                    setMessage("Could not load projects or users");
                    return;
                }

                setProjects(await projectResponse.json());
                setUsers(await userResponse.json());
            } catch (error) {
                setMessage("Could not connect to server");
            }
        }

        loadData();
    }, []);

    async function loadMembers(id) {
        try {
            const response = await fetch(
                `http://localhost:9000/projects/${id}/members`
            );

            const data = await response.json();

            if (response.ok) {
                setMembers(data);
            } else {
                setMessage(data.message);
            }
        } catch (error) {
            setMessage("Could not load members");
        }
    }

    function handleProjectChange(event) {
        const id = event.target.value;
        setProjectId(id);
        setMembers([]);
        setMessage("");

        if (id) {
            loadMembers(id);
        }
    }

    async function handleAdd(event) {
        event.preventDefault();

        if (!projectId || !userId) {
            setMessage("Select a project and user");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:9000/projects/${projectId}/members`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ user_id: userId })
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                setUserId("");
                loadMembers(projectId);
            }
        } catch (error) {
            setMessage("Could not connect to server");
        }
    }

    async function handleRemove(id) {
        try {
            const response = await fetch(
                `http://localhost:9000/projects/${projectId}/members/${id}`,
                { method: "DELETE" }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                loadMembers(projectId);
            }
        } catch (error) {
            setMessage("Could not connect to server");
        }
    }

    return (
        <div>
            <h2>Manage Members</h2>

            <select value={projectId} onChange={handleProjectChange}>
                <option value="">Select Project</option>
                {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {projectId && (
                <>
                    <h3>Project Members</h3>

                    {members.map((member) => (
                        <div key={member._id} className="member-item">
                            <span>
                                {member.username}
                                {member.isLead && " (Project Lead)"}
                            </span>

                            {!member.isLead && (
                                <button onClick={() => handleRemove(member._id)}>
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}

                    <h3>Add Member</h3>

                    <form onSubmit={handleAdd}>
                        <select
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                        >
                            <option value="">Select User</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.username}
                                </option>
                            ))}
                        </select>

                        <button type="submit">Add Member</button>
                    </form>
                </>
            )}

            {message && <p>{message}</p>}
        </div>
    );
}

export default ManageMembers;
