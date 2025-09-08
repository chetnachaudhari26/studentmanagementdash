
const { useState, useEffect, useMemo, useCallback } = React;

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fetchCourses() {
  return new Promise((resolve, reject) => {
    const shouldFail = Math.random() < 0.1;
    setTimeout(() => {
      if (shouldFail) reject(new Error("Network error fetching courses"));
      else resolve([
        { id: 1, name: "HTML Basics" },
        { id: 2, name: "CSS Mastery" },
        { id: 3, name: "JavaScript Pro" },
        { id: 4, name: "React In Depth" }
      ]);
    }, 800);
  });
}

async function runEventLoopDemo(setLines) {
  setLines((ls) => [...ls, "Start demo"]);
  setTimeout(() => setLines((ls) => [...ls, "setTimeout (macrotask)"]), 0);
  Promise.resolve().then(() => setLines((ls) => [...ls, "Promise.then (microtask)"]));
  await Promise.resolve();
  setLines((ls) => [...ls, "await resolved (microtask checkpoint)"]);
}

function App() {
  const [students, setStudents] = useLocalStorage("students", []);
  const [editingId, setEditingId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoLines, setDemoLines] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchCourses();
        if (mounted) setCourses(list);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const byCourse = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const key = s.course || "Unassigned";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [students]);

  const upsertStudent = useCallback((payload) => {
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === payload.id);
      if (exists) return prev.map((s) => (s.id === payload.id ? payload : s));
      return [payload, ...prev];
    });
    setEditingId(null);
  }, [setStudents]);

  const onEdit = useCallback((id) => setEditingId(id), []);
  const onDelete = useCallback((id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, [setStudents]);

  const editingStudent = students.find((s) => s.id === editingId) || null;

  return (
    <>
      <div className="navbar">
        <h1>Student Management Dashboard</h1>
        <div className="controls">
          <button className="btn btn--light" onClick={() => runEventLoopDemo(setDemoLines)}>Run Event Loop Demo</button>
          <button className="btn btn--danger" onClick={() => { localStorage.clear(); location.reload(); }}>Reset Data</button>
        </div>
      </div>
      <div className="layout">
        <aside className="sidebar">
          <div>
            <h2>Stats</h2>
            <div>Total: <span className="badge">{students.length}</span></div>
            {[...byCourse.entries()].map(([c, n]) => (
              <div key={c} className="badge">{c}: {n}</div>
            ))}
          </div>
          <div>
            <h2>Event Loop</h2>
            <ol>
              {demoLines.map((ln, i) => <li key={i}>{ln}</li>)}
            </ol>
          </div>
        </aside>
        <main className="main">
          <div className="card">
            <h2>{editingStudent ? "Edit Student" : "Add Student"}</h2>
            <StudentForm
              key={editingStudent ? editingStudent.id : "new"}
              onSubmit={upsertStudent}
              initial={editingStudent}
              courses={courses}
              loadingCourses={loading}
              errorCourses={error}
            />
          </div>
          <div className="card">
            <h2>Students</h2>
            {students.length === 0 ? (
              <p>No students yet. Add one using the form.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Photo</th><th>Name</th><th>Email</th><th>Course</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><img src={s.image} alt={s.name} /></td>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.course}</td>
                      <td className="actions">
                        <button className="edit" onClick={() => onEdit(s.id)}>Edit</button>
                        <button className="delete" onClick={() => onDelete(s.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function StudentForm({ onSubmit, initial, courses, loadingCourses, errorCourses }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [course, setCourse] = useState(initial?.course || "");
  const [image, setImage] = useState(initial?.image || "");
  const [touched, setTouched] = useState(false);

  const valid = name.trim().length > 1 && emailPattern.test(email) && course;

  const payload = {
    id: initial?.id ?? crypto.randomUUID(),
    name: name.trim(),
    email: email.trim(),
    course,
    image: image.trim() || `https://picsum.photos/seed/${encodeURIComponent(name||"student")}/200/200`
  };

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit(payload);
    if (!initial) { setName(""); setEmail(""); setCourse(""); setImage(""); setTouched(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-row">
        <label>Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        {touched && name.trim().length <= 1 && <small style={{color:"red"}}>Enter at least 2 chars</small>}
      </div>
      <div className="input-row">
        <label>Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        {touched && !emailPattern.test(email) && <small style={{color:"red"}}>Enter valid email</small>}
      </div>
      <div className="input-row">
        <label>Course</label>
        <select className="select" value={course} onChange={(e) => setCourse(e.target.value)} disabled={loadingCourses||!!errorCourses}>
          <option value="">{loadingCourses ? "Loading…" : errorCourses ? "Error loading courses" : "Select a course"}</option>
          {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div className="input-row">
        <label>Image URL (optional)</label>
        <input className="input" value={image} onChange={(e) => setImage(e.target.value)} />
      </div>
      <button className="btn btn--light" type="submit">{initial ? "Save" : "Add"}</button>
    </form>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
