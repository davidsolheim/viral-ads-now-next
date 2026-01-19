'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useGenerateScript } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ScriptStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

interface Script {
  id: string;
  content: string;
  isSelected: boolean;
  createdAt: Date;
}

export function ScriptStep({ projectId, onNext, readOnly = false }: ScriptStepProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [style, setStyle] = useState<'conversational' | 'energetic' | 'professional' | 'casual'>('conversational');
  const [specialRequest, setSpecialRequest] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  
  const generateScript = useGenerateScript(projectId);

  // Load existing scripts
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/script`);
        if (response.ok) {
          const data = await response.json();
          if (data.scripts && data.scripts.length > 0) {
            setScripts(data.scripts);
            const selected = data.scripts.find((s: Script) => s.isSelected);
            if (selected) {
              setSelectedScriptId(selected.id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading scripts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScripts();
  }, [projectId]);

  const handleGenerate = async () => {
    try {
      const result = await generateScript.mutateAsync({ 
        style,
        specialRequest: specialRequest.trim() || undefined,
      });
      if (result.scripts && result.scripts.length > 0) {
        setScripts(result.scripts);
        const selected = result.scripts.find((s: Script) => s.isSelected);
        if (selected) {
          setSelectedScriptId(selected.id);
        }
        toast.success('Generated 6 script variations!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate scripts');
    }
  };

  const handleSelectScript = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/script/${scriptId}/select`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to select script');
      }

      setSelectedScriptId(scriptId);
      setScripts((prev) =>
        prev.map((s) => ({ ...s, isSelected: s.id === scriptId }))
      );
      
      // Clear voiceover and captions when script changes
      // This will be handled by the backend when script is selected
      toast.success('Script selected!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to select script');
    }
  };

  const handleRegenerateScript = async (scriptId: string) => {
    setRegeneratingId(scriptId);
    try {
      const response = await fetch(`/api/projects/${projectId}/script/${scriptId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, specialRequest: specialRequest.trim() || undefined }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate script');
      }

      const result = await response.json();
      setScripts((prev) =>
        prev.map((s) => (s.id === scriptId ? result.script : s))
      );
      toast.success('Script regenerated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate script');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleEditScript = (script: Script) => {
    setEditingScriptId(script.id);
    setEditedContent(script.content);
  };

  const handleSaveEdit = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/script/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save script');
      }

      const result = await response.json();
      setScripts((prev) =>
        prev.map((s) => (s.id === scriptId ? result.script : s))
      );
      setEditingScriptId(null);
      toast.success('Script updated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save script');
    }
  };

  const handleCancelEdit = () => {
    setEditingScriptId(null);
    setEditedContent('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading scripts..." />
      </div>
    );
  }

  if (readOnly) {
    const selected = scripts.find((s) => s.isSelected) || scripts[0];
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Script</h2>
        <p className="mt-2 text-muted">AI selected the best script for this project.</p>
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          {selected ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">{selected.content}</p>
          ) : (
            <p className="text-sm text-muted">No script available yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Generate Script</h2>
      <p className="mt-2 text-muted">
        Choose a style and let AI create 6 unique script variations for your ad
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Script Style
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['conversational', 'energetic', 'professional', 'casual'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  style === s
                    ? 'border-brand bg-brand-50 text-brand-700'
                    : 'border-border bg-white text-muted hover:border-border-strong'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Special Request (Optional)
          </label>
          <textarea
            className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            rows={3}
            placeholder="Any specific direction or requirements for the script..."
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
          />
        </div>

        {scripts.length === 0 && !generateScript.isPending && (
          <Button onClick={handleGenerate} size="lg">
            Generate Scripts
          </Button>
        )}

        {generateScript.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating 6 script variations..." />
            <p className="mt-4 text-sm text-subtle">
              This may take a minute
            </p>
          </div>
        )}

        {scripts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Select Your Preferred Script ({scripts.length} variations)
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scripts.map((script, index) => (
                <div
                  key={script.id}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    selectedScriptId === script.id
                      ? 'border-brand bg-brand-50'
                      : 'border-border bg-white hover:border-border-strong'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">
                      Script {index + 1}
                    </h4>
                    {selectedScriptId === script.id && (
                      <span className="rounded-full bg-brand px-2 py-1 text-xs font-medium text-white">
                        Selected
                      </span>
                    )}
                  </div>

                  {editingScriptId === script.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        rows={8}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(script.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 max-h-48 overflow-y-auto rounded-md bg-surface-muted p-3">
                        <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                          {script.content}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={selectedScriptId === script.id ? 'primary' : 'outline'}
                          onClick={() => handleSelectScript(script.id)}
                          className="flex-1"
                        >
                          {selectedScriptId === script.id ? 'Selected' : 'Select'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditScript(script)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegenerateScript(script.id)}
                          disabled={regeneratingId === script.id}
                        >
                          {regeneratingId === script.id ? '...' : 'Regenerate'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate All
              </Button>
              <Button 
                onClick={onNext}
                disabled={!selectedScriptId}
              >
                Continue to Scenes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
