'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface CaptionsStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Oswald', 'Raleway', 'Bebas Neue',
  'Anton', 'Pacifico', 'Dancing Script', 'Fira Sans', 'Source Sans Pro',
  'Nunito', 'Quicksand', 'Work Sans', 'Archivo',
];

export function CaptionsStep({ projectId, onNext, readOnly = false }: CaptionsStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    enabled: true,
    fontFamily: 'Inter',
    fontSize: 48,
    fontColor: '#FFFFFF',
    position: 80,
    wordsPerLine: 0,
    style: {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    },
    effects: {
      outlineColor: '#000000',
      outlineWidth: 2,
      shadowColor: '#000000',
      shadowOffset: 4,
      glowColor: '#FFFFFF',
      glowSize: 0,
      highlightColor: '#FFD700',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [captionsRes, imagesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/captions`),
          fetch(`/api/projects/${projectId}/images`),
        ]);

        if (captionsRes.ok) {
          const data = await captionsRes.json();
          if (data.captions) {
            setSettings((prev) => ({ ...prev, ...data.captions }));
          }
        }

        if (imagesRes.ok) {
          const data = await imagesRes.json();
          const firstImage = data.images?.find((img: any) => img.url);
          if (firstImage) setPreviewImage(firstImage.url);
        }
      } catch (error) {
        console.error('Error loading captions data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save captions');
      toast.success('Captions saved!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save captions');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading captions..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Captions</h2>
        <p className="mt-2 text-muted">AI configured caption styling.</p>
        <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
          <div>Enabled: {settings.enabled ? 'Yes' : 'No'}</div>
          <div>Font: {settings.fontFamily}</div>
          <div>Font Size: {settings.fontSize}px</div>
          <div>Font Color: {settings.fontColor}</div>
          <div>Position: {settings.position}%</div>
          <div>Words per line: {settings.wordsPerLine}</div>
        </div>
        {previewImage && (
          <div className="mt-4">
            <Image src={previewImage} alt="Caption preview" width={640} height={360} className="w-full rounded-lg object-cover" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Captions</h2>
      <p className="mt-2 text-gray-600">Style your captions for the final video.</p>

      <div className="mt-6 space-y-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          <span className="text-sm font-medium text-gray-900">Enable captions</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Font</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => setSettings((prev) => ({ ...prev, fontFamily: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Font Size: {settings.fontSize}px</label>
            <input
              type="range"
              min="20"
              max="120"
              value={settings.fontSize}
              onChange={(e) => setSettings((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Font Color</label>
            <input
              type="color"
              value={settings.fontColor}
              onChange={(e) => setSettings((prev) => ({ ...prev, fontColor: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Position: {settings.position}%</label>
            <input
              type="range"
              min="10"
              max="90"
              value={settings.position}
              onChange={(e) => setSettings((prev) => ({ ...prev, position: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Words per line</label>
            <input
              type="number"
              min="0"
              max="10"
              value={settings.wordsPerLine}
              onChange={(e) => setSettings((prev) => ({ ...prev, wordsPerLine: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Text Style</label>
            {['bold', 'italic', 'underline', 'strikethrough'].map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(settings.style as any)[key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      style: { ...prev.style, [key]: e.target.checked },
                    }))
                  }
                />
                {key}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Effects</label>
            <div>
              <label className="text-xs text-gray-600">Outline Width</label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.effects.outlineWidth}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, outlineWidth: Number(e.target.value) },
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Shadow Offset</label>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.effects.shadowOffset}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, shadowOffset: Number(e.target.value) },
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Glow Size</label>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.effects.glowSize}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, glowSize: Number(e.target.value) },
                  }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>

        {previewImage && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Live Preview</p>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
              <Image src={previewImage} alt="Preview" fill sizes="400px" className="object-cover" />
              {settings.enabled && (
                <div
                  className="absolute left-0 right-0 text-center"
                  style={{
                    bottom: `${100 - settings.position}%`,
                    color: settings.fontColor,
                    fontFamily: settings.fontFamily,
                    fontSize: settings.fontSize,
                    fontWeight: settings.style.bold ? 'bold' : 'normal',
                    fontStyle: settings.style.italic ? 'italic' : 'normal',
                    textDecoration: settings.style.underline
                      ? 'underline'
                      : settings.style.strikethrough
                        ? 'line-through'
                        : 'none',
                    textShadow: settings.effects.shadowOffset
                      ? `${settings.effects.shadowOffset}px ${settings.effects.shadowOffset}px 4px ${settings.effects.shadowColor}`
                      : undefined,
                  }}
                >
                  Sample caption text
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave}>Continue to Preview</Button>
        </div>
      </div>
    </div>
  );
}
