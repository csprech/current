"use client";

import { useCallback, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { MAX_SUBJECT_IMAGES, type SubjectReference } from "@/types";
import { useToast } from "@/components/Toast";

function readFilesAsDataUrls(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    )
  );
}

function SubjectCard({ subject }: { subject: SubjectReference }) {
  const updateSubject = useWorkflowStore((state) => state.updateSubject);
  const deleteSubject = useWorkflowStore((state) => state.deleteSubject);
  const addPhotosRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(subject.name);
  const [description, setDescription] = useState(subject.description ?? "");

  const handleAddPhotos = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const room = MAX_SUBJECT_IMAGES - subject.images.length;
    const files = Array.from(fileList).slice(0, Math.max(0, room));
    if (files.length === 0) {
      useToast.getState().show(`Subjects hold up to ${MAX_SUBJECT_IMAGES} reference photos`, "warning");
      return;
    }
    const images = await readFilesAsDataUrls(files);
    updateSubject(subject.id, { images: [...subject.images, ...images] });
  }, [subject.id, subject.images, updateSubject]);

  return (
    <div className="border border-neutral-700 p-2 space-y-2" data-testid="subject-card">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== subject.name) updateSubject(subject.id, { name: trimmed });
            else setName(subject.name);
          }}
          aria-label="Subject name"
          className="flex-1 min-w-0 text-xs font-medium px-2 py-1 bg-neutral-800 rounded-md text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        />
        <button
          type="button"
          onClick={() => deleteSubject(subject.id)}
          aria-label={`Delete subject ${subject.name}`}
          className="text-[11px] text-neutral-500 hover:text-neutral-200 px-1.5 py-1"
          title="Delete subject (nodes using it are detached)"
        >
          Delete
        </button>
      </div>
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={() => {
          const trimmed = description.trim();
          if (trimmed !== (subject.description ?? "")) {
            updateSubject(subject.id, { description: trimmed || undefined });
          }
        }}
        placeholder="Short description (woven into prompts)…"
        aria-label="Subject description"
        className="w-full text-[11px] px-2 py-1 bg-neutral-800 rounded-md text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {subject.images.map((image, index) => (
          <div key={index} className="relative group w-12 h-12 overflow-hidden bg-neutral-900">
            <img src={image} alt={`${subject.name} reference ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => updateSubject(subject.id, { images: subject.images.filter((_, i) => i !== index) })}
              aria-label={`Remove reference ${index + 1}`}
              className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/60 text-white text-[10px]"
            >
              ✕
            </button>
          </div>
        ))}
        {subject.images.length < MAX_SUBJECT_IMAGES && (
          <>
            <button
              type="button"
              onClick={() => addPhotosRef.current?.click()}
              aria-label={`Add reference photos to ${subject.name}`}
              className="w-12 h-12 border border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-300 hover:border-neutral-400 text-lg leading-none"
            >
              +
            </button>
            <input
              ref={addPhotosRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleAddPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Project subject library: named reference photo sets that image generators
 * attach for cross-generation subject consistency.
 */
export function SubjectLibrary() {
  const subjects = useWorkflowStore((state) => state.subjects);
  const addSubject = useWorkflowStore((state) => state.addSubject);
  const createRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState("");

  const handleCreate = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_SUBJECT_IMAGES);
    const images = await readFilesAsDataUrls(files);
    const name = newName.trim() || `Subject ${subjects.length + 1}`;
    addSubject({ name, images });
    setNewName("");
  }, [addSubject, newName, subjects.length]);

  return (
    <div className="p-3 space-y-3 text-neutral-300">
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        A subject is a set of reference photos (a character, a person, a product).
        Attach one to an image generator and its identity stays consistent across
        generations. You can also save any generated image as a subject from the
        node&rsquo;s ⋯ menu.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New subject name…"
          aria-label="New subject name"
          className="flex-1 min-w-0 text-xs px-2 py-1.5 bg-neutral-800 rounded-md text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        />
        <button
          type="button"
          onClick={() => createRef.current?.click()}
          className="text-[11px] px-2.5 py-1.5 rounded-full border border-neutral-600 text-neutral-200 hover:border-neutral-400"
        >
          Add photos…
        </button>
        <input
          ref={createRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="subject-create-input"
          onChange={(event) => {
            void handleCreate(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {subjects.length === 0 ? (
        <p className="text-[11px] text-neutral-600">No subjects yet.</p>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
