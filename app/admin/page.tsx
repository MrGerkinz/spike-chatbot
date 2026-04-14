"use client";

import { useEffect, useState, useCallback } from "react";
import {
  login,
  logout,
  isAuthenticated,
  getFaqs,
  addFaq,
  editFaq,
  removeFaq,
  getUnanswered,
  clearAllUnanswered,
} from "./actions";
import type { FaqEntry, UnansweredEntry } from "@/lib/faq";

type Tab = "faqs" | "unanswered";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    isAuthenticated().then(setAuthed);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await login(password);
    if (result.success) {
      setAuthed(true);
      setPassword("");
    } else {
      setError(result.error ?? "Login failed");
    }
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
  }

  if (authed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4"
        >
          <h1 className="text-2xl font-bold text-center text-gray-900">
            Admin Login
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Volleyball Club Chatbot
          </p>
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Log In
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("faqs");
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [unanswered, setUnanswered] = useState<UnansweredEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [f, u] = await Promise.all([getFaqs(), getUnanswered()]);
    setFaqs(f);
    setUnanswered(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Chatbot Admin
        </h1>
        <button
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Log Out
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "faqs"} onClick={() => setTab("faqs")}>
            FAQ Entries ({faqs.length})
          </TabButton>
          <TabButton
            active={tab === "unanswered"}
            onClick={() => setTab("unanswered")}
          >
            Unanswered ({unanswered.length})
          </TabButton>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : tab === "faqs" ? (
          <FaqManager faqs={faqs} onRefresh={refresh} />
        ) : (
          <UnansweredLog
            entries={unanswered}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function FaqManager({
  faqs,
  onRefresh,
}: {
  faqs: FaqEntry[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">FAQ Categories</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition font-medium"
        >
          + Add FAQ
        </button>
      </div>

      {showForm && (
        <FaqForm
          onSave={async (data) => {
            await addFaq(data);
            setShowForm(false);
            onRefresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {(() => {
        const defaults = faqs.filter((f) => f.readonly);
        const custom = faqs.filter((f) => !f.readonly);

        return (
          <>
            {defaults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Default Entries
                </h3>
                {defaults.map((faq) => (
                  <FaqCard key={faq.id} faq={faq} />
                ))}
              </div>
            )}

            {custom.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Custom Entries
                </h3>
                {custom.map((faq) => (
                  <div key={faq.id}>
                    {editingId === faq.id ? (
                      <FaqForm
                        initial={faq}
                        onSave={async (data) => {
                          await editFaq(faq.id, data);
                          setEditingId(null);
                          onRefresh();
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <FaqCard
                        faq={faq}
                        onEdit={() => setEditingId(faq.id)}
                        onToggle={async () => {
                          await editFaq(faq.id, { enabled: !faq.enabled });
                          onRefresh();
                        }}
                        onDelete={async () => {
                          if (confirm("Delete this FAQ entry?")) {
                            await removeFaq(faq.id);
                            onRefresh();
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {custom.length === 0 && (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">
                  No custom FAQ entries yet. Click &quot;+ Add FAQ&quot; to create one.
                </p>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function FaqCard({
  faq,
  onEdit,
  onToggle,
  onDelete,
}: {
  faq: FaqEntry;
  onEdit?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 space-y-2 ${
        faq.readonly
          ? "border-blue-100 bg-blue-50/30"
          : faq.enabled
            ? "border-gray-200"
            : "border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{faq.category}</span>
            {faq.readonly ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Default
              </span>
            ) : (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  faq.enabled
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {faq.enabled ? "Active" : "Disabled"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">{faq.question}</p>
          <p className="text-sm text-gray-700">{faq.answer}</p>
          {faq.keywords.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {faq.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        {!faq.readonly && (
          <div className="flex gap-1 shrink-0">
            {onEdit && <SmallButton onClick={onEdit}>Edit</SmallButton>}
            {onToggle && (
              <SmallButton onClick={onToggle}>
                {faq.enabled ? "Disable" : "Enable"}
              </SmallButton>
            )}
            {onDelete && (
              <SmallButton onClick={onDelete} variant="danger">
                Delete
              </SmallButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FaqForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FaqEntry;
  onSave: (data: {
    category: string;
    keywords: string[];
    question: string;
    answer: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [keywords, setKeywords] = useState(
    initial?.keywords.join(", ") ?? ""
  );
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      category: category.trim(),
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      question: question.trim(),
      answer: answer.trim(),
    });
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-blue-200 p-4 space-y-3"
    >
      <h3 className="font-semibold text-gray-900">
        {initial ? "Edit FAQ" : "New FAQ"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Category"
          value={category}
          onChange={setCategory}
          placeholder="e.g. Schedule"
          required
        />
        <Field
          label="Keywords (comma-separated)"
          value={keywords}
          onChange={setKeywords}
          placeholder="e.g. when, time, schedule"
        />
      </div>
      <Field
        label="Sample Question"
        value={question}
        onChange={setQuestion}
        placeholder="e.g. When do you play?"
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="The bot will send this text as a reply..."
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function UnansweredLog({
  entries,
  onRefresh,
}: {
  entries: UnansweredEntry[];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Unanswered Questions
        </h2>
        {entries.length > 0 && (
          <button
            onClick={async () => {
              if (confirm("Clear all unanswered entries?")) {
                await clearAllUnanswered();
                onRefresh();
              }
            }}
            className="text-sm text-red-600 hover:text-red-700 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">
            No unanswered questions. The bot is handling everything!
          </p>
        </div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-1"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize font-medium">{entry.platform}</span>
              <span>&middot;</span>
              <span>Sender: {entry.senderId}</span>
              <span>&middot;</span>
              <span>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-800">{entry.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
    </div>
  );
}

function SmallButton({
  onClick,
  children,
  variant = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
        variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
