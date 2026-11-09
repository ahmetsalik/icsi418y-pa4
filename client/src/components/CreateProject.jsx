import { useState, useEffect } from "react";

function CreateProject() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Planning");
    const [projectLead, setProjectLead] = useState("");
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadUsers() {
            try {
                const response = await fetch("http://localhost:9000/users");
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                setMessage("Could not load users");
            }
        }

        loadUsers();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            const response = await fetch("http://localhost:9000/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    status: status,
                    project_lead_id: projectLead
                })
            });

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                setName("");
                setDescription("");
                setStatus("Planning");
                setProjectLead("");
            }
        } catch (error) {
            setMessage("Could not connect to server");
        }
    }

    return (
        <div>
            <h2>Create Project</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Project Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />

                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                />

                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                </select>

                <select
                    value={projectLead}
                    onChange={(event) => setProjectLead(event.target.value)}
                >
                    <option value="">Select Project Lead</option>

                    {users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {user.username}
                        </option>
                    ))}
                </select>

                <button type="submit">Create Project</button>
            </form>

            {message && <p>{message}</p>}
        </div>
    );
}

export default CreateProject;