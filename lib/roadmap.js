/**
 * lib/roadmap.js
 * Pure helpers for roadmap structural mutations.
 */

export function mutateRoadmapStructure(course, action, params) {
  const { levelOrder, conceptOrder, direction, title, description, learningObjectives } = params;
  const levels = course.generatedStructure?.levels ?? [];

  // Step 1: Assign temp objects and attach video chunks for stable mapping during mutation
  levels.forEach(level => {
    level.concepts = level.concepts ?? [];
    level.concepts.forEach(concept => {
      concept._tempVc = course.videoChunks?.find(
        vc => vc.levelOrder === level.order && vc.conceptOrder === concept.order
      );
    });
  });

  // Step 2: Apply mutation
  if (action === 'delete-level') {
    const levelIndex = levels.findIndex(l => l.order === levelOrder);
    if (levelIndex === -1) throw new Error('Level not found.');
    levels.splice(levelIndex, 1);

  } else if (action === 'delete-concept') {
    const level = levels.find(l => l.order === levelOrder);
    if (!level) throw new Error('Level not found.');
    
    const conceptIndex = level.concepts.findIndex(c => c.order === conceptOrder);
    if (conceptIndex === -1) throw new Error('Concept not found.');
    
    if (level.concepts.length === 1) {
      throw new Error('Cannot delete the last concept in a level. Delete the level instead.');
    }
    level.concepts.splice(conceptIndex, 1);

  } else if (action === 'edit-concept') {
    const level = levels.find(l => l.order === levelOrder);
    if (!level) throw new Error('Level not found.');
    const concept = level.concepts.find(c => c.order === conceptOrder);
    if (!concept) throw new Error('Concept not found.');

    if (title && title.trim().length > 0) concept.title = title.trim();
    if (description !== undefined) concept.description = description.trim();
    if (Array.isArray(learningObjectives)) concept.learningObjectives = learningObjectives.map(o => o.trim()).filter(Boolean);

  } else if (action === 'reorder-level') {
    const index = levels.findIndex(l => l.order === levelOrder);
    if (index === -1) throw new Error('Level not found.');
    
    if (direction === 'up' && index > 0) {
      [levels[index - 1], levels[index]] = [levels[index], levels[index - 1]];
    } else if (direction === 'down' && index < levels.length - 1) {
      [levels[index], levels[index + 1]] = [levels[index + 1], levels[index]];
    } else {
      throw new Error('Invalid reorder direction or bounds.');
    }

  } else if (action === 'reorder-concept') {
    const level = levels.find(l => l.order === levelOrder);
    if (!level) throw new Error('Level not found.');
    
    const index = level.concepts.findIndex(c => c.order === conceptOrder);
    if (index === -1) throw new Error('Concept not found.');

    if (direction === 'up' && index > 0) {
      [level.concepts[index - 1], level.concepts[index]] = [level.concepts[index], level.concepts[index - 1]];
    } else if (direction === 'down' && index < level.concepts.length - 1) {
      [level.concepts[index], level.concepts[index + 1]] = [level.concepts[index + 1], level.concepts[index]];
    } else {
      throw new Error('Invalid reorder direction or bounds.');
    }

  } else {
    throw new Error('Unknown action.');
  }

  // Step 3: Renumber and rebuild video chunks
  const newVideoChunks = [];
  let nextLevelOrder = 1;
  levels.forEach(level => {
    level.order = nextLevelOrder++;
    let nextConceptOrder = 1;
    level.concepts.forEach(concept => {
      concept.order = nextConceptOrder++;
      if (concept._tempVc) {
        concept._tempVc.levelOrder = level.order;
        concept._tempVc.conceptOrder = concept.order;
        newVideoChunks.push(concept._tempVc);
      }
      delete concept._tempVc;
    });
  });

  course.generatedStructure.levels = levels;
  course.videoChunks = newVideoChunks;
}
