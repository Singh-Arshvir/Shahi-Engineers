import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Contact form
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Admin
  const [adminLogin, setAdminLogin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") || "");
  const [adminCreds, setAdminCreds] = useState({ username: "", password: "" });
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Fetch contacts
  const fetchContacts = async () => {
    if (!adminToken) return;
    try {
      setLoadingContacts(true);
      const res = await axios.get(`${API_URL}/api/admin/contacts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.data.success) setContacts(res.data.contacts);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      setAdminLogin(true);
      fetchContacts();
    }
  }, [adminToken]);

  // Handlers
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleResumeUpload = (e) => setResume(e.target.files[0]);
  const handleAdminChange = (e) => setAdminCreds({ ...adminCreds, [e.target.name]: e.target.value });

  // Submit contact form
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
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error submitting form.");
    }
  };

  // Admin login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, adminCreds);
      if (res.data.success) {
        setAdminToken(res.data.token);
        localStorage.setItem("adminToken", res.data.token);
        setAdminLogin(true);
        fetchContacts();
      }
    } catch {
      alert("Invalid credentials");
    }
  };

  const logoutAdmin = () => {
    setAdminToken("");
    localStorage.removeItem("adminToken");
    setAdminLogin(false);
  };

  // Download resume
  const downloadResume = async (filename) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/resume/${filename}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download file");
    }
  };

  // Delete contact
  const deleteContact = async (id) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/contact/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      alert("Deleted successfully!");
      setContacts((prev) => prev.filter((c) => c._id !== id));
    } catch {
      alert("Failed to delete contact");
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500">

        {/* Navbar */}
        <nav className="flex justify-between items-center p-6 bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
          <h1 className="text-2xl font-bold">Shahi Engineers</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center h-96 bg-gradient-to-r from-blue-400 to-purple-500 text-white">
          <h2 className="text-4xl font-bold mb-4 text-center">Welcome to Shahi Engineers</h2>
          <p className="text-center max-w-xl mb-6">
            We provide top-notch architectural and engineering solutions. Contact us or upload your resume to join our team.
          </p>
        </section>

        {/* Contact Form */}
        {!adminLogin && (
          <section className="py-20 px-6 md:px-20">
            <h2 className="text-4xl font-bold mb-8 text-center">Contact & Resume Upload</h2>
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
              {submitted ? (
                <p className="text-green-500 font-semibold text-center text-lg">
                  ✅ Thank you! Your message and resume have been successfully submitted.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="p-3 rounded border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Your Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="p-3 rounded border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  />
                  <textarea
                    name="message"
                    placeholder="Your Message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="p-3 rounded border border-gray-400 dark:border-gray-600 bg-gray-300 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  />
                  <label className="flex flex-col">
                    <span className="mb-2">Upload Your Resume (PDF/DOC)</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      required
                      className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
                    />
                    {resume && <span className="mt-2 text-sm">{resume.name}</span>}
                  </label>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600 transition"
                  >
                    Submit
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Admin Login */}
        {!adminLogin && (
          <section className="py-20 px-6 md:px-20">
            <h2 className="text-3xl font-bold mb-8 text-center">Admin Login</h2>
            <div className="max-w-md mx-auto bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
              <form onSubmit={handleAdminLogin} className="flex flex-col space-y-4">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={adminCreds.username}
                  onChange={handleAdminChange}
                  required
                  className="p-3 rounded border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={adminCreds.password}
                  onChange={handleAdminChange}
                  required
                  className="p-3 rounded border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600 transition"
                >
                  Login
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Admin Panel */}
        {adminLogin && (
          <section className="p-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Admin Panel — Submissions</h2>
              <button onClick={logoutAdmin} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Logout</button>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {loadingContacts ? (
                <p className="text-center text-lg">Loading contacts...</p>
              ) : contacts.length === 0 ? (
                <p className="text-center text-lg">No submissions found.</p>
              ) : (
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
                          <button
                            onClick={() => downloadResume(c.resumePath)}
                            className="text-blue-500 hover:underline"
                          >
                            Download
                          </button>
                        </td>
                        <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => deleteContact(c._id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-100 py-10 px-6 md:px-20 text-center">
          <p>&copy; 2025 Shahi Engineers. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
