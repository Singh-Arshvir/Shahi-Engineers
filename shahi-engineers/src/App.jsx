import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  const API_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleResumeUpload = (e) => setResume(e.target.files[0]);

  // 🔹 Submit User Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume) return alert("Please upload your resume.");
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("message", formData.message);
      data.append("resume", resume);

      const res = await axios.post(`${API_URL}/api/contact`, data);
      if (res.data.success) {
        setSubmitted(true);
        setFormData({ name: "", email: "", message: "" });
        setResume(null);
        alert("✅ Form submitted successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error submitting form.");
    }
  };

  // 🔹 Admin Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, loginData);
      if (res.data.success) {
        localStorage.setItem("adminToken", res.data.token);
        setIsLoggedIn(true);
        fetchContacts();
      }
    } catch {
      alert("Invalid credentials");
    }
  };

  // 🔹 Fetch Contacts
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.get(`${API_URL}/api/admin/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setContacts(res.data.data);
    } catch {
      alert("Error fetching admin data");
    }
  };

  // 🔹 Logout
  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setIsLoggedIn(false);
    setContacts([]);
  };

  // Refresh on page load
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      setIsLoggedIn(true);
      fetchContacts();
    }
  }, []);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition duration-500">
        {/* Navbar */}
        <nav className="flex justify-between items-center p-6 bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
          <h1 className="text-2xl font-bold">Shahi Engineers</h1>
          <div className="flex gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="px-3 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              {darkMode ? "Light" : "Dark"}
            </button>
            <button onClick={() => setAdminMode(!adminMode)} className="px-3 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600">
              {adminMode ? "User Mode" : "Admin Panel"}
            </button>
          </div>
        </nav>

        {!adminMode ? (
          // 🌟 User Contact Form
          <section className="py-20 px-6 md:px-20">
            <h2 className="text-4xl font-bold mb-8 text-center">Contact & Resume Upload</h2>
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
              {submitted ? (
                <p className="text-green-500 font-semibold text-center text-lg">
                  ✅ Thank you! Your message and resume have been submitted.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                  <input type="text" name="name" placeholder="Your Name" value={formData.name} onChange={handleChange} required className="p-3 rounded border bg-gray-200 dark:bg-gray-800" />
                  <input type="email" name="email" placeholder="Your Email" value={formData.email} onChange={handleChange} required className="p-3 rounded border bg-gray-200 dark:bg-gray-800" />
                  <textarea name="message" placeholder="Your Message" value={formData.message} onChange={handleChange} rows={5} required className="p-3 rounded border bg-gray-300 dark:bg-gray-800" />
                  <label className="flex flex-col">
                    <span className="mb-2">Upload Your Resume (PDF/DOC)</span>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} required className="file:mr-4 file:py-2 file:px-4 file:rounded file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer" />
                    {resume && <span className="mt-2 text-sm">{resume.name}</span>}
                  </label>
                  <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600 transition">Submit</button>
                </form>
              )}
            </div>
          </section>
        ) : !isLoggedIn ? (
          // 🔐 Admin Login
          <section className="py-20 flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-6">Admin Login</h2>
            <form onSubmit={handleLogin} className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg w-96 flex flex-col space-y-4">
              <input type="text" placeholder="Username" onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} required className="p-3 rounded border bg-gray-200 dark:bg-gray-800" />
              <input type="password" placeholder="Password" onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required className="p-3 rounded border bg-gray-200 dark:bg-gray-800" />
              <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600">Login</button>
            </form>
          </section>
        ) : (
          // 📁 Admin Panel
          <section className="p-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Admin Panel — Submissions</h2>
              <button onClick={logoutAdmin} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Logout</button>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 dark:border-gray-600">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Message</th>
                    <th className="p-3 text-left">Resume</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c._id} className="border-b border-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3">{c.message}</td>
                      <td className="p-3">
                        <a href={`${API_URL}/uploads/${c.resumePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Download
                        </a>
                      </td>
                      <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this contact?")) {
                              try {
                                const token = localStorage.getItem("adminToken");
                                await axios.delete(`${API_URL}/api/admin/contact/${c._id}`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                alert("Deleted successfully!");
                                fetchContacts();
                              } catch {
                                alert("Failed to delete contact");
                              }
                            }
                          }}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="bg-gray-900 text-gray-100 py-6 text-center">
          <p>&copy; 2025 Shahi Engineers. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
