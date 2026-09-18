import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  User as UserIcon,
  LogIn
} from "lucide-react";
import { User } from "firebase/auth";
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  signInWithGoogle
} from "../lib/firebase";

interface ClinicalReviewNotesProps {
  user: User | null;
  subjectId: string;
}

interface ClinicalNote {
  id: string;
  subjectId: string;
  authorEmail: string;
  authorName: string;
  status: "HY_LAW_FLAGGED" | "SAFETY_REVIEW" | "NORMAL" | "PENDING_LABS";
  content: string;
  timestamp: any;
}

export const ClinicalReviewNotes: React.FC<ClinicalReviewNotesProps> = ({
  user,
  subjectId,
}) => {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [newStatus, setNewStatus] = useState<ClinicalNote["status"]>("SAFETY_REVIEW");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    // Subscribe to notes for this user
    const notesRef = collection(db, "users", user.uid, "notes");
    const q = query(notesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ClinicalNote[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.subjectId === subjectId) {
          fetched.push({
            id: doc.id,
            subjectId: data.subjectId,
            authorEmail: data.authorEmail || user.email || "",
            authorName: data.authorName || user.displayName || "Investigator",
            status: data.status || "SAFETY_REVIEW",
            content: data.content || "",
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : "Just now",
          });
        }
      });
      setNotes(fetched);
    });

    return () => unsubscribe();
  }, [user, subjectId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newNoteText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const notesRef = collection(db, "users", user.uid, "notes");
      await addDoc(notesRef, {
        subjectId,
        authorEmail: user.email,
        authorName: user.displayName || "Investigator",
        status: newStatus,
        content: newNoteText.trim(),
        timestamp: serverTimestamp(),
      });

      // Also record an audit log event
      const auditRef = collection(db, "audit_logs");
      await addDoc(auditRef, {
        type: "SUBJECT_REVIEW_NOTE_ADDED",
        subjectId,
        authorId: user.uid,
        authorEmail: user.email,
        status: newStatus,
        timestamp: serverTimestamp(),
      });

      setNewNoteText("");
    } catch (err) {
      console.error("Failed to add note to Firestore:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    try {
      const noteDoc = doc(db, "users", user.uid, "notes", noteId);
      await deleteDoc(noteDoc);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-3">
        <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Investigator Sign-in Required for Clinical Annotations
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Sign in with your Google account to record persistent clinical review notes, flag Hy's Law findings, and maintain GCP-compliant audit trails in Firestore.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In with Google</span>
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: ClinicalNote["status"]) => {
    switch (status) {
      case "HY_LAW_FLAGGED":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Potential Hy's Law Flag</span>
          </span>
        );
      case "SAFETY_REVIEW":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Under Safety Review</span>
          </span>
        );
      case "NORMAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Cleared / Normal</span>
          </span>
        );
      case "PENDING_LABS":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Pending Retest</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <ClipboardList className="w-4 h-4 text-teal-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Investigator Review Notes (Firestore Persisted)
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Subject: {subjectId}
        </span>
      </div>

      {/* New Note Form */}
      <form onSubmit={handleAddNote} className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700">Review Classification:</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="SAFETY_REVIEW">Under Safety Review</option>
            <option value="HY_LAW_FLAGGED">Potential Hy's Law Flag</option>
            <option value="PENDING_LABS">Pending Retest / Central Labs</option>
            <option value="NORMAL">Cleared / Normal</option>
          </select>
        </div>

        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder={`Enter clinical evaluation for subject ${subjectId} (e.g. ALT/BILI elevation review, concomitant medications check)...`}
          rows={2}
          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newNoteText.trim()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Note in Firestore</span>
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-2.5">
        {notes.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            No clinical notes recorded yet for subject {subjectId}.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>{getStatusBadge(note.status)}</div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400">{note.timestamp}</span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>

              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <UserIcon className="w-3 h-3 text-slate-400" />
                <span>Recorded by {note.authorName} ({note.authorEmail})</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
