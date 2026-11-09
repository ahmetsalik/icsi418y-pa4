
import { useState } from "react";
import "./App.css";
import Signup from "./components/Signup";
import Login from "./components/Login";
import CreateProject from "./components/CreateProject";
import ViewProjects from "./components/ViewProjects";
import ManageMembers from "./components/ManageMembers";

function App() {
    const [page, setPage] = useState("login");

    return (
        <div className="container">
            <h1>PA3 Project Management</h1>

            <div className="switch-buttons">
                <button onClick={() => setPage("login")}>Login</button>
                <button onClick={() => setPage("signup")}>Sign Up</button>
                <button onClick={() => setPage("create")}>Create Project</button>
                <button onClick={() => setPage("view")}>View Projects</button>
                <button onClick={() => setPage("members")}>Manage Members</button>
            </div>

            <div className="single-form">
                {page === "login" && <Login />}
                {page === "signup" && <Signup />}
                {page === "create" && <CreateProject />}
                {page === "view" && <ViewProjects />}
                {page === "members" && <ManageMembers />}
            </div>
        </div>
    );
}

export default App;
