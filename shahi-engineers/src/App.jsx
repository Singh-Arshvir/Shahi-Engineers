import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [contacts, setContacts] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL; // e.g. http://localhost:5000

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleResumeUpload = (e) => setResume(e.target.files[0]);

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
      alert(err.response?.data?.error || "Error submitting form. Try again!");
    }
  };

  // Fetch admin data
  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/contacts`);
      if (res.data.success) setContacts(res.data.data);
    } catch {
      alert("Error fetching admin data");
    }
  };

  useEffect(() => {
    if (adminMode) fetchContacts();
  }, [adminMode]);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500">
        {/* Navbar */}
        <nav className="flex justify-between items-center p-6 bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
          <h1 className="text-2xl font-bold">Shahi Engineers</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => setAdminMode(!adminMode)}
              className="px-3 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {adminMode ? "User Mode" : "Admin Panel"}
            </button>
          </div>
        </nav>

        {!adminMode ? (
          <>
            {/* Hero */}
            <section className="flex flex-col items-center justify-center h-96 bg-gradient-to-r from-blue-400 to-purple-500 text-white">
              <h2 className="text-4xl font-bold mb-4 text-center">Welcome to Shahi Engineers</h2>
              <p className="text-center max-w-xl mb-6">
                We provide top-notch architectural and engineering solutions. Contact us or upload your resume to join our team.
              </p>
            </section>

            {/* Contact Form */}
            <section className="py-20 px-6 md:px-20">
              <h2 className="text-4xl font-bold mb-8 text-center">Contact & Resume Upload</h2>
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
                {submitted ? (
                  <p className="text-green-500 font-semibold text-center text-lg">
                    ✅ Thank you! Your message and resume have been successfully submitted.
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
          </>
        ) : (
          // Admin Panel
          <section className="p-10">
            <h2 className="text-3xl font-bold mb-6 text-center">📁 Admin Panel — Submitted Resumes</h2>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 dark:border-gray-600">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Message</th>
                    <th className="p-3 text-left">Resume</th>
                    <th className="p-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c._id} className="border-b border-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3">{c.message}</td>
                      <td className="p-3">
                        <a
                          href={`${API_URL}/uploads/${c.resumePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Download
                        </a>
                      </td>
                      <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="bg-gray-900 text-gray-100 py-10 text-center">
          <p>&copy; 2025 Shahi Engineers. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
