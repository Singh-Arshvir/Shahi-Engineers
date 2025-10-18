import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [message, setMessage] = useState("");
  const [view, setView] = useState("login");
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [resumeFile, setResumeFile] = useState(null);
  const [adminData, setAdminData] = useState({ contacts: [], resumes: [] });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleContactChange = e => setContact({ ...contact, [e.target.name]: e.target.value });
  const handleFileChange = e => setResumeFile(e.target.files[0]);

  const signup = async () => {
    try { 
      const res = await axios.post(`${process.env.REACT_APP_API}/signup`, form);
      setMessage(res.data.message);
      setView("login");
    } catch(err){ setMessage(err.response?.data?.message || "Signup error"); }
  };

  const login = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API}/login`, { email: form.email, password: form.password });
      setToken(res.data.token); setRole(res.data.role);
      localStorage.setItem("token", res.data.token); 
      localStorage.setItem("role", res.data.role);
      setMessage(res.data.message); setView("dashboard");
    } catch(err){ setMessage(err.response?.data?.message || "Login failed"); }
  };

  const logout = () => { 
    localStorage.clear(); setToken(null); setRole(null); setView("login"); 
    setMessage("Logged out");
  };

  const submitContact = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API}/contact`, contact, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message); 
      setContact({ name:"", email:"", message:"" });
    } catch(err){ setMessage(err.response?.data?.message || "Contact error"); }
  };

  const submitResume = async () => {
    if(!resumeFile) return setMessage("Select a file");
    const formData = new FormData(); 
    formData.append("resume", resumeFile);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API}/upload-resume`, formData, { 
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"multipart/form-data" } 
      });
      setMessage(res.data.message); 
      setResumeFile(null);
    } catch(err){ setMessage(err.response?.data?.message || "Resume upload failed"); }
  };

  const fetchAdminData = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API}/admin-dashboard`, { headers:{ Authorization:`Bearer ${token}` } });
      setAdminData({ contacts: res.data.contacts, resumes: res.data.resumes });
    } catch(err){ setMessage(err.response?.data?.message || "Admin fetch error"); }
  };

  if(!token){
    return(
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-6">🔐 Shahi Engineers Portal</h1>
        {view==="signup"?<>
          <input name="name" placeholder="Name" onChange={handleChange} className="p-2 m-2 text-black w-64 rounded"/>
          <input name="email" placeholder="Email" onChange={handleChange} className="p-2 m-2 text-black w-64 rounded"/>
          <input name="password" type="password" placeholder="Password" onChange={handleChange} className="p-2 m-2 text-black w-64 rounded"/>
          <button onClick={signup} className="bg-green-600 px-4 py-2 rounded mt-2 hover:bg-green-700 transition">Sign Up</button>
          <p className="mt-2">Already have account? <span className="text-blue-400 cursor-pointer" onClick={()=>setView("login")}>Login</span></p>
        </>:<>
          <input name="email" placeholder="Email" onChange={handleChange} className="p-2 m-2 text-black w-64 rounded"/>
          <input name="password" type="password" placeholder="Password" onChange={handleChange} className="p-2 m-2 text-black w-64 rounded"/>
          <button onClick={login} className="bg-blue-600 px-4 py-2 rounded mt-2 hover:bg-blue-700 transition">Login</button>
          <p className="mt-2">No account? <span className="text-green-400 cursor-pointer" onClick={()=>setView("signup")}>Sign Up</span></p>
        </>}
        {message && <p className="mt-4 text-yellow-300">{message}</p>}
      </div>
    );
  }

  return(
    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">🏢 Shahi Engineers</h1>
        <div className="flex gap-4 items-center">
          <span className="font-semibold">Role: {role}</span>
          <button onClick={logout} className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-800 transition">Logout</button>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">📄 Resume Upload</h2>
        <input type="file" onChange={handleFileChange} className="p-2 mb-2 text-black rounded"/>
        <button onClick={submitResume} disabled={!resumeFile} className={`px-4 py-2 rounded ${resumeFile?"bg-green-600 hover:bg-green-700":"bg-gray-500 cursor-not-allowed"}`}>Upload Resume</button>
        {resumeFile && <p className="mt-1">Selected file: {resumeFile.name}</p>}
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">✉️ Contact Form</h2>
        <input name="name" placeholder="Name" value={contact.name} onChange={handleContactChange} className="p-2 rounded text-black mb-2 w-full"/>
        <input name="email" placeholder="Email" value={contact.email} onChange={handleContactChange} className="p-2 rounded text-black mb-2 w-full"/>
        <textarea name="message" placeholder="Message" value={contact.message} onChange={handleContactChange} className="p-2 rounded text-black mb-2 w-full"/>
        <button onClick={submitContact} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition">Send Message</button>
      </section>

      {role==="admin" && <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-2">🛠️ Admin Dashboard</h2>
        <button onClick={fetchAdminData} className="bg-red-600 px-4 py-2 rounded mb-4 hover:bg-red-700 transition">Fetch Admin Data</button>

        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">Contact Messages</h3>
          {adminData.contacts.length===0?<p>No messages yet</p>:<table className="w-full text-black rounded overflow-hidden">
            <thead className="bg-gray-300">
              <tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Message</th></tr>
            </thead>
            <tbody>
              {adminData.contacts.map((c,i)=><tr key={i} className="bg-gray-100 even:bg-gray-200"><td className="p-2">{c.name}</td><td className="p-2">{c.email}</td><td className="p-2">{c.message}</td></tr>)}
            </tbody>
          </table>}
        </div>

        <div>
          <h3 className="text-xl font-bold mb-2">Uploaded Resumes</h3>
          {adminData.resumes.length===0?<p>No resumes uploaded</p>:<table className="w-full text-black rounded overflow-hidden">
            <thead className="bg-gray-300">
              <tr><th className="p-2">User</th><th className="p-2">Filename</th></tr>
            </thead>
            <tbody>
              {adminData.resumes.map((r,i)=><tr key={i} className="bg-gray-100 even:bg-gray-200"><td className="p-2">{r.user}</td><td className="p-2">{r.filename}</td></tr>)}
            </tbody>
          </table>}
        </div>
      </section>}

      {message && <p className="mt-4 text-yellow-300">{message}</p>}
    </div>
  );
}
