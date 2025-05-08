import React from 'react';
import { DragDropContext, Droppable, Draggable, DroppableProps } from 'react-beautiful-dnd';

// Re-export the types and components we need
export { DragDropContext, Draggable };
export type { DroppableProvided, DraggableProvided, DropResult } from 'react-beautiful-dnd';

// Create a wrapper for Droppable that handles the warning
export const DroppableWrapper = React.memo((props: DroppableProps) => (
  <Droppable {...props}>
    {(provided, snapshot) => props.children(provided, snapshot)}
  </Droppable>
)); 