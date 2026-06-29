import { useState, useEffect, useCallback } from 'react';

/**
 * useSections hook
 * Scans the canvas objects to group them by sectionId, building a structured
 * tree of sections and their associated elements for the SectionPanel.
 */
export function useSections(canvasRef, refreshToken) {
  const [sections, setSections] = useState([]);

  const rescan = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const sectionMap = new Map();

    objects.forEach(obj => {
      const meta = obj.customMeta || {};
      const { sectionId } = meta;

      if (!sectionId) return;

      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          sectionId,
          sectionName: meta.sectionName || sectionId,
          sectionOrder: meta.sectionOrder ?? 999,
          isLocked: !!meta.isSectionLocked, // Rely purely on isSectionLocked
          aiContent: false, // Will become true if ANY element has aiContent
          elements: []
        });
      }

      const section = sectionMap.get(sectionId);
      
      const isOptional = !!meta.isOptional;
      const isSectionLocked = !!meta.isSectionLocked;
      const aiContent = !!meta.aiContent;
      
      // Removed the old logic that dynamically changed section.isLocked based on optional elements
      
      if (aiContent) {
        section.aiContent = true;
      }

      // Add element to section
      // Only include elements that have a friendlyLabel/elementLabel, otherwise they might just be decorative lines
      if (meta.elementLabel || meta.friendlyLabel) {
        section.elements.push({
          obj,
          label: meta.elementLabel || meta.friendlyLabel || 'Element',
          isOptional,
          isSectionLocked,
          visible: obj.visible ?? true
        });
      }
    });

    const sortedSections = Array.from(sectionMap.values()).sort((a, b) => a.sectionOrder - b.sectionOrder);
    setSections(sortedSections);
  }, [canvasRef]);

  useEffect(() => {
    rescan();
  }, [rescan, refreshToken]);

  return { sections, rescan };
}
