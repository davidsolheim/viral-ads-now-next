 'use client';

 import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import { createPortal } from 'react-dom';

 type Position = { x: number; y: number };

 export interface ContextMenuItem {
   id: string;
   label: string;
   disabled?: boolean;
   tone?: 'default' | 'danger';
   onSelect: () => void;
 }

 interface ContextMenuProps {
   items: ContextMenuItem[];
   position: Position | null;
   onClose: () => void;
 }

 function clamp(value: number, min: number, max: number) {
   return Math.min(Math.max(value, min), max);
 }

 export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
   const menuRef = useRef<HTMLDivElement | null>(null);
   const [mounted, setMounted] = useState(false);
   const [adjustedPosition, setAdjustedPosition] = useState<Position | null>(null);

   useEffect(() => {
     setMounted(true);
     return () => setMounted(false);
   }, []);

   useEffect(() => {
     if (!position || !menuRef.current) return;
     const rect = menuRef.current.getBoundingClientRect();
     const padding = 8;
     const x = clamp(position.x, padding, window.innerWidth - rect.width - padding);
     const y = clamp(position.y, padding, window.innerHeight - rect.height - padding);
     setAdjustedPosition({ x, y });
   }, [position, items.length]);

   useEffect(() => {
     if (!position) return;
     const handlePointerDown = (event: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
         onClose();
       }
     };
     const handleKeyDown = (event: KeyboardEvent) => {
       if (event.key === 'Escape') {
         onClose();
       }
     };
     const handleScroll = () => onClose();
     document.addEventListener('mousedown', handlePointerDown);
     document.addEventListener('keydown', handleKeyDown);
     window.addEventListener('scroll', handleScroll, true);
     return () => {
       document.removeEventListener('mousedown', handlePointerDown);
       document.removeEventListener('keydown', handleKeyDown);
       window.removeEventListener('scroll', handleScroll, true);
     };
   }, [position, onClose]);

   const menuItems = useMemo(
     () =>
       items.map((item) => (
         <button
           key={item.id}
           type="button"
           disabled={item.disabled}
           onClick={() => {
             item.onSelect();
             onClose();
           }}
           className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
             item.disabled
               ? 'cursor-not-allowed text-subtle'
               : item.tone === 'danger'
               ? 'text-red-600 hover:bg-red-50'
               : 'text-foreground hover:bg-surface-muted'
           }`}
         >
           <span>{item.label}</span>
         </button>
       )),
     [items, onClose]
   );

   if (!mounted || !position) return null;

   return createPortal(
     <div className="fixed inset-0 z-50">
       <div
         ref={menuRef}
         className="min-w-[180px] rounded-xl border border-border bg-surface p-2 shadow-lg"
         style={{
           position: 'absolute',
           left: adjustedPosition?.x ?? position.x,
           top: adjustedPosition?.y ?? position.y,
         }}
       >
         {menuItems}
       </div>
     </div>,
     document.body
   );
 }

 export function useContextMenu() {
   const [position, setPosition] = useState<Position | null>(null);

   const open = useCallback((event: React.MouseEvent) => {
     event.preventDefault();
     setPosition({ x: event.clientX, y: event.clientY });
   }, []);

   const close = useCallback(() => setPosition(null), []);

   return { position, open, close, isOpen: !!position };
 }
