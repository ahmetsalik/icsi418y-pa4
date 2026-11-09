import { useState, useEffect } from "react";

function ViewProjects() {
    const [projects, setProjects] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadProjects() {
            try {
                const response = await fetch("http://localhost:9000/projects");
                const data = await response.json();

                if (response.ok) {
                    setProjects(data);
                } else {
                    setMessage(data.message);
                }
            } catch (error) {
                setMessage("Could not load projects");
            }
        }

        loadProjects();
    }, []);

    return (
        <div>
            <h2>View Projects</h2>

            {projects.map((project) => (
                <div key={project._id} className="project-item">
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                    <p>Status: {project.status}</p>
                    <p>Project Lead: {project.project_lead}</p>
                </div>
            ))}

            {message && <p>{message}</p>}
        </div>
    );
}

export default ViewProjects;