/**
 * Keyboard navigation utilities for forms
 */

/**
 * Handles keyboard navigation for the dropdown suggestions
 */
export const handleSuggestionKeyDown = (
  e: React.KeyboardEvent,
  suggestions: string[],
  activeIndex: number,
  setActiveIndex: (index: number) => void,
  handleSelect: (suggestion: string) => void,
  closeDropdown: () => void
) => {
  // Handle arrow up/down to navigate suggestions
  if (e.key === 'ArrowDown') {
    e.preventDefault(); // Prevent scrolling
    setActiveIndex(Math.min(activeIndex + 1, suggestions.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); // Prevent scrolling
    setActiveIndex(Math.max(activeIndex - 1, 0));
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    e.preventDefault(); // Prevent form submission
    handleSelect(suggestions[activeIndex]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeDropdown();
  }
};

/**
 * Handles keyboard navigation for radio buttons and checkboxes
 */
export const handleOptionKeyDown = (
  e: React.KeyboardEvent,
  optionValues: string[],
  currentOptionIndex: number,
  selectOption: (value: string) => void
) => {
  // Spacebar selects/deselects the option (default browser behavior)
  // Arrow keys help with keyboard navigation
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    const nextIndex = (currentOptionIndex + 1) % optionValues.length;
    document.getElementById(optionValues[nextIndex])?.focus();
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const prevIndex = (currentOptionIndex - 1 + optionValues.length) % optionValues.length;
    document.getElementById(optionValues[prevIndex])?.focus();
  }
};

/**
 * Handles keyboard navigation in the frequency matrix
 */
export const handleFrequencyMatrixKeyDown = (
  e: React.KeyboardEvent,
  rowIndex: number,
  colIndex: number,
  totalRows: number,
  totalCols: number,
  getInputId: (row: number, col: number) => string
) => {
  // Calculate next positions
  let nextRow = rowIndex;
  let nextCol = colIndex;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    nextRow = (rowIndex + 1) % totalRows;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    nextRow = (rowIndex - 1 + totalRows) % totalRows;
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextCol = (colIndex + 1) % totalCols;
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    nextCol = (colIndex - 1 + totalCols) % totalCols;
  }

  // Focus the new input element
  if (nextRow !== rowIndex || nextCol !== colIndex) {
    const nextInputId = getInputId(nextRow, nextCol);
    document.getElementById(nextInputId)?.focus();
  }
};

/**
 * Skips to the next section of the form
 * To be used with Tab and Shift+Tab default behavior
 */
export const focusNextSection = (sectionId: string) => {
  const section = document.getElementById(sectionId);
  if (section) {
    section.focus();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}; 