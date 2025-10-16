import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResumeUpload = (e) => {
    setResume(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume) return alert("Please upload your resume.");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("message", formData.message);
      data.append("resume", resume);

      const API_URL = import.meta.env.VITE_API_URL; // e.g., https://shahi-engineers.onrender.com

      // Do NOT set Content-Type manually
      const res = await axios.post(`${API_URL}/api/contact`, data);

      if (res.data.success) {
        setSubmitted(true);
        setFormData({ name: "", email: "", message: "" });
        setResume(null);
        alert("✅ Form submitted successfully!");
      }
    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.error || "Error submitting form. Try again!");
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

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-100 py-10 px-6 md:px-20 text-center">
          <p>&copy; 2025 Shahi Engineers. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
